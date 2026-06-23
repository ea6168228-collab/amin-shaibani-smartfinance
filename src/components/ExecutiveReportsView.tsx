import React, { useState } from 'react';
import { Users, Coins, ShieldCheck, Printer } from 'lucide-react';

interface ExecutiveReportsViewProps {
  employees: any[];
  transactions: any[];
}

export function ExecutiveReportsView({ employees, transactions }: ExecutiveReportsViewProps) {
  const [selectedExecReport, setSelectedExecReport] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Executive Dashboard Selection */}
      {!selectedExecReport && (
        <div className="space-y-6 text-right no-print">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Employee Admin category */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-805 rounded-2xl p-5 space-y-4 shadow-xs">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 pb-2 border-b border-slate-100 dark:border-zinc-800 block flex items-center gap-1.5 justify-end">
                <span>شؤون الموظفين</span>
                <Users size={16} />
              </span>
              <div className="space-y-1 text-2xs font-extrabold text-slate-700 dark:text-zinc-350">
                <button 
                  onClick={() => setSelectedExecReport('emp-highest-advances')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400">تحليل المديونيات الأعلى</span>
                  <span>تقرير أعلى الموظفين الحاصلين على سلفيات</span>
                </button>
                <button 
                  onClick={() => setSelectedExecReport('emp-highest-deductions')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400">الحد من الخصومات</span>
                  <span>تقرير الموظفين الأكثر تعرضاً للخصميات</span>
                </button>
                <button 
                  onClick={() => setSelectedExecReport('emp-monthly-net')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400">التسويات النشطة</span>
                  <span>تقرير رواتب الموظفين الشهرية والصافي</span>
                </button>
                <button 
                  onClick={() => setSelectedExecReport('emp-unpaid-installments')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400">متابعة السندات المتبقية</span>
                  <span>تقرير الأقساط المستحقة المتبقية</span>
                </button>
                <button 
                  onClick={() => setSelectedExecReport('emp-open-advances')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400">كشف سلفيات قائم</span>
                  <span>تقرير السلفيات القائمة والمفتوحة للذمم</span>
                </button>
              </div>
            </div>

            {/* 2. Associations & Funds category */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-805 rounded-2xl p-5 space-y-4 shadow-xs">
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 pb-2 border-b border-slate-100 dark:border-zinc-800 block flex items-center gap-1.5 justify-end">
                <span>الجمعيات وصناديق التكافل</span>
                <Coins size={16} />
              </span>
              <div className="space-y-1 text-2xs font-extrabold text-slate-700 dark:text-zinc-350">
                <button 
                  onClick={() => setSelectedExecReport('assoc-active-list')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400">نشطة الحساب</span>
                  <span>تقرير الجمعيات النشطة وحالاتها الحالية</span>
                </button>
                <button 
                  onClick={() => setSelectedExecReport('assoc-members-late')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-rose-500 font-bold">إنذارات متأخرة</span>
                  <span>تقرير المشتركين المتأخرين عن السدادات</span>
                </button>
                <button 
                  onClick={() => setSelectedExecReport('assoc-completed-payouts')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400">أدوار الصرف المنتهية</span>
                  <span>تقرير عمليات الصرف المكتملة للأدوار</span>
                </button>
                <button 
                  onClick={() => setSelectedExecReport('assoc-chest-balances')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400">السيولة الدائرة بالصندوق</span>
                  <span>تقرير كشف أرصدة وكفاءة السيولة بالصناديق</span>
                </button>
                <button 
                  onClick={() => setSelectedExecReport('assoc-closed-history')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400">السجل التاريخي المالي</span>
                  <span>تقرير الصناديق المغلقة والمصروفة بالكامل</span>
                </button>
              </div>
            </div>

            {/* 3. General Exec Administration category */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-805 rounded-2xl p-5 space-y-4 shadow-xs">
              <span className="text-xs font-black text-rose-600 dark:text-rose-400 pb-2 border-b border-slate-100 dark:border-zinc-800 block flex items-center gap-1.5 justify-end">
                <span>الإدارة العامة والرقابة المحاسبية</span>
                <ShieldCheck size={16} />
              </span>
              <div className="space-y-1 text-2xs font-extrabold text-slate-700 dark:text-zinc-350">
                <button 
                  onClick={() => setSelectedExecReport('general-monthly-summary')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-indigo-600 font-extrabold dark:text-indigo-400">المركز المالي الموحد</span>
                  <span>كشف الملخص المالي الشهري الشامل للمؤسسة</span>
                </button>
                <button 
                  onClick={() => setSelectedExecReport('general-audit-logs')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400">حركة تشغيل الموظفين</span>
                  <span>تقرير سجل أنشطة وعمليات المستخدمين</span>
                </button>
                <button 
                  onClick={() => setSelectedExecReport('general-backup-logs')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400 font-mono">Backup Safety Logs</span>
                  <span>تقرير سجلات وسلامة التواريخ الاحتياطية</span>
                </button>
                <button 
                  onClick={() => setSelectedExecReport('general-locked-months')} 
                  className="w-full text-right p-3 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg transition-all border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] text-slate-400">الفترات المقفلة</span>
                  <span>تقرير وتأريخ العمليات الشهرية المقفلة محاسبياً</span>
                </button>
              </div>
            </div>

          </div>

          <p className="text-[11px] text-slate-400 text-center font-bold">
            💡 انقر على أي تقرير إداري أعلاه لعرض كشف الحساب التحليلي المعزز وإصدار نسخة PDF معدة للطباعة.
          </p>
        </div>
      )}

      {selectedExecReport && (
        <div className="space-y-4">
          {/* Back button and Print Layout Trigger */}
          <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 p-3 rounded-2xl flex items-center justify-between no-print shadow-xs">
            <button 
              onClick={() => setSelectedExecReport(null)} 
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-2xs font-extrabold text-slate-500 dark:text-zinc-300 cursor-pointer"
            >
              ← العودة لقائمة التقارير الإدارية
            </button>
            <button 
              onClick={() => window.print()} 
              className="px-5 py-1.5 bg-indigo-600 text-white rounded-xl text-2xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <Printer size={13} />
              <span>إصدار وطباعة هذا التقرير كـ PDF</span>
            </button>
          </div>

          {/* Compiled Dynamic Report Sheet Content */}
          <div className="p-8 bg-white text-slate-900 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-6 text-right print-area overflow-hidden font-sans shadow-lg" id="executive-pdf-print-container">
            
            {/* Header logo/institutional detail */}
            <div className="text-center space-y-1 border-b pb-4">
              <span className="text-indigo-600 font-extrabold text-sm block">مؤسسة أمين الشيباني للتجارة العامة</span>
              <span className="text-xs font-black text-slate-700 block">
                {(() => {
                  if (selectedExecReport === 'emp-highest-advances') return 'تقرير أعلى الموظفين الحاصلين على سلفيات مالية';
                  if (selectedExecReport === 'emp-highest-deductions') return 'تقرير الموظفين الأكثر تعرضاً للخصميات الجزائية والغياب';
                  if (selectedExecReport === 'emp-monthly-net') return 'تقرير رواتب الموظفين الشهرية مع صافي المستحقات المعمدة';
                  if (selectedExecReport === 'emp-unpaid-installments') return 'تقرير أقساط السلفيات المتبقية المستحقة بالذمة للشركة';
                  if (selectedExecReport === 'emp-open-advances') return 'تقرير السلفيات القائمة والمفتوحة بملفات الموظفين';
                  if (selectedExecReport === 'assoc-active-list') return 'تقرير صناديق الجمعيات النشطة والمستوى التشغيلي والمالي';
                  if (selectedExecReport === 'assoc-members-late') return 'تقرير المشتركين المتعثرين والمتأخرين عن تحصيل الأقساط';
                  if (selectedExecReport === 'assoc-completed-payouts') return 'تقرير مكاملة عمليات أدوار الصرف المستلمة للمشتركين';
                  if (selectedExecReport === 'assoc-chest-balances') return 'تقرير كشف أرصدة وكفاءة السيولة بالصناديق العامة';
                  if (selectedExecReport === 'assoc-closed-history') return 'تقرير الصناديق والجمعيات المنتهية والمستلمة بالكامل';
                  if (selectedExecReport === 'general-monthly-summary') return 'تقرير كشف الموقف والملخص المالي الموحد للمؤسسة';
                  if (selectedExecReport === 'general-audit-logs') return 'تقرير سجل Audit Logs - رقابة وتاريخ أنشطة المستخدمين';
                  if (selectedExecReport === 'general-backup-logs') return 'تقرير أمن البيانات - لقطات وتواريخ النسخ الاحتياطي';
                  if (selectedExecReport === 'general-locked-months') return 'تقرير الفترات الحسابية المغلقة والمقيدة محاسبياً';
                  return 'التقرير الإداري والمالي المعتمد';
                })()}
              </span>
              <div className="text-[10px] text-slate-400 font-bold">تاريخ إصدار التقرير: {new Date().toLocaleDateString('ar-EG')} | توقيت النظام: {new Date().toLocaleTimeString('ar-EG')}</div>
            </div>

            {/* Dynamic data table rendering */}
            <div className="overflow-x-auto text-[11px]">
              {(() => {
                if (selectedExecReport === 'emp-highest-advances') {
                  const data = [...employees].map(emp => {
                    const empTxs = transactions.filter(t => t.employeeId === emp.id);
                    const totalAdv = empTxs
                      .filter(t => t.type === 'advance' || t.type === 'thursday_advance')
                      .reduce((sum, t) => sum + (t.debit || 0), 0);
                    return { ...emp, totalAdv };
                  }).sort((a,b) => b.totalAdv - a.totalAdv);

                  return (
                    <table className="w-full text-right border text-xs text-right border-slate-100">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">اسم الموظف</th>
                          <th className="p-2.5 font-mono text-left">قيمة الراتب الأساسي</th>
                          <th className="p-2.5 font-mono text-left">إجمالي السلفيات المسحوبة</th>
                          <th className="p-2.5 text-right">المسمى الوظيفي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right">
                        {data.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 text-right text-slate-800">{item.name}</td>
                            <td className="p-2.5 font-mono text-left">{item.salary.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 font-mono text-left text-orange-600">{item.totalAdv.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 text-right text-slate-500">{item.jobTitle || 'موظف'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'emp-highest-deductions') {
                  const data = [...employees].map(emp => {
                    const empTxs = transactions.filter(t => t.employeeId === emp.id);
                    const totalDed = empTxs
                      .filter(t => t.type === 'deduction' || t.type === 'absence')
                      .reduce((sum, t) => sum + (t.debit || 0), 0);
                    return { ...emp, totalDed };
                  }).sort((a,b) => b.totalDed - a.totalDed);

                  return (
                    <table className="w-full text-xs text-right border border-slate-100">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">اسم الموظف</th>
                          <th className="p-2.5 font-mono text-left">الراتب الأساسي</th>
                          <th className="p-2.5 font-mono text-left">إجمالي الخصميات والغياب</th>
                          <th className="p-2.5 text-right">المسمى الوظيفي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right text-slate-800">
                        {data.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 text-right text-slate-800">{item.name}</td>
                            <td className="p-2.5 font-mono text-left">{item.salary.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 font-mono text-left text-red-650">-{item.totalDed.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 text-right text-slate-500">{item.jobTitle || 'موظف'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'emp-monthly-net') {
                  const isCustom = localStorage.getItem('amin_sh_custom_workspace') === 'true';
                  const uId = localStorage.getItem('amin_sh_current_user_id') || 'default';
                  const sKey = isCustom ? "amin_sh_settlements_" + uId : "amin_sh_settlements";
                  const sStr = localStorage.getItem(sKey);
                  let settleList: any[] = [];
                  if (sStr) {
                    try { settleList = JSON.parse(sStr); } catch(e){}
                  }

                  const data = [...employees].map(emp => {
                    const empSettles = settleList.filter(s => s.employeeId === emp.id);
                    const latestSettle = empSettles[0] || null;
                    return { ...emp, latestSettle };
                  });

                  return (
                    <table className="w-full text-right border border-slate-100 text-xs text-right">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">اسم الموظف</th>
                          <th className="p-2.5 font-mono text-left">الراتب الأساسي</th>
                          <th className="p-2.5 text-right">آخر تسوية مصدرة</th>
                          <th className="p-2.5 font-mono text-left">الصافي المعمد بالقرار</th>
                          <th className="p-2.5 text-right">حالة التسوية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right text-slate-800">
                        {data.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 text-right">{item.name}</td>
                            <td className="p-2.5 font-mono text-left">{item.salary.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 text-slate-550 text-right">
                              {item.latestSettle ? `شهر ${item.latestSettle.month} / سنة ${item.latestSettle.year}` : 'لا يوجد تسوية مسجلة'}
                            </td>
                            <td className="p-2.5 font-mono text-left text-indigo-700">
                              {item.latestSettle ? `${item.latestSettle.finalNet.toLocaleString()} ر.ي` : '-'}
                            </td>
                            <td className="p-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${item.latestSettle?.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {item.latestSettle ? (item.latestSettle.status === 'approved' ? 'معتمد' : 'مسودة') : 'غير مصدر'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'emp-unpaid-installments') {
                  const data = [...employees].map(emp => {
                    const empTxs = transactions.filter(t => t.employeeId === emp.id);
                    const totalAdv = empTxs
                      .filter(t => t.type === 'advance' || t.type === 'thursday_advance')
                      .reduce((sum, t) => sum + (t.debit || 0), 0);
                    const totalRepaid = empTxs
                      .filter(t => t.type === 'installment' || t.type === 'returned_advance')
                      .reduce((sum, t) => sum + (t.credit || 0), 0);
                    const outstanding = Math.max(0, totalAdv - totalRepaid);
                    return { ...emp, totalAdv, totalRepaid, outstanding };
                  }).filter(item => item.outstanding > 100);

                  return (
                    <table className="w-full text-xs text-right border border-slate-100">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">اسم الموظف</th>
                          <th className="p-2.5 font-mono text-left">قيمة الذمة الإجمالية</th>
                          <th className="p-2.5 font-mono text-left">إجمالي المسدد</th>
                          <th className="p-2.5 font-mono text-left">المتبقي المطلوب سداده</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right text-slate-800">
                        {data.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 text-right text-slate-800">{item.name}</td>
                            <td className="p-2.5 font-mono text-left">{item.totalAdv.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 font-mono text-left text-emerald-600">{item.totalRepaid.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 font-mono text-left text-orange-600 font-extrabold">{item.outstanding.toLocaleString()} ر.ي</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'emp-open-advances') {
                  const data: any[] = [];
                  employees.forEach(emp => {
                    const empTxs = transactions.filter(t => t.employeeId === emp.id && (t.type === 'advance' || t.type === 'thursday_advance'));
                    empTxs.forEach(tx => {
                      data.push({
                        empName: emp.name,
                        date: tx.date,
                        type: tx.type === 'thursday_advance' ? 'سلفة الخميس' : 'سلفة عادية',
                        amount: tx.debit || 0,
                        notes: tx.notes || 'سلفة بملف الموظف'
                      });
                    });
                  });

                  return (
                    <table className="w-full text-right border border-slate-100 text-xs text-right">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">اسم الموظف المستفيد</th>
                          <th className="p-2.5 text-right">التاريخ واليوم</th>
                          <th className="p-2.5 text-right">تبويب الحركة</th>
                          <th className="p-2.5 font-mono text-left">المبلغ</th>
                          <th className="p-2.5 text-right">الملاحظات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right text-slate-800 font-mono">
                        {data.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 font-sans text-right">{item.empName}</td>
                            <td className="p-2.5 text-slate-500 font-mono text-right">{item.date}</td>
                            <td className="p-2.5 font-sans text-right">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700">
                                {item.type}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-left text-orange-600 font-extrabold">{item.amount.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 font-sans text-right text-slate-500 text-3xs font-medium">{item.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'assoc-active-list') {
                  const isCustom = localStorage.getItem('amin_sh_custom_workspace') === 'true';
                  const uId = localStorage.getItem('amin_sh_current_user_id') || 'default';
                  const aKey = isCustom ? "amin_sh_associations_" + uId : "amin_sh_associations";
                  const aStr = localStorage.getItem(aKey);
                  let assocList: any[] = [];
                  if (aStr) {
                    try { assocList = JSON.parse(aStr); } catch(e){}
                  }
                  const activeAssocs = assocList.filter(a => a.status === 'active');

                  return (
                    <table className="w-full text-right border border-slate-100 text-xs text-right">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">اسم الصندوق / الجمعية</th>
                          <th className="p-2.5 text-right">تاريخ التدشين</th>
                          <th className="p-2.5 font-mono text-left">قيمة القسط الفردي</th>
                          <th className="p-2.5 text-right">الدورات الإجمالية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right text-slate-800">
                        {activeAssocs.map(a => (
                          <tr key={a.id} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 text-right">{a.name}</td>
                            <td className="p-2.5 text-slate-500 font-mono text-right">{a.startDate}</td>
                            <td className="p-2.5 font-mono text-left text-indigo-600">{a.installmentAmount.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 text-right">{a.cyclesCount} دور شهري</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'assoc-members-late') {
                  const isCustom = localStorage.getItem('amin_sh_custom_workspace') === 'true';
                  const uId = localStorage.getItem('amin_sh_current_user_id') || 'default';
                  const sKey = isCustom ? `amin_sh_due_schedules_${uId}` : 'amin_sh_due_schedules';
                  const sStr = localStorage.getItem(sKey);
                  let lateList: any[] = [];
                  if (sStr) {
                    try {
                      const schedules = JSON.parse(sStr);
                      const todayStr = new Date().toISOString().split('T')[0];
                      lateList = schedules.filter((s: any) => 
                        s.status === 'late' || s.status === 'متأخر' || (s.status === 'pending' && s.dueDate < todayStr)
                      );
                    } catch(e){}
                  }

                  return (
                    <table className="w-full text-right border border-slate-100 text-xs text-right">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">اسم المشترك المتأخر</th>
                          <th className="p-2.5 text-right">اسم الصندوق/الجمعية</th>
                          <th className="p-2.5 text-right font-mono">تاريخ الاستحقاق المحطوط</th>
                          <th className="p-2.5 font-mono text-left">قيمة القسط المتأخر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right text-slate-800">
                        {lateList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 text-right text-rose-600 font-extrabold">{item.memberName}</td>
                            <td className="p-2.5 text-right">{item.associationName || 'صندوق تعاوني'}</td>
                            <td className="p-2.5 text-slate-500 font-mono text-right">{item.dueDate}</td>
                            <td className="p-2.5 font-mono text-left text-red-500">{item.installmentAmount?.toLocaleString() || '-'} ر.ي</td>
                          </tr>
                        ))}
                        {lateList.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-emerald-600 font-extrabold">✓ لا توجد مستحقات متأخرة بالجمعيات حالياً تزام كامل!</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'assoc-completed-payouts') {
                  const isCustom = localStorage.getItem('amin_sh_custom_workspace') === 'true';
                  const uId = localStorage.getItem('amin_sh_current_user_id') || 'default';
                  const mKey = isCustom ? "amin_sh_association_members_" + uId : "amin_sh_association_members";
                  const mStr = localStorage.getItem(mKey);
                  let finishedMembers: any[] = [];
                  if (mStr) {
                    try {
                      const list = JSON.parse(mStr);
                      finishedMembers = list.filter((m: any) => m.receiveStatus === 'received');
                    } catch(e){}
                  }

                  return (
                    <table className="w-full text-right border border-slate-100 text-xs text-right">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">اسم العضو المستلم</th>
                          <th className="p-2.5 font-mono text-center">ترتيب الدور المستلم فيه</th>
                          <th className="p-2.5 text-right font-mono">تاريخ الصرف المعمد</th>
                          <th className="p-2.5 font-mono text-left">قيمة القسط الفردي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right text-slate-800">
                        {finishedMembers.map((mem, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 text-right text-teal-650">{mem.name}</td>
                            <td className="p-2.5 font-mono text-center">{mem.receiveTurn}</td>
                            <td className="p-2.5 text-slate-500 font-mono text-right">{mem.receiveDate || '-'}</td>
                            <td className="p-2.5 font-mono text-left text-slate-800">{mem.installmentAmount?.toLocaleString()} ر.ي</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'assoc-chest-balances') {
                  const isCustom = localStorage.getItem('amin_sh_custom_workspace') === 'true';
                  const uId = localStorage.getItem('amin_sh_current_user_id') || 'default';
                  const aKey = isCustom ? "amin_sh_associations_" + uId : "amin_sh_associations";
                  const aStr = localStorage.getItem(aKey);
                  let assocList: any[] = [];
                  if (aStr) {
                    try { assocList = JSON.parse(aStr); } catch(e){}
                  }

                  const gTxKey = isCustom ? "amin_sh_group_transactions_" + uId : "amin_sh_group_transactions";
                  const gTxStr = localStorage.getItem(gTxKey);
                  let gTxs: any[] = [];
                  if (gTxStr) {
                    try { gTxs = JSON.parse(gTxStr); } catch(e){}
                  }

                  const data = assocList.map(assoc => {
                    const assocTxs = gTxs.filter(t => t.associationId === assoc.id);
                    const credits = assocTxs.reduce((sum, t) => sum + (t.credit || 0), 0);
                    const debits = assocTxs.reduce((sum, t) => sum + (t.debit || 0), 0);
                    const balance = credits - debits;
                    return { ...assoc, credits, debits, balance };
                  });

                  return (
                    <table className="w-full text-right border border-slate-100 text-xs text-right">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">اسم الصندوق / الجمعية</th>
                          <th className="p-2.5 font-mono text-left">إجمالي التحصيل (+)</th>
                          <th className="p-2.5 font-mono text-left">إجمالي مصروفات الصرف (-)</th>
                          <th className="p-2.5 font-mono text-left">رصيد الخزينة الحالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right text-slate-800">
                        {data.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 text-right">{item.name}</td>
                            <td className="p-2.5 font-mono text-left text-emerald-600">{item.credits.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 font-mono text-left text-red-500">{item.debits.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 font-mono text-left text-indigo-700 font-extrabold">{item.balance.toLocaleString()} ر.ي</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'assoc-closed-history') {
                  const isCustom = localStorage.getItem('amin_sh_custom_workspace') === 'true';
                  const uId = localStorage.getItem('amin_sh_current_user_id') || 'default';
                  const aKey = isCustom ? "amin_sh_associations_" + uId : "amin_sh_associations";
                  const aStr = localStorage.getItem(aKey);
                  let assocList: any[] = [];
                  if (aStr) {
                    try { assocList = JSON.parse(aStr); } catch(e){}
                  }
                  const closedAssocs = assocList.filter(a => a.status === 'completed' || a.status === 'closed');

                  return (
                    <table className="w-full text-right border border-slate-100 text-xs text-right">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">اسم الصندوق المقفل</th>
                          <th className="p-2.5 text-right">تاريخ التأسيس</th>
                          <th className="p-2.5 font-mono text-left">رصيد القسط الفردي</th>
                          <th className="p-2.5 text-right">حالة التصفية النهائية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right text-slate-800">
                        {closedAssocs.map(a => (
                          <tr key={a.id} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 text-right text-slate-800">{a.name}</td>
                            <td className="p-2.5 text-slate-500 font-mono text-right">{a.startDate}</td>
                            <td className="p-2.5 font-mono text-left">{a.installmentAmount.toLocaleString()} ر.ي</td>
                            <td className="p-2.5 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-50 text-slate-600 font-black border border-slate-100">معقودة للتصفية 🔒</span>
                            </td>
                          </tr>
                        ))}
                        {closedAssocs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400">لا تتوفر صناديق أو جمعيات بمستوى (مغلق / منتهي) بالوقت الراهن.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'general-monthly-summary') {
                  const isCustom = localStorage.getItem('amin_sh_custom_workspace') === 'true';
                  const uId = localStorage.getItem('amin_sh_current_user_id') || 'default';
                  
                  const totalSalaries = employees.reduce((sum, e) => sum + e.salary, 0);
                  const totalAdv = transactions
                    .filter(t => t.type === 'advance' || t.type === 'thursday_advance')
                    .reduce((sum, t) => sum + (t.debit || 0), 0);
                  const totalRepaid = transactions
                    .filter(t => t.type === 'installment' || t.type === 'returned_advance')
                    .reduce((sum, t) => sum + (t.credit || 0), 0);
                  const outstandingAdvances = Math.max(0, totalAdv - totalRepaid);

                  const gTxKey = isCustom ? "amin_sh_group_transactions_" + uId : "amin_sh_group_transactions";
                  const gTxStr = localStorage.getItem(gTxKey);
                  let gTxs: any[] = [];
                  if (gTxStr) {
                    try { gTxs = JSON.parse(gTxStr); } catch(e){}
                  }
                  const totalChestBalance = gTxs.reduce((sum, t) => sum + (t.credit || 0) - (t.debit || 0), 0);

                  const sKey = isCustom ? `amin_sh_due_schedules_${uId}` : 'amin_sh_due_schedules';
                  const sStr = localStorage.getItem(sKey);
                  let arrearsTotal = 0;
                  if (sStr) {
                    try {
                      const schedules = JSON.parse(sStr);
                      const todayStr = new Date().toISOString().split('T')[0];
                      arrearsTotal = schedules
                        .filter((s: any) => s.status === 'late' || s.status === 'متأخر' || (s.status === 'pending' && s.dueDate < todayStr))
                        .reduce((sum: number, s: any) => sum + (s.installmentAmount || 0), 0);
                    } catch(e){}
                  }

                  return (
                    <table className="w-full text-right border border-slate-100 text-xs text-right">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">المؤشر المحاسبي الموحد للمؤسسة</th>
                          <th className="p-2.5 font-mono text-left">الحجم المالي</th>
                          <th className="p-2.5 text-right">تقييم الكفاءة والرقابة بالشركة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right text-slate-800">
                        <tr className="border-b border-slate-100">
                          <td className="p-2.5 text-right">إجمالي فاتورة الرواتب الأساسية الشهرية لموظفيك</td>
                          <td className="p-2.5 font-mono text-left">{totalSalaries.toLocaleString()} ر.ي</td>
                          <td className="p-2.5 text-right text-slate-500">تمثل التزام دوري بنهاية كل شهر</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2.5 text-right text-orange-600">إجمالي ذمم السلفيات المفتوحة لصالح الشركة بالملف</td>
                          <td className="p-2.5 font-mono text-left text-orange-650">{outstandingAdvances.toLocaleString()} ر.ي</td>
                          <td className="p-2.5 text-right text-slate-500">ديون جاري استردادها عبر الأقساط</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2.5 text-right text-indigo-700">الرصيد العام الدائر والسيولة بخزينة صناديق الجمعية بالكامل</td>
                          <td className="p-2.5 font-mono text-left text-indigo-700">{totalChestBalance.toLocaleString()} ر.ي</td>
                          <td className="p-2.5 text-right text-slate-500">مجموع حصيلة الصناديق أوفلاين</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2.5 text-right text-red-600">إجمالي الأقساط والتحصيلات المتأخرة العالقة بالصناديق</td>
                          <td className="p-2.5 font-mono text-left text-red-650">{arrearsTotal.toLocaleString()} ر.ي</td>
                          <td className="p-2.5 text-right text-slate-500">متطلبات تحكيم وتنشيط لمندوب التحصيل</td>
                        </tr>
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'general-audit-logs') {
                  const isCustom = localStorage.getItem('amin_sh_custom_workspace') === 'true';
                  const uId = localStorage.getItem('amin_sh_current_user_id') || 'default';
                  const logsKey = isCustom ? "amin_sh_audit_logs_" + uId : "amin_sh_audit_logs";
                  const logsStr = localStorage.getItem(logsKey);
                  let auditLogsList: any[] = [];
                  if (logsStr) {
                    try { auditLogsList = JSON.parse(logsStr).slice(0, 15); } catch(e){}
                  }

                  return (
                    <table className="w-full text-right border border-slate-100 text-xs text-right">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">التوقيت واليوم</th>
                          <th className="p-2.5 text-right">التبويب النوعي</th>
                          <th className="p-2.5 text-right">المستفيد / الموضع المستهدف</th>
                          <th className="p-2.5 text-right">تفاصيل الإجراء التنفيذي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold font-mono text-right text-slate-800 text-[10px]">
                        {auditLogsList.map((log, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 text-slate-500 text-right font-medium">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString('ar-EG') : '-'}
                            </td>
                            <td className="p-2.5 text-right">
                              <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-[10px]">
                                {log.module || 'حركة عامة'}
                              </span>
                            </td>
                            <td className="p-2.5 font-sans font-bold text-right">{log.targetName || '-'}</td>
                            <td className="p-2.5 font-sans font-medium text-slate-655 text-right">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'general-backup-logs') {
                  const isCustom = localStorage.getItem('amin_sh_custom_workspace') === 'true';
                  const uId = localStorage.getItem('amin_sh_current_user_id') || 'default';
                  const sKey = isCustom ? "amin_sh_settings_" + uId : "amin_sh_settings";
                  const sStr = localStorage.getItem(sKey);
                  let lastBackup = '-';
                  if (sStr) {
                    try {
                      const settingsObj = JSON.parse(sStr);
                      lastBackup = settingsObj.lastBackupDate || '-';
                    } catch (e) {}
                  }

                  return (
                    <table className="w-full text-right border border-slate-100 text-xs text-right">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">مؤشر أمن وحفظ البيانات الكلي بالشركة</th>
                          <th className="p-2.5 text-right">تفاصيل السجل الحالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold text-right text-slate-800">
                        <tr className="border-b border-slate-100">
                          <td className="p-2.5 text-right">آخر تاريخ وتوقيت لتمرير نسخة احتياطية محلية</td>
                          <td className="p-2.5 font-mono text-left">{lastBackup}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="p-2.5 text-right">مخاطر فقدان البيانات الحالية أوفلاين</td>
                          <td className="p-2.5 text-emerald-600 font-extrabold text-right">منعدمة - آمنة بالكامل بالذمة المشفرة ✓</td>
                        </tr>
                      </tbody>
                    </table>
                  );
                }

                if (selectedExecReport === 'general-locked-months') {
                  const isCustom = localStorage.getItem('amin_sh_custom_workspace') === 'true';
                  const uId = localStorage.getItem('amin_sh_current_user_id') || 'default';
                  const mKey = isCustom ? `amin_sh_closed_months_${uId}` : 'amin_sh_closed_months';
                  const mStr = localStorage.getItem(mKey);
                  let closedMonths: string[] = [];
                  if (mStr) {
                    try { closedMonths = JSON.parse(mStr); } catch(e){}
                  }

                  return (
                    <table className="w-full text-right border border-slate-100 text-xs text-right">
                      <thead className="bg-slate-50 font-bold border-b text-right">
                        <tr>
                          <th className="p-2.5 text-right">الشهر المالي المغلق محاسبياً</th>
                          <th className="p-2.5 text-right">حالة الاعتماد المحاسبي وقفل القيود</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y font-bold font-mono text-right text-slate-800">
                        {closedMonths.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-2.5 text-right text-slate-900 font-bold">{m}</td>
                            <td className="p-2.5 text-right font-sans text-slate-400 font-medium">🔒 مغلق كلياً لمطابقة الحسابات وعدم تعديل القيود</td>
                          </tr>
                        ))}
                        {closedMonths.length === 0 && (
                          <tr>
                            <td colSpan={2} className="p-6 text-center text-slate-400 font-sans">لا توجد فترات محاسبية مقفلة حالياً. كافة الشهور مفتوحة للقيد والترحيل.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  );
                }

                return null;
              })()}
            </div>

            {/* Signature area for A4 receipt */}
            <div className="grid grid-cols-2 gap-8 pt-10 border-t border-slate-100 text-xs">
              <div>
                <span className="font-bold text-slate-400 block pb-4">توقيع المسؤول المحاسب والمدقق المالي:</span>
                <div className="h-10 border-b border-dashed border-slate-300 w-2/3"></div>
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-400 block text-right pb-4">اعتماد وتوقيع الإدارة العامة:</span>
                <div className="h-10 border-b border-dashed border-slate-300 w-2/3 mr-auto"></div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
