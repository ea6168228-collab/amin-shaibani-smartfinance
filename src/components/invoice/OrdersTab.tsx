import React, { useState, useMemo } from 'react';
import { 
  FileText, Plus, Search, Filter, AlertTriangle, CheckCircle, 
  Clock, X, Calendar, User, Briefcase, ChevronDown, 
  ArrowUpRight, ArrowRight, ClipboardCopy, FileSpreadsheet,
  Link, BadgePercent
} from 'lucide-react';
import { 
  ClientOrder, Client, Quotation, Invoice, Employee,
  UserRole
} from '../../types';

interface OrdersTabProps {
  orders: ClientOrder[];
  setOrders: React.Dispatch<React.SetStateAction<ClientOrder[]>>;
  quotations: Quotation[];
  setQuotations: React.Dispatch<React.SetStateAction<Quotation[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  clients: Client[];
  employees: Employee[];
  currentUserRole: UserRole;
  appSettings: any;
  loggedInUserName: string;
  setActiveSubTab?: (tab: string) => void;
}

export default function OrdersTab({
  orders,
  setOrders,
  quotations,
  setQuotations,
  invoices,
  setInvoices,
  clients,
  employees,
  currentUserRole,
  appSettings,
  loggedInUserName,
  setActiveSubTab
}: OrdersTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Form State
  const [newClient, setNewClient] = useState('');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newOrderType, setNewOrderType] = useState('معاملة خدمات إدارية/تقنية');
  const [newDescription, setNewDescription] = useState('');
  const [newEstValue, setNewEstValue] = useState<string>('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Handle Order submit
  const handleSaveOrder = () => {
    if (!newClient) {
      alert('الرجاء اختيار العميل للطلب');
      return;
    }
    if (!newDescription.trim()) {
      alert('الرجاء إدخال وصف للطلب أو الخدمة المطلوبة');
      return;
    }

    const nextNumber = orders.length + 10001;
    const orderId = `ORD-${nextNumber}`;

    const newOrder: ClientOrder = {
      id: orderId,
      customerId: newClient,
      date: newDate,
      orderType: newOrderType,
      description: newDescription,
      estimatedValue: newEstValue ? parseFloat(newEstValue) : undefined,
      status: 'new',
      employeeId: newAssignee || undefined,
      notes: newNotes
    };

    setOrders(prev => [newOrder, ...prev]);

    // Reset Form
    setNewClient('');
    setNewOrderType('معاملة خدمات إدارية/تقنية');
    setNewDescription('');
    setNewEstValue('');
    setNewAssignee('');
    setNewNotes('');
    setShowCreateModal(false);
  };

  // Switch/Update status
  const handleUpdateStatus = (id: string, status: ClientOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    alert(`تم تحديث حالة طلب الخدمة رقم ${id} بنجاح.`);
  };

  // Convert Order to Quotation
  const handleConvertToQuotation = (order: ClientOrder) => {
    const nextQNum = quotations.length + 10001;
    const quoteId = `QTN-${nextQNum}`;
    const dateToday = new Date().toISOString().split('T')[0];
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 15);

    const newQuote: Quotation = {
      id: quoteId,
      customerId: order.customerId,
      date: dateToday,
      expiryDate: expiryDate.toISOString().split('T')[0],
      items: [
        {
          name: `${order.orderType}: ${order.description}`,
          quantity: 1,
          price: order.estimatedValue || 0,
          total: order.estimatedValue || 0
        }
      ],
      totalAmount: order.estimatedValue || 0,
      status: 'draft',
      notes: `عرض أسعار مجهز ومحول من طلب خدمات رقم ${order.id}`,
      createdBy: loggedInUserName
    };

    setQuotations(prev => [newQuote, ...prev]);

    // Update Order Link
    setOrders(prev => prev.map(o => o.id === order.id ? {
      ...o,
      status: 'in_progress',
      convertedToId: quoteId,
      convertedToType: 'quotation',
      notes: `${o.notes || ''}\n[محول لعرض السعر ${quoteId}]`
    } : o));

    alert(`تم تحويل الطلب ${order.id} إلى مسودة عرض سعر رقم ${quoteId} بنجاح.`);
    if (setActiveSubTab) {
      setActiveSubTab('quotations');
    }
  };

  // Convert Order to Invoice
  const handleConvertToInvoice = (order: ClientOrder) => {
    const nextINum = invoices.length + 10001;
    const invoiceId = `INV-${nextINum}`;
    const dateToday = new Date().toISOString().split('T')[0];

    const newInvoice: Invoice = {
      id: invoiceId,
      customerId: order.customerId,
      date: dateToday,
      type: 'service',
      items: [
        {
          name: order.orderType,
          description: order.description,
          quantity: 1,
          price: order.estimatedValue || 0,
          total: order.estimatedValue || 0
        }
      ],
      discount: 0,
      totalAmount: order.estimatedValue || 0,
      paidAmount: 0,
      remainingAmount: order.estimatedValue || 0,
      status: 'draft',
      notes: `فاتورة مسودة تم توليدها آلياً من الطلب رقم ${order.id}`,
      createdBy: loggedInUserName,
      payments: []
    };

    setInvoices(prev => [newInvoice, ...prev]);

    // Update Order
    setOrders(prev => prev.map(o => o.id === order.id ? {
      ...o,
      status: 'completed',
      convertedToId: invoiceId,
      convertedToType: 'invoice',
      notes: `${o.notes || ''}\n[منجز ومحول للفاتورة ${invoiceId}]`
    } : o));

    alert(`تم تحويل طلب الخدمة ${order.id} إلى مسودة فاتورة مستحقة رقم ${invoiceId} بنجاح.`);
    if (setActiveSubTab) {
      setActiveSubTab('invoices');
    }
  };

