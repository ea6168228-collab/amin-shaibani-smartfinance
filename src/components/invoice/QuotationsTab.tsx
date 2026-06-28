import React, { useState, useMemo } from 'react';
import { isNativeCapacitor, saveAndSharePdf } from '../../utils/capacitorAndroidHelper';
import { 
  FileText, Plus, Search, Filter, Printer, Trash2, 
  CheckCircle, AlertTriangle, Clock, X, ArrowUpRight,
  TrendingUp, Calendar, ArrowRight, ClipboardCheck, ArrowLeft,
  Edit2, FileCheck
} from 'lucide-react';
import { 
  Quotation, QuotationItem, Client, Invoice, InvoiceItem,
  UserRole
} from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface QuotationsTabProps {
  quotations: Quotation[];
  setQuotations: React.Dispatch<React.SetStateAction<Quotation[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  clients: Client[];
  currentUserRole: UserRole;
  appSettings: any;
  loggedInUserName: string;
  setActiveSubTab?: (tab: string) => void; // To jump to invoices on successful conversion
}

export default function QuotationsTab({
  quotations,
  setQuotations,
  invoices,
  setInvoices,
  clients,
  currentUserRole,
  appSettings,
  loggedInUserName,
  setActiveSubTab
}: QuotationsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<Quotation | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form State
  const [newClient, setNewClient] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newExpiryDate, setNewExpiryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // 30 days expiration by default
    return d.toISOString().split('T')[0];
  });
  const [newNotes, setNewNotes] = useState('');
  const [quoteItems, setQuoteItems] = useState<QuotationItem[]>([
    { name: '', quantity: 1, price: 0, total: 0 }
  ]);

  // PDF Generation State
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Add Item inside Form
  const handleAddItem = () => {
    setQuoteItems([...quoteItems, { name: '', quantity: 1, price: 0, total: 0 }]);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    if (quoteItems.length === 1) return;
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  // Update Item value
  const handleUpdateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...quoteItems];
    const item = { ...updated[index] };
    
    if (field === 'quantity') {
      item.quantity = Math.max(1, parseInt(value) || 0);
    } else if (field === 'price') {
      item.price = Math.max(0, parseFloat(value) || 0);
    } else {
      (item as any)[field] = value;
    }
    
    item.total = item.quantity * item.price;
    updated[index] = item;
    setQuoteItems(updated);
  };

  // Quote form total
  const formTotalAmount = useMemo(() => {
    return quoteItems.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [quoteItems]);

  // Handle Quotation creation
  const handleSaveQuotation = (status: 'draft' | 'sent') => {
    if (!newClient) {
      alert('الرجاء تحديد عميل لعرض السعر');
      return;
    }
    const emptyItems = quoteItems.some(item => !item.name.trim());
    if (emptyItems) {
      alert('الرجاء ملء تفاصيل بنود عرض السعر');
      return;
    }

    const nextNumber = quotations.length + 10001;
    const quoteId = `QTN-${nextNumber}`;

    const newQuotation: Quotation = {
      id: quoteId,
      customerId: newClient,
      date: newDate,
      expiryDate: newExpiryDate,
      items: quoteItems,
      totalAmount: formTotalAmount,
      status: status,
      notes: newNotes,
      createdBy: loggedInUserName
    };

    setQuotations(prev => [newQuotation, ...prev]);

    // Reset Form
    setNewClient('');
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewExpiryDate(() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().split('T')[0];
    });
    setNewNotes('');
    setQuoteItems([{ name: '', quantity: 1, price: 0, total: 0 }]);
    setShowCreateModal(false);
  };

  // Convert Quotation to Invoice without loss
  const handleConvertToInvoice = (quote: Quotation) => {
    if (invoices.some(inv => inv.notes?.includes(quote.id))) {
      if (!confirm('تنبيه: تم تحويل هذا السعر بالفعل مسبقاً، هل ترغب في إنتاج فاتورة مكررة بموجبه؟')) {
        return;
      }
    }

    // Prepare Invoice items structured exactly like Quotation items
    const invoiceItems: InvoiceItem[] = quote.items.map(item => ({
      name: item.name,
      description: 'تم النقل بموجب عرض سعر مالي معتمد',
      quantity: item.quantity,
      price: item.price,
      total: item.total
    }));

    const nextInvoiceNumber = invoices.length + 10001;
    const invoiceId = `INV-${nextInvoiceNumber}`;

    const newInvoice: Invoice = {
      id: invoiceId,
      customerId: quote.customerId,
      date: new Date().toISOString().split('T')[0],
      type: 'service',
      items: invoiceItems,
      discount: 0,
      totalAmount: quote.totalAmount,
      paidAmount: 0,
      remainingAmount: quote.totalAmount,
      status: 'draft', // Saves as draft so they can review/edit/approve in invoice screen!
      notes: `فاتورة مصدرة آلياً ومحولة من عرض سعر رقم ${quote.id}.\nملاحظات العرض: ${quote.notes || 'بلا'}`,
      createdBy: loggedInUserName,
      payments: []
    };

    // Update Quotation status to Approved/Accepted
    setQuotations(prev => prev.map(q => {
      if (q.id === quote.id) {
        return { ...q, status: 'approved' };
      }
      return q;
    }));

    // Register Invoice
    setInvoices(prev => [newInvoice, ...prev]);

    alert(`تم تحويل عرض السعر ${quote.id} إلى الفاتورة ${invoiceId} بنجاح كـ [مسودة مجهزة للتعديل أو الدفع والاعتماد].`);
    if (setActiveSubTab) {
      setActiveSubTab('invoices');
    }
  };

  // Delete/Cancel Quotation
  const handleDeleteQuotation = (id: string) => {
    if (confirm(`هل ترغب بتبديل حالة عرض السعر ${id} إلى ملغي/مرفوض؟`)) {
      setQuotations(p => p.map(q => q.id === id ? { ...q, status: 'rejected' } : q));
    }
  };

  // Print Quotation PDF using html2canvas & jsPDF
  const handlePrintPDF = async (quote: Quotation) => {
    setPdfGenerating(true);
    const element = document.getElementById(`printable-quote-card-${quote.id}`);
    if (!element) {
      alert('لم يتم العثور على قالب العرض الطباعي');
      setPdfGenerating(false);
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const fileName = `عرض_أسعار_أمين_${quote.id}.pdf`;
      if (isNativeCapacitor()) {
        const dataUri = pdf.output('datauristring');
        await saveAndSharePdf(dataUri, fileName);
      } else {
        pdf.save(fileName);
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في تحويل وطباعة عرض الأسعار');
    } finally {
      setPdfGenerating(false);
    }
  };

  // Filter computations
  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const client = clients.find(c => c.id === q.customerId);
      const clientName = client ? client.name : '';
      const matchesSearch = (q.id || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (clientName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, searchQuery, statusFilter, clients]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="البحث برقم عرض السعر أو اسم العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
            />
            <Search className="absolute right-3.5 top-3 text-slate-400" size={16} />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
            >
              <option value="all">كل حالات عروض الأسعار</option>
              <option value="draft">مسودة</option>
              <option value="sent">تم الإرسال للعميل</option>
              <option value="approved">مقبول ومعتمد</option>
              <option value="rejected">مرفوض / ملغى</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-sm w-full md:w-auto transition shadow-md shadow-indigo-600/10"
        >
          <Plus size={18} />
          إصدار عرض سعر جديد
        </button>
      </div>

      {/* List Table */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-150 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">عروض الأسعار المالية المسجلة</h3>
          <span className="text-xs text-slate-400">عدد عروض الأسعار: {filteredQuotations.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-zinc-950/20 border-b border-slate-150 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 text-xs font-bold font-sans">
                <th className="p-4">رقم العرض</th>
                <th className="p-4">العميل المرتبط</th>
                <th className="p-4">تاريخ العرض</th>
                <th className="p-4">تاريخ الانتهاء</th>
                <th className="p-4 font-mono">القيمة الإجمالية</th>
                <th className="p-4 text-center">حالة العرض</th>
                <th className="p-4 text-center">الخيارات والتحويل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-zinc-850 text-sm text-slate-700 dark:text-zinc-300">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    لا توجد عروض أسعار مسجلة حالياً تطابق الشروط.
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => {
                  const client = clients.find(c => c.id === q.customerId);
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white font-mono">{q.id}</td>
                      <td className="p-4 font-medium text-slate-800 dark:text-zinc-200">{client ? client.name : 'مجهول'}</td>
                      <td className="p-4 text-xs font-mono">{q.date}</td>
                      <td className="p-4 text-xs font-mono text-rose-500">{q.expiryDate}</td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        {q.totalAmount.toLocaleString()} {appSettings.institution.currency}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold gap-1 ${
                          q.status === 'approved' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                          q.status === 'sent' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400' :
                          q.status === 'draft' ? 'bg-slate-50 text-slate-700 dark:bg-slate-900/60 dark:text-slate-400' :
                          'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}>
                          {q.status === 'draft' && 'مسودة'}
                          {q.status === 'sent' && 'مرسل'}
                          {q.status === 'approved' && 'مقبول ومعتمد'}
                          {q.status === 'rejected' && 'مرفوض/ملغى'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setShowDetailModal(q)}
                            className="bg-slate-50 border border-slate-250 hover:bg-slate-100 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-350 px-2.5 py-1 rounded-lg text-xs font-medium transition"
                          >
                            معاينة
                          </button>

                          {q.status !== 'rejected' && (
                            <button
                              onClick={() => handleConvertToInvoice(q)}
                              className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                            >
                              <FileCheck size={13} /> تحويل لفاتورة
                            </button>
                          )}

                          {q.status !== 'rejected' && (
                            <button
                              onClick={() => handleDeleteQuotation(q.id)}
                              className="p-1 hover:text-rose-600 rounded transition"
                              title="رفض أو إلغاء العرض"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-150 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950/40">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" />
                تحرير عرض سعر تجاري وخدمي جديد
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>

            {/* Form Scroll Area */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-zinc-950/10 p-5 rounded-2xl border border-slate-150 dark:border-zinc-800">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">العميل المستهدف</label>
                  <select
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                  >
                    <option value="">-- اختر من العملاء --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">تاريخ العرض</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">صلاحية العرض لغاية</label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-white"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">البنود والخدمات المسعرة</h4>
                  <button
                    onClick={handleAddItem}
                    type="button"
                    className="text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
                  >
                    <Plus size={14} /> إضافة بند تسعيري
                  </button>
                </div>

                <div className="border border-slate-150 dark:border-zinc-850 rounded-2xl overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-800/50 text-right text-slate-500 dark:text-zinc-400 text-xs font-bold border-b border-slate-150 dark:border-zinc-800">
                        <th className="p-3">اسم الخدمة / البند المسعر</th>
                        <th className="p-3 w-20 text-center">الكمية</th>
                        <th className="p-3 w-32 font-mono text-center">سعر الوحدة المقدر</th>
                        <th className="p-3 w-32 font-mono text-center">الإجمالي</th>
                        <th className="p-3 w-12 text-center">إلغاء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-zinc-850 text-xs">
                      {quoteItems.map((item, index) => (
                        <tr key={index} className="bg-white dark:bg-zinc-900">
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.name}
                              placeholder="اسم البند الخدمي أو المنتج..."
                              onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50/60 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                              className="w-full text-center px-2 py-1.5 bg-slate-50/60 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg font-mono text-slate-800 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.price || ''}
                              placeholder="0"
                              onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
                              className="w-full text-center font-mono px-2 py-1.5 bg-slate-50/60 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-white"
                            />
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {(item.total || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-rose-600 p-1"
                            >
                              <X size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom calculations/remarks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-150">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">شروط عروض الأسعار الإضافية</label>
                  <textarea
                    rows={3}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="مثال: الأسعار شاملة الضريبة التركيب والتشغيل / صالحة لـ 30 يوماً من تاريخ التصدير..."
                    className="w-full p-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex flex-col justify-center items-end space-y-2">
                  <span className="text-xs text-slate-400 font-bold">إجمالي قيمة عرض السعر المقدرة:</span>
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {formTotalAmount.toLocaleString()} {appSettings.institution.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-150 dark:border-zinc-800 flex justify-end gap-2 bg-slate-50 dark:bg-zinc-950/40">
              <button
                type="button"
                onClick={() => handleSaveQuotation('draft')}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                حفظ كمسودة
              </button>
              <button
                type="button"
                onClick={() => handleSaveQuotation('sent')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black transition shadow-md"
              >
                توليد وإرسال للعميل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS VIEW WITH PRINT CARD */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Heading Actions */}
            <div className="p-5 border-b border-slate-150 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950/40">
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 text-sm">
                <FileText size={18} /> عرض تفاصيل وثيقة عروض السعر {showDetailModal.id}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrintPDF(showDetailModal)}
                  disabled={pdfGenerating}
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-indigo-600 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Printer size={15} />
                  {pdfGenerating ? 'جاري التحضير...' : 'تصدير PDF'}
                </button>
                <button onClick={() => setShowDetailModal(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full text-slate-400">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable canvas area */}
            <div className="p-8 max-h-[75vh] overflow-y-auto" id={`printable-quote-card-${showDetailModal.id}`}>
              <div className="border border-slate-200 p-6 rounded-2xl bg-white text-slate-900 relative">
                {/* Upper corners */}
                <div className="absolute left-6 top-6 flex flex-col items-end gap-1">
                  <span className="text-xl font-black text-indigo-600 tracking-wider font-mono bg-indigo-5/60 px-3 py-1 rounded-xl">{showDetailModal.id}</span>
                  <span className="text-xs text-slate-400">التاريخ: {showDetailModal.date}</span>
                  <span className="text-xs text-rose-500 font-bold">صالحة لغاية: {showDetailModal.expiryDate}</span>
                </div>

                <div className="mb-8">
                  <h2 className="text-lg font-black text-slate-900 mb-1">{appSettings.institution.name}</h2>
                  <p className="text-xs text-slate-500">{appSettings.institution.address}</p>
                  <p className="text-xs text-slate-500">الجوال: {appSettings.institution.phone}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">وثيقة عرض أسعار خدمة وتوريد رسمية غير ملزمة مالياً إلا بعد التعميد والتعميم</p>
                </div>

                <hr className="border-slate-150 my-6" />

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <h4 className="text-xs text-slate-400 font-bold mb-1">عرض أسعار مقدم للعميل المحترم:</h4>
                    {(() => {
                      const client = clients.find(c => c.id === showDetailModal.customerId);
                      return client ? (
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-800 text-sm">{client.name}</p>
                          <p className="text-xs text-slate-500">جوال: {client.phone}</p>
                        </div>
                      ) : (
                        <p className="font-bold text-rose-500">عميل غير معروف</p>
                      );
                    })()}
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs text-slate-400 font-bold mb-1">المحرر المسؤول:</h4>
                    <p className="font-bold text-slate-705 text-sm">{showDetailModal.createdBy}</p>
                    <p className="text-xs text-slate-400">نظام التشغيل: أمين الشيباني لضبط الحسابات</p>
                  </div>
                </div>

                {/* Items detailed */}
                <table className="w-full text-right border-collapse text-xs mb-6">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                      <th className="p-3">اسم الخدمة والتجهيز</th>
                      <th className="p-3 text-center">الكمية المطلوبة</th>
                      <th className="p-3 text-center font-mono">السعر المقدر للوحدة</th>
                      <th className="p-3 text-left font-mono">الإجمالي المقدر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {showDetailModal.items.map((item, i) => (
                      <tr key={i}>
                        <td className="p-3 font-bold">{item.name}</td>
                        <td className="p-3 text-center font-mono">{item.quantity}</td>
                        <td className="p-3 text-center font-mono">{item.price.toLocaleString()}</td>
                        <td className="p-3 text-left font-mono font-bold">{(item.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Total */}
                <div className="flex flex-col items-end gap-1 text-xs text-slate-650 bg-slate-50 p-4 rounded-xl mb-6">
                  <div className="flex justify-between w-64 font-black text-indigo-600 text-sm">
                    <span>إجمالي قيمة العرض التقديرية:</span>
                    <span className="font-mono">{showDetailModal.totalAmount.toLocaleString()} {appSettings.institution.currency}</span>
                  </div>
                </div>

                {/* Remarks */}
                {showDetailModal.notes && (
                  <div className="mt-6 border-r-2 border-indigo-400 pr-3 text-[11px] text-slate-500">
                    <p className="font-bold text-slate-700 mb-1">شروط عروض أسعار إضافية:</p>
                    <p className="leading-relaxed">{showDetailModal.notes}</p>
                  </div>
                )}

                {/* Footer signatures */}
                <div className="grid grid-cols-2 gap-4 mt-12 text-[10px] text-slate-400 pt-4 border-t border-dashed border-slate-150">
                  <div>توقيع وتعميد العميل بالقبول: ...........................................</div>
                  <div className="text-left">توقيع وختم محرر القسم التجاري: ...........................................</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
