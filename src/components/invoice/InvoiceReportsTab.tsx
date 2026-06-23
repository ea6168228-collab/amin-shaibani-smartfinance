import React, { useState, useMemo } from 'react';
import { isNativeCapacitor, saveAndSharePdf } from '../../utils/capacitorAndroidHelper';
import { 
  FilePieChart, Printer, Search, Calendar, ChevronDown, 
  TrendingUp, TrendingDown, Users, Award, ShieldCheck,
  CheckCircle, ArrowUpRight, DollarSign, ListOrdered, FileText
} from 'lucide-react';
import { 
  Invoice, Quotation, ClientOrder, Client,
  UserRole
} from '../../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceReportsTabProps {
  invoices: Invoice[];
  quotations: Quotation[];
  orders: ClientOrder[];
  clients: Client[];
  appSettings: any;
}

type ReportType = 
  | 'approved_invoices'
  | 'unpaid_invoices'
  | 'partial_invoices'
  | 'cancelled_invoices'
  | 'invoices_by_client'
  | 'monthly_sales'
  | 'sent_quotations'
  | 'accepted_quotations'
  | 'new_orders'
  | 'completed_orders'
  | 'overdue_orders'
  | 'top_clients';

export default function InvoiceReportsTab({
  invoices,
  quotations,
  orders,
  clients,
  appSettings
}: InvoiceReportsTabProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('approved_invoices');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Lists of reports
  const reportOptions = [
    { value: 'approved_invoices', label: '1) تقرير الفواتير المعتمدة والنشطة' },
    { value: 'unpaid_invoices', label: '2) تقرير الفواتير غير المدفوعة (الذمم)' },
    { value: 'partial_invoices', label: '3) تقرير الفواتير المدفوعة جزئياً' },
    { value: 'cancelled_invoices', label: '4) تقرير الفواتير الملغاة والمقيدة' },
    { value: 'invoices_by_client', label: '5) تقرير الفواتير حسب عميل محدد' },
    { value: 'monthly_sales', label: '6) تقرير إجمالي المبيعات والخدمات لهذا الشهر' },
    { value: 'sent_quotations', label: '7) تقرير عروض الأسعار المرسلة' },
    { value: 'accepted_quotations', label: '8) تقرير عروض الأسعار المقبولة والمتحولة' },
    { value: 'new_orders', label: '9) تقرير طلبات الخدمة الجديدة' },
    { value: 'completed_orders', label: '10) تقرير طلبات الخدمة المكتملة' },
    { value: 'overdue_orders', label: '11) تقرير طلبات الخدمة المتأخرة/قيد التنفيذ' },
    { value: 'top_clients', label: '12) تقرير أفضل العملاء وعوائد التحصيل' },
  ];

  // Derive Report Data
  const reportResults = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonthStr = today.substring(0, 7); // YYYY-MM

    switch (selectedReport) {
      case 'approved_invoices':
        return invoices.filter(inv => inv.status === 'approved' || inv.status === 'partial' || inv.status === 'paid');
      
      case 'unpaid_invoices':
        return invoices.filter(inv => inv.status === 'approved' && inv.remainingAmount > 0 && inv.paidAmount === 0);
      
      case 'partial_invoices':
        return invoices.filter(inv => inv.status === 'partial');
      
      case 'cancelled_invoices':
        return invoices.filter(inv => inv.status === 'cancelled');
      
      case 'invoices_by_client':
        return invoices.filter(inv => inv.customerId === selectedClientId);
      
      case 'monthly_sales':
        return invoices.filter(inv => inv.date.startsWith(currentMonthStr) && inv.status !== 'cancelled');
      
      case 'sent_quotations':
        return quotations.filter(q => q.status === 'sent');
      
      case 'accepted_quotations':
        return quotations.filter(q => q.status === 'approved');
      
      case 'new_orders':
        return orders.filter(o => o.status === 'new');
      
      case 'completed_orders':
        return orders.filter(o => o.status === 'completed');
      
      case 'overdue_orders':
        return orders.filter(o => o.status === 'in_progress' || o.status === 'pending_client');
      
      case 'top_clients':
        // Calculate total trade value + actual paid cash per client
        const mapping: { [key: string]: { clientName: string, totalBilled: number, totalPaid: number } } = {};
        invoices.forEach(inv => {
          if (inv.status !== 'cancelled') {
            if (!mapping[inv.customerId]) {
              const cl = clients.find(c => c.id === inv.customerId);
              mapping[inv.customerId] = {
                clientName: cl ? cl.name : 'عميل غير معروف',
                totalBilled: 0,
                totalPaid: 0
              };
            }
            mapping[inv.customerId].totalBilled += inv.totalAmount;
            mapping[inv.customerId].totalPaid += inv.paidAmount;
          }
        });
        return Object.keys(mapping)
          .map(id => ({ id, ...mapping[id] }))
          .sort((a, b) => b.totalBilled - a.totalBilled);

      default:
        return [];
    }
  }, [selectedReport, selectedClientId, invoices, quotations, orders, clients]);

  // Aggregate stats
  const summaryMetrics = useMemo(() => {
    if (selectedReport === 'top_clients') {
      const topRows = reportResults as any[];
      const totalTrade = topRows.reduce((s, r) => s + r.totalBilled, 0);
      const totalCollected = topRows.reduce((s, r) => s + r.totalPaid, 0);
      return { totalTrade, totalCollected, count: topRows.length };
    }

    if (selectedReport.includes('invoice')) {
      const rows = reportResults as Invoice[];
      const totalAmt = rows.reduce((s, r) => s + r.totalAmount, 0);
      const paidAmt = rows.reduce((s, r) => s + r.paidAmount, 0);
      const remAmt = rows.reduce((s, r) => s + r.remainingAmount, 0);
      return { totalAmt, paidAmt, remAmt, count: rows.length };
    }

    if (selectedReport.includes('quotation')) {
      const rows = reportResults as Quotation[];
      const totalAmt = rows.reduce((s, r) => s + r.totalAmount, 0);
      return { totalAmt, count: rows.length };
    }

    if (selectedReport.includes('order')) {
      const rows = reportResults as ClientOrder[];
      const totalEst = rows.reduce((s, r) => s + (r.estimatedValue || 0), 0);
      return { totalEst, count: rows.length };
    }

    return { count: reportResults.length };
  }, [selectedReport, reportResults]);

  // Handle PDF Export
  const handlePrintReport = async () => {
    setPdfGenerating(true);
    const element = document.getElementById('printable-commercial-report');
    if (!element) {
      alert('لم يتم العثور على البنية الرسومية للتقرير للطباعة');
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
      
      const fileName = `تقرير_تجاري_${selectedReport}_أمين.pdf`;
      if (isNativeCapacitor()) {
        const dataUri = pdf.output('datauristring');
        await saveAndSharePdf(dataUri, fileName);
      } else {
        pdf.save(fileName);
      }
    } catch (err) {
      console.error(err);
      alert('خطأ أثناء تصدير ملفات التقارير كـ PDF');
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Selector Widget */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mb-1.5">اختر التقرير التجاري المطلوب توليده</label>
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value as ReportType)}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-bold font-sans text-slate-800 dark:text-white"
          >
            {reportOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {selectedReport === 'invoices_by_client' && (
          <div className="w-full md:w-64">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block mb-1.5 font-sans">حدد العميل</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-850 dark:text-white"
            >
              <option value="">-- اختر عميل --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={handlePrintReport}
          disabled={pdfGenerating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-2 flex items-center gap-2 font-bold text-xs w-full md:w-auto transition shadow-md shadow-indigo-600/10 h-10"
        >
          <Printer size={16} />
          {pdfGenerating ? 'جاري تصدير PDF...' : 'طباعة التقرير المستخرج'}
        </button>
      </div>

      {/* Printable Area Wrapper */}
      <div id="printable-commercial-report" className="bg-white p-6 rounded-2xl border border-slate-200 text-slate-900 shadow-sm">
        {/* Report Header Logo Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-1">{appSettings.institution.name}</h2>
            <p className="text-xs text-slate-500">العنوان: {appSettings.institution.address}</p>
            <p className="text-xs text-slate-500">الجوال: {appSettings.institution.phone}</p>
          </div>
          <div className="text-left font-sans">
            <h3 className="text-sm font-black text-indigo-600">نظام تقارير ذوي الهمم والأعمال</h3>
            <p className="text-[10px] text-slate-400 mt-1">تاريخ استخراج التقرير آلياً: {new Date().toLocaleDateString('ar-YE')}</p>
            <p className="text-[10px] text-slate-400">حالة الربط وسحوبات الأيرادات والمبيعات: متكاملة</p>
          </div>
        </div>

        <div className="border-t border-b border-dashed border-slate-200 py-3 mb-6 text-center">
          <h1 className="text-base font-extrabold text-slate-800 tracking-wide font-sans">
            {reportOptions.find(o => o.value === selectedReport)?.label}
          </h1>
        </div>

        {/* SUMMARY METRICS BANNER FOR PRINT */}
        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl mb-6 text-center text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">عدد السجلات المطابقة</span>
            <span className="text-sm font-bold text-slate-800">{summaryMetrics.count} سجل</span>
          </div>

          {(selectedReport === 'top_clients') && (
            <>
              <div>
                <span className="text-slate-400 block mb-0.5">المبيعات الإجمالية</span>
                <span className="text-sm font-black text-indigo-600 font-mono">{(summaryMetrics as any).totalTrade?.toLocaleString()} {appSettings.institution.currency}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">التحصيل المحقق نقداً</span>
                <span className="text-sm font-black text-emerald-600 font-mono">{(summaryMetrics as any).totalCollected?.toLocaleString()} {appSettings.institution.currency}</span>
              </div>
            </>
          )}

          {selectedReport.includes('invoice') && (
            <>
              <div>
                <span className="text-slate-400 block mb-0.5">مجموع القيمة المالية</span>
                <span className="text-sm font-black text-indigo-600 font-mono">{(summaryMetrics as any).totalAmt?.toLocaleString()} {appSettings.institution.currency}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">مجموع المتحصلات النقدية</span>
                <span className="text-sm font-black text-emerald-600 font-mono">{(summaryMetrics as any).paidAmt?.toLocaleString()} {appSettings.institution.currency}</span>
              </div>
            </>
          )}

          {selectedReport.includes('quotation') && (
            <div>
              <span className="text-slate-400 block mb-0.5">إجمالي قيمة عروض الأسعار</span>
              <span className="text-sm font-black text-indigo-600 font-mono">{(summaryMetrics as any).totalAmt?.toLocaleString()} {appSettings.institution.currency}</span>
            </div>
          )}

          {selectedReport.includes('order') && (
            <div>
              <span className="text-slate-400 block mb-0.5">إجمالي القيم التقديرية</span>
              <span className="text-sm font-black text-indigo-600 font-mono">{(summaryMetrics as any).totalEst?.toLocaleString()} {appSettings.institution.currency}</span>
            </div>
          )}
        </div>

        {/* CUSTOMIZED DATA TABLE INTERACTIVE RENDERING */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse font-sans">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                {selectedReport === 'top_clients' ? (
                  <>
                    <th className="p-3">ترتيب</th>
                    <th className="p-3">العميل صاحب الملف</th>
                    <th className="p-3 font-mono text-center">إجمالي قيمة فواتيره المسددة والنشطة</th>
                    <th className="p-3 font-mono text-left">قيمة المبالغ المدفوعة والمحصلة بالفعل</th>
                  </>
                ) : selectedReport.includes('invoice') ? (
                  <>
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">العميل</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3 font-mono text-center">القيمة النهائية</th>
                    <th className="p-3 font-mono text-center">المدفوع</th>
                    <th className="p-3 font-mono text-left">المتبقي</th>
                  </>
                ) : selectedReport.includes('quotation') ? (
                  <>
                    <th className="p-3">رقم عرض السعر</th>
                    <th className="p-3">العميل المرتبط</th>
                    <th className="p-3 text-center">التاريخ</th>
                    <th className="p-3 text-center">صالحة لغاية</th>
                    <th className="p-3 text-left font-mono">مجموع قيمة العرض التقديرية</th>
                  </>
                ) : (
                  <>
                    <th className="p-3">رقم الطلب</th>
                    <th className="p-3">اسم العميل والاتصال</th>
                    <th className="p-3">نوع طلب الخدمة</th>
                    <th className="p-3">الوصف الفني المختصر</th>
                    <th className="p-3 scale-y-95">القيمة المقدرة للطلب</th>
                    <th className="p-3 text-left">الربط والتحويل</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {reportResults.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-sans">
                    لم يجد مدقق النظام أي بيانات مطابقة للتوليد حالياً.
                  </td>
                </tr>
              ) : (
                reportResults.map((row: any, idx: number) => {
                  if (selectedReport === 'top_clients') {
                    return (
                      <tr key={row.id}>
                        <td className="p-3 font-extrabold">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-800">{row.clientName}</td>
                        <td className="p-3 text-center font-mono">{row.totalBilled?.toLocaleString()} {appSettings.institution.currency}</td>
                        <td className="p-3 text-left font-mono font-bold text-emerald-600">{row.totalPaid?.toLocaleString()} {appSettings.institution.currency}</td>
                      </tr>
                    );
                  }

                  if (selectedReport.includes('invoice')) {
                    const client = clients.find(c => c.id === row.customerId);
                    return (
                      <tr key={row.id}>
                        <td className="p-3 font-mono font-bold">{row.id}</td>
                        <td className="p-3 font-bold text-slate-800">{client ? client.name : 'مجهول'}</td>
                        <td className="p-3 text-center font-mono">{row.date}</td>
                        <td className="p-3 text-center font-mono">{row.totalAmount?.toLocaleString()}</td>
                        <td className="p-3 text-center font-mono text-emerald-600">{row.paidAmount?.toLocaleString()}</td>
                        <td className="p-3 text-left font-mono text-rose-500 font-bold">{row.remainingAmount?.toLocaleString()}</td>
                      </tr>
                    );
                  }

                  if (selectedReport.includes('quotation')) {
                    const client = clients.find(c => c.id === row.customerId);
                    return (
                      <tr key={row.id}>
                        <td className="p-3 font-mono font-bold">{row.id}</td>
                        <td className="p-3 font-bold text-slate-800">{client ? client.name : 'مجهول'}</td>
                        <td className="p-3 text-center font-mono">{row.date}</td>
                        <td className="p-3 text-center font-mono text-rose-500">{row.expiryDate}</td>
                        <td className="p-3 text-left font-mono font-extrabold text-indigo-600">{row.totalAmount?.toLocaleString()}</td>
                      </tr>
                    );
                  }

                  // Orders/Service Requests
                  const client = clients.find(c => c.id === row.customerId);
                  return (
                    <tr key={row.id}>
                      <td className="p-3 font-mono font-bold">{row.id}</td>
                      <td className="p-3 font-bold text-slate-800">{client ? client.name : 'مجهول'}</td>
                      <td className="p-3 text-indigo-600 font-bold">{row.orderType}</td>
                      <td className="p-3 max-w-xs truncate">{row.description}</td>
                      <td className="p-3 font-mono">{row.estimatedValue ? `${row.estimatedValue.toLocaleString()} ${appSettings.institution.currency}` : 'بلا'}</td>
                      <td className="p-3 text-left text-[11px] font-bold text-slate-500 font-mono">
                        {row.convertedToId ? `ربط محول بـ ${row.convertedToId}` : 'قيد تتبع الإخراج والمتابعة'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer remarks for compliance / print credibility */}
        <div className="mt-12 text-[10px] text-slate-400 flex justify-between items-center border-t border-dashed border-slate-150 pt-4">
          <span>نظام أمين الشيباني الذكي للتجارة والحلول المالية المتكاملة اللاسلكية بنجاح</span>
          <span>توقيع المدير المالي للتصديق: ................................</span>
        </div>
      </div>
    </div>
  );
}