  // Filter computation
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const client = clients.find(c => c.id === o.customerId);
      const clientName = client ? client.name : '';
      const matchesSearch = (o.id || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (o.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter, clients]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Filters Search bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="البحث برقم الطلب، الخدمة، العميل..."
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
              <option value="all">كل حالات طلبات الخدمات</option>
              <option value="new">طلب جديد</option>
              <option value="in_progress">قيد التنفيذ والتحضير</option>
              <option value="pending_client">بانتظار موافقة أو بيانات العميل</option>
              <option value="completed">منجز ومكتمل</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 flex items-center gap-2 font-bold text-sm w-full md:w-auto transition shadow-md shadow-indigo-600/10"
        >
          <Plus size={18} />
          تسجيل طلب جديد
        </button>
      </div>

      {/* Grid or Table of requests */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-150 dark:border-zinc-800 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/50">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">طلبات الخدمات والأعمال للتنفيذ</h3>
          <span className="text-xs text-slate-400">إجمالي الطلبات: {filteredOrders.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-zinc-950/20 border-b border-slate-150 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 text-xs font-bold font-sans">
                <th className="p-4">رقم الطلب</th>
                <th className="p-4">العميل</th>
                <th className="p-4">نوع الخدمة المطلوب</th>
                <th className="p-4">وصف مختصر للطلب</th>
                <th className="p-4 font-mono">القيمة المقدرة</th>
                <th className="p-4">الموظف المكلف</th>
                <th className="p-4 text-center">حالة الطلب</th>
                <th className="p-4 text-center">إدارة وتحويل مسارات الصرف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-zinc-850 text-slate-700 dark:text-zinc-350">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    لا توجد طلبات خدمات مسجلة تطابق هذه المحددات.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const client = clients.find(c => c.id === o.customerId);
                  const emp = employees.find(e => e.id === o.employeeId);
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/40 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white font-mono">{o.id}</td>
                      <td className="p-4 font-medium text-slate-850 dark:text-zinc-200">{client ? client.name : 'مجهول'}</td>
                      <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400">{o.orderType}</td>
                      <td className="p-4 max-w-xs truncate" title={o.description}>{o.description}</td>
                      <td className="p-4 font-mono font-bold text-slate-800 dark:text-zinc-200">
                        {o.estimatedValue ? `${o.estimatedValue.toLocaleString()} ${appSettings.institution.currency}` : 'قيد التقييم'}
                      </td>
                      <td className="p-4 text-slate-500">{emp ? emp.name : <span className="text-slate-400">غير معين</span>}</td>
                      <td className="p-4 text-center">
                        <select
                          value={o.status}
                          onChange={(e) => handleUpdateStatus(o.id, e.target.value as any)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-black select-none border-0 shadow-xs focus:ring-2 ${
                            o.status === 'new' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40' :
                            o.status === 'in_progress' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40' :
                            o.status === 'pending_client' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40' :
                            o.status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40' :
                            'bg-rose-50 text-rose-700 dark:bg-rose-950/40'
                          }`}
                        >
                          <option value="new">طلب جديد</option>
                          <option value="in_progress">قيد التنفيذ</option>
                          <option value="pending_client">بانتظار العميل</option>
                          <option value="completed">منجز ومكتمل</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          {o.status !== 'completed' && o.status !== 'cancelled' && (
                            <>
                              <button
                                onClick={() => handleConvertToQuotation(o)}
                                className="bg-slate-50 border border-slate-200 hover:bg-slate-100 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-350 px-2 py-1 rounded-lg transition"
                                title="تحويل لعرض أسعار تجاري"
                              >
                                تحويل لعرض سعر
                              </button>
                              <button
                                onClick={() => handleConvertToInvoice(o)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-2 py-1 rounded-lg transition"
                                title="تحويل لفاتورة مسودة مباشرة"
                              >
                                تحويل لفاتورة
                              </button>
                            </>
                          )}

                          {o.convertedToId && (
                            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg font-mono">
                              مرتبط بـ {o.convertedToId}
                            </span>
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

      {/* CREATE POPUP */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-150 dark:border-zinc-800 flex justify-between items-center bg-slate-50 dark:bg-zinc-950/40">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-sm">
                <FileText size={18} className="text-indigo-600" />
                تسجيل طلب خدمة أو معاملة عميل جديدة
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* Body Form */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">العميل صاحب الطلب</label>
                <select
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                >
                  <option value="">-- اختر من العملاء --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">تاريخ التلقي</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">القيمة المالية المقدرة</label>
                  <input
                    type="number"
                    value={newEstValue}
                    onChange={(e) => setNewEstValue(e.target.value)}
                    placeholder="اختياري بحسب الاتفاق..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">تصنيف نوع طلب الخدمة</label>
                <input
                  type="text"
                  value={newOrderType}
                  onChange={(e) => setNewOrderType(e.target.value)}
                  placeholder="مثال: تعميد رسمي، خدمة صيانة، استئناف عقد..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-255 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-850 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">وصف مقتضب للعمل المطلوب</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="شرح البنود المطلوبة إنجازها..."
                  className="w-full p-2.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">الموظف المكلّف بالمتابعة والتنفيذ</label>
                <select
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                >
                  <option value="">-- غير معين (اختياري) --</option>
                  {employees.filter(e => !e.isArchived).map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1.5">ملاحظات حاشية الطلب</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="ملاحظات أخرى للموظف المكلف..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-250 dark:border-zinc-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-150 dark:border-zinc-800 flex justify-end gap-2 bg-slate-50 dark:bg-zinc-950/40">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleSaveOrder}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black transition"
              >
                تأكيد وتسجيل طلب العمل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
