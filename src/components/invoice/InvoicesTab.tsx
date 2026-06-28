import React, { useState, useMemo } from 'react';
import { isNativeCapacitor, saveAndSharePdf } from '../../utils/capacitorAndroidHelper';
import { 
  FileText, Plus, Search, Filter, Printer, Trash2, 
  CheckCircle, AlertTriangle, Clock, X, Circle,
  ChevronDown, FileSpreadsheet, User, Calendar, DollarSign,
  TrendingUp, ArrowDownRight, Edit2, ShieldAlert
} from 'lucide-react';
import { 
  Invoice, InvoiceItem, InvoicePayment, Client, 
  PaymentVoucher, TreasuryState, ClientDebt, ClientCollection,
  UserRole
} from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoicesTabProps {
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  clients: Client[];
  setClients?: React.Dispatch<React.SetStateAction<Client[]>>; // For adding a quick client if needed
  vouchers: PaymentVoucher[];
  setVouchers: React.Dispatch<React.SetStateAction<PaymentVoucher[]>>;
  treasuryState: TreasuryState;
  setTreasuryState: React.Dispatch<React.SetStateAction<TreasuryState>>;
  debts: ClientDebt[];
  setDebts: React.Dispatch<React.SetStateAction<ClientDebt[]>>;
  collections: ClientCollection[];
  setCollections: React.Dispatch<React.SetStateAction<ClientCollection[]>>;
  currentUserRole: UserRole;
  appSettings: any;
  loggedInUserName: string;
}

