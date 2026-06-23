import React, { useMemo } from 'react';
import { 
  AlertTriangle, Clock, ShieldAlert, BadgePercent, CheckCircle, 
  HelpCircle, UserCheck, Users, HelpCircle as HelpIcon, Sparkles,
  Info
} from 'lucide-react';
import { 
  Invoice, Quotation, ClientOrder, Client 
} from '../../types';

interface InvoiceAlertsTabProps {
  invoices: Invoice[];
  quotations: Quotation[];
  orders: ClientOrder[];
  clients: Client[];
  appSettings: any;
}

export default function InvoiceAlertsTab({
  invoices,
  quotations,
  orders,
  clients,
  appSettings
}: InvoiceAlertsTabProps) {
  
  const alerts = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const list: Array<{
      id: string;
      type: 'critical' | 'warning' | 'info' | 'success';
      title: string;
      description: string;
      badge: string;
    }> = [];

    // 1. Unpaid Invoices
    const unpaidInvs = invoices.filter(inv => inv.status === 'approved' && inv.paidAmount === 0 && inv.remainingAmount > 0);
    if (unpaidInvs.length > 0) {
      list.push({
        id: `alert-unpaid-${Date.now()}-1`,
        type: 'warning',
        title: 'ذمم معلّقة: فواتير معتمدة لم يُدفع منها أي مبلغ',
        description: `يوجد بالنظام عدد ${unpaidInvs.length} فاتورة في حالة "معتمدة" ومستحقة كلياً دون سداد أي دفعات بعد. إجمالي القيمة المستحقة: ${unpaidInvs.reduce((s, inv) => s + inv.remainingAmount, 0).toLocaleString()} ${appSettings.institution.currency}.`,
        badge: 'ذمم معلقة كلياً'
      });
    }

    // 2. Overdue Invoices (Approved for more than 15 days or matching specific rules)
    const overdueInvs = invoices.filter(inv => {
      if (inv.status !== 'approved' && inv.status !== 'partial') return false;
      const invDate = new Date(inv.date);
      const diffTime = Math.abs(today.getTime() - invDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 15 && inv.remainingAmount > 0; // Overdue after 15 days
    });
    if (overdueInvs.length > 0) {
      list.push({
        id: `alert-overdue-${Date.now()}-2`,
        type: 'critical',
        title: 'فواتير متأخرة السداد والتحصيل (تجاوزت ١٥ يوماً)',
        description: `يوجد عدد ${overdueInvs.length} فاتورة معتمدة مضى على إصدارها أكثر من ١٥ يوماً في ذمة العملاء ولم تسدد بالكامل بعد.`,
        badge: 'تنبيه تحصيل متأخر'
      });
    }

    // 3. Partially Paid Invoices
    const partialInvs = invoices.filter(inv => inv.status === 'partial');
    if (partialInvs.length > 0) {
      list.push({
        id: `alert-partial-${Date.now()}-3`,
        type: 'info',
        title: 'فواتير مدفوعة جزئياً وقيد المتابعة',
        description: `يوجد عدد ${partialInvs.length} فاتورة مدفوعة بشكل جزئي وجاري تحصيل باقي القيمة تزامناً مع إتمام البنود الإجرائية.`,
        badge: 'تحصيل جزئي'
      });
    }

    // 4. Quotations near expiration (Expiry date is within 5 days or past)
    const nearExpiryQuotes = quotations.filter(q => {
      if (q.status !== 'sent') return false;
      const expDate = new Date(q.expiryDate);
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 5; // Next 5 days
    });
    if (nearExpiryQuotes.length > 0) {
      list.push({
        id: `alert-near-expiry-quote-${Date.now()}-4`,
        type: 'warning',
        title: 'عروض أسعار مرسلة تقترب من الإنتهاء والصلاحية',
        description: `يوجد عدد ${nearExpiryQuotes.length} عرض سعر تجاري مرسل قاربت مهلته الزمنية على النفاد ولم يعقبه موافقة أو تعديل من العميل.`,
        badge: 'عروض شارفت على الانتهاء'
      });
    }

    // 5. Stuck or delayed Orders
    const delayedOrders = orders.filter(o => o.status === 'in_progress' || o.status === 'pending_client');
    if (delayedOrders.length > 0) {
      list.push({
        id: `alert-delayed-order-${Date.now()}-5`,
        type: 'warning',
        title: 'طلبات خدمات معلّقة أو قيد المعالجة',
        description: `يوجد بالنظام ${delayedOrders.length} طلب خدمة قيد التنفيذ أو قيد انتظار موافقة العميل ولم تحول بعد لعرض أسعار أو فاتورة نهائية.`,
        badge: 'معاملات قيد التنفيذ'
      });
    }

    // 6. Clients with multiple open invoices (More than 1 invoice with remainingAmount > 0)
    const clientOpenInvoiceMap: { [key: string]: number } = {};
    invoices.forEach(inv => {
      if (inv.remainingAmount > 0 && inv.status !== 'cancelled') {
        clientOpenInvoiceMap[inv.customerId] = (clientOpenInvoiceMap[inv.customerId] || 0) + 1;
      }
    });
    const clientsWithMultipleOpen = Object.keys(clientOpenInvoiceMap).filter(id => clientOpenInvoiceMap[id] > 1);
    if (clientsWithMultipleOpen.length > 0) {
      const names = clientsWithMultipleOpen.map(id => {
        const c = clients.find(cl => cl.id === id);
        return c ? c.name : 'عميل غير معروف';
      }).join('، ');
      
      list.push({
        id: `alert-multi-open-${Date.now()}-6`,
        type: 'critical',
        title: 'عملاء لديهم أكثر من فاتورة ذمم مفتوحة معاً',
        description: `انتبه: العملاء الماليين (${names}) لديهم أكثر من فاتورة غير مسواة بالنظام في وقت واحد، ينصح بدمجهما بحساب أو جدولة التحصيل لتقليل مخاطر الدين.`,
        badge: 'عملاء ديون متعددة'
      });
    }

    // 7. Math Consistency Check (Mismatched sum calculations in payment ledger vs paidAmount)
    const mathMismatch = invoices.filter(inv => {
      const paymentsSum = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      return Math.abs(inv.paidAmount - paymentsSum) > 0.1; // Float precision margin
    });
    if (mathMismatch.length > 0) {
      list.push({
        id: `alert-mismatch-${Date.now()}-7`,
        type: 'critical',
        title: 'مخاطر محاسبية: خلل حسابي في الموازنة المالية للفواتير والدفعات',
        description: `عثر النظام على تفاوت بقيمة الفاتورة والدفعات المعتمدة داخل عدد (${mathMismatch.length}) فاتورة. يرجي مراجعة السجلات أو التواصل الفني لحماية موازنات الخزائن والتحصيل المترابط.`,
        badge: 'إنذار تدقيق وموازنة'
      });
    }

    // Default compliance note if perfect
    if (list.length === 0) {
      list.push({
        id: `alert-success-all-${Date.now()}`,
        type: 'success',
        title: 'جاهزية تجارية ومطابقة محاسبية تامة للمدرجات',
        description: 'ممتاز! لم يرصد نظام أمين المحاسبي الذكي أي انحرافات، تعثر تحصيلي، أو فواتير ذمم متأخرة أو تفاوت مالي بالخزن والتقارير حالياً.',
        badge: 'مطابقة النظام: ١٠٠٪'
      });
    }

    return list;
  }, [invoices, quotations, orders, clients, appSettings]);

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Overview Intro card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-slate-100 p-6 rounded-2xl border border-indigo-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden shadow-md">
        <div className="relative z-10">
          <h3 className="font-extrabold text-white text-base flex items-center gap-1.5">
            <Sparkles size={20} className="text-amber-400" />
            شاشة المفتش ومطابق الأنظمة المالية "أمين الشيباني"
          </h3>
          <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
            تعمل هذه الميزة الذكية بالكامل Offline بدون إنترنت، حيث تقوم بالتدقيق التلقائي التراكمي في قواعد البيانات المحلية وكشوف حساب الفواتير والعملاء للكشف الفوري عن أي مخاطر تعثر مالي أو تفاوت في الدفعات.
          </p>
        </div>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert) => (
          <div 
            key={alert.id}
            className={`border rounded-2xl p-5 shadow-sm transition flex gap-4 ${
              alert.type === 'critical' ? 'bg-rose-50 border-rose-150 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-350' : 
              alert.type === 'warning' ? 'bg-amber-50 border-amber-150 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-350' :
              alert.type === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-350' :
              'bg-blue-50 border-blue-150 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-350'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {alert.type === 'critical' && <ShieldAlert size={22} className="text-rose-600 dark:text-rose-400" />}
              {alert.type === 'warning' && <AlertTriangle size={22} className="text-amber-600 dark:text-amber-400" />}
              {alert.type === 'success' && <CheckCircle size={22} className="text-emerald-600 dark:text-emerald-400" />}
              {alert.type === 'info' && <Info size={22} className="text-blue-600 dark:text-blue-400" />}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                  {alert.title}
                </h4>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                  alert.type === 'critical' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' :
                  alert.type === 'warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                  alert.type === 'success' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                }`}>
                  {alert.badge}
                </span>
              </div>
              <p className="text-xs text-slate-650 dark:text-zinc-350 leading-relaxed pr-0.5">
                {alert.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