export default function InvoicesTab({
  invoices,
  setInvoices,
  clients,
  vouchers,
  setVouchers,
  treasuryState,
  setTreasuryState,
  debts,
  setDebts,
  collections,
  setCollections,
  currentUserRole,
  appSettings,
  loggedInUserName
}: InvoicesTabProps) {
  // Modal controllers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<Invoice | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Form State
  const [newInvoiceClient, setNewInvoiceClient] = useState('');
  const [newInvoiceDate, setNewInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newInvoiceType, setNewInvoiceType] = useState<'service' | 'sale' | 'general'>('service');
  const [newInvoiceDiscount, setNewInvoiceDiscount] = useState<number>(0);
  const [newInvoiceNotes, setNewInvoiceNotes] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { name: '', description: '', quantity: 1, price: 0, total: 0 }
  ]);

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'bank_transfer' | 'other'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [linkToTreasury, setLinkToTreasury] = useState(true);

  // PDF Generation State
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Add Item inside Form
  const handleAddItem = () => {
    setInvoiceItems([...invoiceItems, { name: '', description: '', quantity: 1, price: 0, total: 0 }]);
  };

  // Remove Item inside Form
  const handleRemoveItem = (index: number) => {
    if (invoiceItems.length === 1) return;
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  // Update Item field
  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...invoiceItems];
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
    setInvoiceItems(updated);
  };

  // Calculate sum totals of new invoice form
  const formSubtotal = useMemo(() => {
    return invoiceItems.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [invoiceItems]);

  const formGrandTotal = useMemo(() => {
    return Math.max(0, formSubtotal - newInvoiceDiscount);
  }, [formSubtotal, newInvoiceDiscount]);

  // Handle invoice creation
  const handleSaveInvoice = (status: 'draft' | 'approved') => {
    if (!newInvoiceClient) {
      alert('يجب اختيار العميل أولاً');
      return;
    }
    const emptyItems = invoiceItems.some(item => !item.name.trim());
    if (emptyItems) {
      alert('يجب ملء اسم البنود أو الخدمات');
      return;
    }

    const nextNumber = invoices.length + 10001;
    const invoiceId = `INV-${nextNumber}`;

    const newInvoice: Invoice = {
      id: invoiceId,
      customerId: newInvoiceClient,
      date: newInvoiceDate,
      type: newInvoiceType,
      items: invoiceItems,
      discount: newInvoiceDiscount,
      totalAmount: formGrandTotal,
      paidAmount: 0,
      remainingAmount: formGrandTotal,
      status: status,
      notes: newInvoiceNotes,
      createdBy: loggedInUserName,
      payments: []
    };

    const client = clients.find(c => c.id === newInvoiceClient);

    // If approved and has positive due amount, register customer debt
    if (status === 'approved' && formGrandTotal > 0) {
      const newDebt: ClientDebt = {
        id: `DEBT-${Date.now()}`,
        customerId: newInvoiceClient,
        serviceId: invoiceId, // Linked to this invoice!
        dueDate: newInvoiceDate,
        amount: formGrandTotal,
        paid: 0,
        remaining: formGrandTotal,
        status: 'open',
        notes: `دين مستحق لفاتورة رقم ${invoiceId}`
      };
      setDebts(prev => [newDebt, ...prev]);
    }

    setInvoices(prev => [newInvoice, ...prev]);
    
    // Reset Form
    setNewInvoiceClient('');
    setNewInvoiceDate(new Date().toISOString().split('T')[0]);
    setNewInvoiceType('service');
    setNewInvoiceDiscount(0);
    setNewInvoiceNotes('');
    setInvoiceItems([{ name: '', description: '', quantity: 1, price: 0, total: 0 }]);
    setShowCreateModal(false);
  };

  // Handle Registration of a Payment
  const handleRegisterPayment = (invoice: Invoice) => {
    const amt = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amt) || amt <= 0) {
      alert('الرجاء إدخال مبلغ دفعة صحيح');
      return;
    }
    if (amt > invoice.remainingAmount) {
      alert(`المبلغ المدفوع أكبر من المتبقي على الفاتورة (${invoice.remainingAmount})`);
      return;
    }

    const paymentId = `PAY-${Date.now()}`;
    const voucherSuffix = vouchers.length + 10001;
    const voucherId = `VCHR-${voucherSuffix}`;
    const dateStr = new Date().toISOString().split('T')[0];

    // Create payment structure
    const newPayment: InvoicePayment = {
      id: paymentId,
      date: dateStr,
      amount: amt,
      paymentMethod: paymentMethod,
      isLinkedToTreasury: linkToTreasury,
      voucherId: linkToTreasury ? voucherId : undefined,
      notes: paymentNotes || `دفعة من قيمة الفاتورة ${invoice.id}`
    };

    const client = clients.find(c => c.id === invoice.customerId);
    const clientName = client ? client.name : 'عميل غير معروف';

    // 1. Update Invoice status
    const prevPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const nextPaid = prevPaid + amt;
    const nextRemaining = invoice.totalAmount - nextPaid;
    let nextStatus: 'paid' | 'partial' | 'unpaid' = 'partial';
    if (nextRemaining <= 0) {
      nextStatus = 'paid';
    } else if (nextPaid === 0) {
      nextStatus = 'unpaid';
    }

    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoice.id) {
        return {
          ...inv,
          payments: [...inv.payments, newPayment],
          paidAmount: nextPaid,
          remainingAmount: nextRemaining,
          status: nextStatus
        };
      }
      return inv;
    }));

    // 2. Generate Client Collection/Debt update
    const linkedDebt = debts.find(d => d.serviceId === invoice.id && d.status !== 'paid');
    if (linkedDebt) {
      setDebts(prev => prev.map(d => {
        if (d.id === linkedDebt.id) {
          const updatedPaid = d.paid + amt;
          const updatedRem = d.amount - updatedPaid;
          return {
            ...d,
            paid: updatedPaid,
            remaining: updatedRem,
            status: updatedRem <= 0 ? 'paid' : 'open'
          };
        }
        return d;
      }));
    }

    // Append to Client Collections log
    const newCollection: ClientCollection = {
      id: `COLL-${Date.now()}`,
      customerId: invoice.customerId,
      debtId: linkedDebt?.id,
      date: dateStr,
      amountCollected: amt,
      paymentMethod: paymentMethod,
      isLinkedToTreasury: linkToTreasury,
      voucherId: linkToTreasury ? voucherId : undefined,
      notes: paymentNotes || `سداد من قيمة الفاتورة المعتمدة رقم ${invoice.id}`
    };
    setCollections(prev => [newCollection, ...prev]);

    // 3. Link with Treasury & Appending vouchers if opted
    if (linkToTreasury) {
      // Add standard receipt voucher
      const newVoucher: PaymentVoucher = {
        id: voucherId,
        date: dateStr,
        type: 'receipt',
        beneficiaryOrPayer: clientName,
        relatedEntityType: 'external',
        relatedEntityId: invoice.customerId,
        amount: amt,
        statement: `قبض قيمة دفعة فاتورة مبيعات/خدمات رقم ${invoice.id}`,
        paymentMethod: paymentMethod,
        user: loggedInUserName,
        status: 'approved',
        notes: paymentNotes
      };
      setVouchers(prev => [newVoucher, ...prev]);

      // Add actual treasury activity
      setTreasuryState(prev => {
        const nextBalance = prev.currentBalance + amt;
        const newAct = {
          id: `ACT-${Date.now()}`,
          date: dateStr,
          type: 'deposit' as const,
          statement: `متحصلات فاتورة ومبيعات رقم ${invoice.id} - العميل: ${clientName}`,
          amount: amt,
          direction: 'in' as const,
          relatedEntityId: invoice.customerId,
          relatedEntityType: 'external' as const,
          user: loggedInUserName,
          notes: paymentNotes
        };
        return {
          ...prev,
          currentBalance: nextBalance,
          activities: [newAct, ...prev.activities]
        };
      });
    }

    // Reset payment modal state
    setPaymentAmount('');
    setPaymentNotes('');
    setShowPaymentModal(null);
  };

  // Handle invoice voiding/cancelling
  const handleCancelInvoice = (invoice: Invoice) => {
    if (confirm(`هل أنت متأكد من إلغاء الفاتورة ${invoice.id}؟ لا يحذف النظام الفاتورة بل يميزها بصفة [ملغية] ويحيد أثرها المالي.`)) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === invoice.id) {
          return { ...inv, status: 'cancelled' };
        }
        return inv;
      }));

      // Cancel associated debt
      setDebts(prev => prev.map(d => {
        if (d.serviceId === invoice.id) {
          return { ...d, status: 'paid', notes: `ملغى تزامناً مع إلغاء الفاتورة ${invoice.id}` };
        }
        return d;
      }));

      // Add a note in collection, if any, or general alert
      alert(`تم تحويل الفاتورة ${invoice.id} إلى حالة ملغية وتحييد ديونها بنجاح.`);
    }
  };

  // Print Invoice to PDF using html2canvas & jsPDF
  const handlePrintPDF = async (invoice: Invoice) => {
    setPdfGenerating(true);
    const element = document.getElementById(`printable-invoice-card-${invoice.id}`);
    if (!element) {
      alert('عذراً، لم يتم العثور على البنية الرسومية للطباعة');
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
      
      const fileName = `فاتورة_أمين_${invoice.id}.pdf`;
      if (isNativeCapacitor()) {
        const dataUri = pdf.output('datauristring');
        await saveAndSharePdf(dataUri, fileName);
      } else {
        pdf.save(fileName);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تصدير الفاتورة لملف PDF');
    } finally {
      setPdfGenerating(false);
    }
  };

  // Filter calculations
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const client = clients.find(c => c.id === inv.customerId);
      const clientName = client ? client.name : '';
      const matchesSearch = (inv.id || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (clientName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      const matchesType = typeFilter === 'all' || inv.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [invoices, searchQuery, statusFilter, typeFilter, clients]);

  // Summary widgets
  const stats = useMemo(() => {
    const total = invoices.length;
    const collected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const pending = invoices.reduce((sum, inv) => inv.status !== 'cancelled' ? sum + inv.remainingAmount : sum, 0);
    const cancelledCount = invoices.filter(inv => inv.status === 'cancelled').length;
    return { total, collected, pending, cancelled: cancelledCount };
  }, [invoices]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Search & Actions Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="البحث برقم الفاتورة أو العميل..."
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
              <option value="all">كل حالات الفواتير</option>
              <option value="draft">مسودة</option>
              <option value="approved">معتمدة ومفتوحة</option>
              <option value="paid">مدفوعة بالكامل</option>
              <option value="partial">مدفوعة جزئياً</option>
              <option value="cancelled">ملغية وتحت التدقيق</option>
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
            >
              <option value="all">كل أنواع الفواتير</option>
              <option value="service">فاتورة خدمات</option>
              <option value="sale">فاتورة مبيعات</option>
              <option value="general">فاتورة عامة</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-sm w-full md:w-auto transition shadow-md shadow-indigo-600/10"
        >
          <Plus size={18} />
          إنشاء فاتورة جديدة
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-zinc-500 block">إجمالي الفواتير الصادرة</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{stats.total} <span className="text-xs font-normal">فاتورة</span></span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-zinc-500 block">إجمالي التحصيل الفعلي</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.collected.toLocaleString()} <span className="text-xs font-normal">{appSettings.institution.currency}</span></span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-zinc-500 block">إجمالي الذمم/الديون المستحقة</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.pending.toLocaleString()} <span className="text-xs font-normal">{appSettings.institution.currency}</span></span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
            <ShieldAlert size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-zinc-500 block">الفواتير الملغية / المقيدة</span>
            <span className="text-2xl font-black text-rose-500">{stats.cancelled} <span className="text-xs font-normal">ملغي</span></span>
          </div>
        </div>
      </div>

      {/* Large Table Container */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-150 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
            <FileSpreadsheet size={16} /> قائمة الفواتير المسجلة بالنظام
          </h3>
          <span className="text-xs text-slate-400 dark:text-zinc-500">تم العثور على {filteredInvoices.length} فاتورة</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-zinc-950/20 border-b border-slate-150 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 text-xs font-bold font-sans">
                <th className="p-4">رقم الفاتورة</th>
                <th className="p-4">العميل</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">النوع</th>
                <th className="p-4 font-mono">الإجمالي النهائي</th>
                <th className="p-4 font-mono">المدفوع</th>
                <th className="p-4 font-mono">المتبقي</th>
                <th className="p-4 text-center">حالة الفاتورة</th>
                <th className="p-4 text-center">الإجراءات والعمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-zinc-850 text-sm text-slate-700 dark:text-zinc-300">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 dark:text-zinc-500">
                    لا توجد فواتير مطابقة للبحث أو الفلترة المحددة حالياً.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const client = clients.find(c => c.id === inv.customerId);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white font-mono">{inv.id}</td>
                      <td className="p-4 font-medium text-slate-800 dark:text-zinc-200">
                        {client ? client.name : <span className="text-rose-500">عميل غير معروف</span>}
                      </td>
                      <td className="p-4 text-xs font-mono">{inv.date}</td>
                      <td className="p-4 text-xs">
                        {inv.type === 'service' && 'فاتورة خدمات'}
                        {inv.type === 'sale' && 'فاتورة مبيعات'}
                        {inv.type === 'general' && 'عامة'}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                        {inv.totalAmount.toLocaleString()} {appSettings.institution.currency}
                      </td>
                      <td className="p-4 font-mono text-emerald-600 dark:text-emerald-400">
                        {inv.paidAmount.toLocaleString()} {appSettings.institution.currency}
                      </td>
                      <td className="p-4 font-mono text-amber-600 dark:text-amber-400 font-bold">
                        {inv.remainingAmount.toLocaleString()} {appSettings.institution.currency}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold gap-1 ${
                          inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' :
                          inv.status === 'partial' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' :
                          inv.status === 'approved' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                          inv.status === 'draft' ? 'bg-slate-50 text-slate-700 dark:bg-slate-900/60 dark:text-slate-400' :
                          'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}>
                          <Circle size={8} fill="currentColor" />
                          {inv.status === 'draft' && 'مسودة'}
                          {inv.status === 'approved' && 'معتمدة'}
                          {inv.status === 'partial' && 'مدفوعة جزئياً'}
                          {inv.status === 'paid' && 'سددت كاملة'}
                          {inv.status === 'cancelled' && 'ملغاة'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setShowDetailModal(inv)}
                            className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-medium transition"
                          >
                            عرض التفاصيل
                          </button>

                          {inv.status !== 'draft' && inv.status !== 'cancelled' && inv.remainingAmount > 0 && (
                            <button
                              onClick={() => {
                                setPaymentAmount(inv.remainingAmount.toString());
                                setShowPaymentModal(inv);
                              }}
                              className="p-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold transition"
                            >
                              تسجيل دفعة
                            </button>
                          )}

                          {inv.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelInvoice(inv)}
                              className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                              title="إلغاء الفاتورة مالياً"
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

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-150 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950/40">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText size={20} className="text-indigo-600 dark:text-indigo-400" />
                تحرير وإصدار فاتورة جديدة
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            {/* Modal Scroll Shell */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Client & Metadata Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-zinc-950/10 p-5 rounded-2xl border border-slate-150 dark:border-zinc-800">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mb-1.5">العميل المرتبط</label>
                  <select
                    value={newInvoiceClient}
                    onChange={(e) => setNewInvoiceClient(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                  >
                    <option value="">-- اختر من العملاء بمساحة العمل --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mb-1.5">تاريخ الفاتورة</label>
                  <input
                    type="date"
                    value={newInvoiceDate}
                    onChange={(e) => setNewInvoiceDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mb-1.5">نوع الفاتورة</label>
                  <select
                    value={newInvoiceType}
                    onChange={(e) => setNewInvoiceType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                  >
                    <option value="service">فاتورة خدمة / أتعاب</option>
                    <option value="sale">فاتورة بيع تجاري</option>
                    <option value="general">فاتورة عامة</option>
                  </select>
                </div>
              </div>

              {/* Items Table Form */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 dark:text-white text-sm">تفاصيل بنود وخدمات الفاتورة</h4>
                  <button
                    onClick={handleAddItem}
                    type="button"
                    className="text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
                  >
                    <Plus size={14} /> إضافة بند جديد
                  </button>
                </div>

                <div className="border border-slate-150 dark:border-zinc-850 rounded-2xl overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-800/50 text-right text-slate-500 dark:text-zinc-400 text-xs font-bold select-none border-b border-slate-150 dark:border-zinc-800">
                        <th className="p-3 w-1/3">اسم الخدمة / البند</th>
                        <th className="p-3 w-1/4">الوصف الاختياري</th>
                        <th className="p-3 w-16 text-center">الكمية</th>
                        <th className="p-3 w-28 font-mono text-center">السعر</th>
                        <th className="p-3 w-28 font-mono text-center">الإجمالي</th>
                        <th className="p-3 w-12 text-center">إلغاء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 dark:divide-zinc-850 text-sm">
                      {invoiceItems.map((item, index) => (
                        <tr key={index} className="bg-white dark:bg-zinc-900">
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.name}
                              placeholder="اسم الخدمة أو البند..."
                              onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50/60 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.description || ''}
                              placeholder="اختياري..."
                              onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50/60 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                              className="w-full text-center px-2 py-1.5 text-xs bg-slate-50/60 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg font-mono text-slate-800 dark:text-white"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={item.price || ''}
                              placeholder="0"
                              onChange={(e) => handleUpdateItem(index, 'price', e.target.value)}
                              className="w-full text-center font-mono px-2 py-1.5 text-xs bg-slate-50/60 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-slate-800 dark:text-white"
                            />
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {(item.total || 0).toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-rose-600 hover:text-rose-700 p-1 rounded-md"
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

              {/* Bottom Calculations section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-zinc-950/30 p-5 rounded-2xl border border-slate-150 dark:border-zinc-800">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mb-1.5">ملاحظات الفاتورة العامة</label>
                  <textarea
                    rows={4}
                    value={newInvoiceNotes}
                    onChange={(e) => setNewInvoiceNotes(e.target.value)}
                    placeholder="شروط الدفع أو أي تفاصيل أو حواشي إضافية..."
                    className="w-full p-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-zinc-400 font-bold">المجموع الفرعي:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formSubtotal.toLocaleString()} {appSettings.institution.currency}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-zinc-400 font-bold">خصومات الفاتورة:</span>
                    <div className="flex items-center gap-1.5 w-32">
                      <input
                        type="number"
                        min="0"
                        value={newInvoiceDiscount || ''}
                        placeholder="0"
                        onChange={(e) => setNewInvoiceDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full text-center p-1.5 text-xs bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg font-mono text-slate-800 dark:text-white"
                      />
                      <span className="text-xs text-slate-400">{appSettings.institution.currency}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center font-extrabold text-base">
                    <span className="text-indigo-600 dark:text-indigo-400">الإجمالي النهائي المستحق:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{formGrandTotal.toLocaleString()} {appSettings.institution.currency}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-150 dark:border-zinc-800 flex justify-end gap-3 bg-slate-50 dark:bg-zinc-950/40">
              <button
                type="button"
                onClick={() => handleSaveInvoice('draft')}
                className="bg-slate-200/80 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                حفظ كمسودة مؤقتة
              </button>
              <button
                type="button"
                onClick={() => handleSaveInvoice('approved')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-md shadow-indigo-600/15 transition animate-pulse"
              >
                تأكيد الفاتورة والاعتماد المالي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED VIEW MODAL & PRINTING CARD */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Action Bar Header */}
            <div className="p-5 border-b border-slate-150 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950/40">
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 text-sm">
                <FileText size={18} /> تفاصيل الفاتورة {showDetailModal.id}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrintPDF(showDetailModal)}
                  disabled={pdfGenerating}
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-indigo-600 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-indigo-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Printer size={15} />
                  {pdfGenerating ? 'جاري تصدير PDF...' : 'تحصيل PDF وطباعة'}
                </button>
                <button onClick={() => setShowDetailModal(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Area - Rendered nicely for sharp pdf captures */}
            <div className="p-8 max-h-[75vh] overflow-y-auto" id={`printable-invoice-card-${showDetailModal.id}`}>
              <div className="border border-slate-200 p-6 rounded-2xl bg-white text-slate-900 relative">
                {/* Ribbon details */}
                <div className="absolute left-6 top-6 flex flex-col items-end gap-1.5">
                  <span className="text-xl font-black text-indigo-600 tracking-wider font-mono bg-indigo-50 px-3 py-1 rounded-xl">{showDetailModal.id}</span>
                  <span className="text-xs text-slate-400">تاريخ الإصدار: {showDetailModal.date}</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold gap-1 mt-1 ${
                    showDetailModal.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                    showDetailModal.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                    showDetailModal.status === 'approved' ? 'bg-amber-100 text-amber-800' :
                    showDetailModal.status === 'draft' ? 'bg-slate-100 text-slate-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {showDetailModal.status === 'draft' && 'مسودة'}
                    {showDetailModal.status === 'approved' && 'معتمدة'}
                    {showDetailModal.status === 'partial' && 'مدفوعة جزئياً'}
                    {showDetailModal.status === 'paid' && 'مسددة بالكامل'}
                    {showDetailModal.status === 'cancelled' && 'ملغاة ومقيدة'}
                  </span>
                </div>

                {/* Company details */}
                <div className="mb-8">
                  <h2 className="text-lg font-black text-slate-900 mb-1">{appSettings.institution.name}</h2>
                  <p className="text-xs text-slate-500">{appSettings.institution.address}</p>
                  <p className="text-xs text-slate-500">الجوال: {appSettings.institution.phone}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">نظام أمين الشيباني لضبط العمليات التجارية ©</p>
                </div>

                <hr className="border-slate-150 my-6" />

                {/* Bill to details */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <h4 className="text-xs text-slate-400 font-bold mb-1">صادرة إلى العميل:</h4>
                    {(() => {
                      const client = clients.find(c => c.id === showDetailModal.customerId);
                      return client ? (
                        <div className="space-y-1">
                          <p className="font-extrabold text-slate-800 text-sm">{client.name}</p>
                          <p className="text-xs text-slate-500">جوال: {client.phone}</p>
                          <p className="text-xs text-slate-500">العنوان: {client.address || 'غير محدد'}</p>
                        </div>
                      ) : (
                        <p className="font-bold text-rose-500">عميل غير معروف</p>
                      );
                    })()}
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs text-slate-400 font-bold mb-1">المسؤول عن النظام:</h4>
                    <p className="font-bold text-slate-700 text-sm">{showDetailModal.createdBy}</p>
                    <p className="text-xs text-slate-400">طريقة الترخيص: Offline Secure Local Database</p>
                  </div>
                </div>

                {/* Ledger Items */}
                <table className="w-full text-right border-collapse text-xs mb-6">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                      <th className="p-3">اسم الخدمة أو البند</th>
                      <th className="p-3">الوصف</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-center font-mono">السعر</th>
                      <th className="p-3 text-left font-mono">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {showDetailModal.items.map((item, i) => (
                      <tr key={i}>
                        <td className="p-3 font-bold">{item.name}</td>
                        <td className="p-3 text-slate-500">{item.description || '-'}</td>
                        <td className="p-3 text-center font-mono">{item.quantity}</td>
                        <td className="p-3 text-center font-mono">{item.price.toLocaleString()}</td>
                        <td className="p-3 text-left font-mono font-bold">{(item.total).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals Box */}
                <div className="flex flex-col items-end gap-1.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-xl mb-6">
                  <div className="flex justify-between w-64">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono font-bold">{(showDetailModal.totalAmount + showDetailModal.discount).toLocaleString()} {appSettings.institution.currency}</span>
                  </div>
                  {showDetailModal.discount > 0 && (
                    <div className="flex justify-between w-64 text-emerald-600">
                      <span>خصومات خاصة:</span>
                      <span className="font-mono font-bold">-{showDetailModal.discount.toLocaleString()} {appSettings.institution.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between w-64 border-t border-slate-200 pt-1.5 font-extrabold text-indigo-600">
                    <span>إجمالي القيمة النهائية:</span>
                    <span className="font-mono">{(showDetailModal.totalAmount).toLocaleString()} {appSettings.institution.currency}</span>
                  </div>
                  <div className="flex justify-between w-64 text-emerald-700 font-bold mt-1">
                    <span>المدفوع الفعلي:</span>
                    <span className="font-mono">{(showDetailModal.paidAmount).toLocaleString()} {appSettings.institution.currency}</span>
                  </div>
                  <div className="flex justify-between w-64 border-t border-dashed border-slate-200 pt-1.5 font-bold text-rose-600">
                    <span>المتبقي في الذمة:</span>
                    <span className="font-mono font-black">{(showDetailModal.remainingAmount).toLocaleString()} {appSettings.institution.currency}</span>
                  </div>
                </div>

                {/* Sub-Payments log internally inside invoice */}
                {showDetailModal.payments && showDetailModal.payments.length > 0 && (
                  <div className="mt-6 bg-emerald-50/20 border border-emerald-100 p-4 rounded-2xl">
                    <h5 className="font-bold text-emerald-800 text-xs mb-2">سجل الدفعات المقبوضة على الفاتورة</h5>
                    <div className="space-y-1.5">
                      {showDetailModal.payments.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[11px] text-slate-500 font-mono">
                          <span>{p.date} - دفعة بواسطة: {p.paymentMethod === 'cash' ? 'نقداً' : p.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'أخرى'}</span>
                          <span className="font-bold text-emerald-600">+{p.amount.toLocaleString()} {appSettings.institution.currency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remarks/T&C */}
                {showDetailModal.notes && (
                  <div className="mt-6 border-r-2 border-indigo-400 pr-3 text-[11px] text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700">شروط الفاتورة وحواشيها:</p>
                    <p>{showDetailModal.notes}</p>
                  </div>
                )}

                {/* Footer signatures */}
                <div className="grid grid-cols-2 gap-4 mt-10 text-[10px] text-slate-400 pt-4 border-t border-dashed border-slate-150">
                  <div>توقيع مستلم الخدمات: ...........................................</div>
                  <div className="text-left">ختم وتوقيع المؤسسة: ...........................................</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MANAGEMENT REGISTRATION MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-150 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950/40">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <DollarSign size={18} className="text-emerald-600" />
                سداد دفعة مالية للفاتورة {showPaymentModal.id}
              </h3>
              <button onClick={() => setShowPaymentModal(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 p-4 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span>إجمالي قيمة الفاتورة المستحق:</span>
                  <span className="font-mono font-bold">{showPaymentModal.totalAmount.toLocaleString()} {appSettings.institution.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>المسدد سابقاً:</span>
                  <span className="font-mono font-bold">{showPaymentModal.paidAmount.toLocaleString()} {appSettings.institution.currency}</span>
                </div>
                <hr className="border-emerald-200 dark:border-emerald-900 my-1" />
                <div className="flex justify-between font-bold">
                  <span>المتبقي حالياً في الذمة:</span>
                  <span className="font-mono font-black">{showPaymentModal.remainingAmount.toLocaleString()} {appSettings.institution.currency}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mb-1.5">مبلغ السداد المقبوض</label>
                <input
                  type="number"
                  max={showPaymentModal.remainingAmount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="أدخل قيمة الدفعة الحالية..."
                  className="w-full text-center p-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mb-1.5">وسيلة القبض</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-white"
                  >
                    <option value="cash">نقداً</option>
                    <option value="bank_transfer">تحويل مصرفي</option>
                    <option value="check">شيك مقبول الدفع</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mb-1.5">الربط المالي بالخزنة</label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer bg-slate-50 dark:bg-zinc-800 p-2 border border-slate-250 dark:border-zinc-700 rounded-xl">
                    <input
                      type="checkbox"
                      checked={linkToTreasury}
                      onChange={(e) => setLinkToTreasury(e.target.checked)}
                      className="accent-emerald-600 rounded text-xs"
                    />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-300">ربط وتحديث الخزنة</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mb-1.5">بيان أو ملاحظات السداد</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="مثال: دفعة بموجب الحوالة المصرفية..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-850 dark:text-white"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-150 dark:border-zinc-800 flex justify-end gap-2 bg-slate-50 dark:bg-zinc-950/40">
              <button
                onClick={() => setShowPaymentModal(null)}
                className="bg-slate-200 hover:bg-slate-350 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                تراجع
              </button>
              <button
                onClick={() => handleRegisterPayment(showPaymentModal)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-md shadow-emerald-600/10 transition"
              >
                تأكيد سداد الدفعة المقبوضة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
