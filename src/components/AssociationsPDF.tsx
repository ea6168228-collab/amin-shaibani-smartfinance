import React, { useState } from 'react';
import { Association, AssociationMember, AssociationTransaction, AssociationPayment, AppSettings } from '../types';
import { isNativeCapacitor, saveAndSharePdf } from '../utils/capacitorAndroidHelper';
import { Printer, X, Download, FileText, CheckCircle, Info } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { computeSubscriberStats, computeManagerStats } from '../utils/associationHelpers';

interface AssociationsPDFProps {
  assoc: Association;
  members: AssociationMember[];
  txs: AssociationTransaction[];
  payments: AssociationPayment[];
  appSettings: AppSettings;
  loggedInUserName: string;
  onClose: () => void;
}

export default function AssociationsPDF({
  assoc,
  members,
  txs,
  payments,
  appSettings,
  loggedInUserName,
  onClose
}: AssociationsPDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');

  const todayStr = new Date().toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  const matchingTxs = txs.filter(t => t.associationId === assoc.id).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const matchingMembers = members.filter(m => m.associationId === assoc.id);

  const isManager = assoc.role === 'manager';
  const subStats = !isManager ? computeSubscriberStats(assoc, payments) : null;
  const manStats = isManager ? computeManagerStats(assoc, members, txs) : null;

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    setProgress('جاري تحضير القوالب والمخططات المحاسبية...');
    const originalGetComputedStyle = window.getComputedStyle;

    try {
      // Setup OKLCH and OKLAB to RGB conversions for html2canvas compatibility
      const convertCanvas = document.createElement('canvas');
      convertCanvas.width = 1;
      convertCanvas.height = 1;
      const convertCtx = convertCanvas.getContext('2d');
      const colorCache = new Map<string, string>();

      const convertColorToRgb = (colorStr: string): string => {
        if (colorCache.has(colorStr)) {
          return colorCache.get(colorStr)!;
        }
        try {
          if (!convertCtx) return '#ffffff';
          convertCtx.clearRect(0, 0, 1, 1);
          convertCtx.fillStyle = colorStr;
          convertCtx.fillRect(0, 0, 1, 1);
          const data = convertCtx.getImageData(0, 0, 1, 1).data;
          const alpha = Number((data[3] / 255).toFixed(3));
          const rgbStr = data[3] === 255 
            ? `rgb(${data[0]}, ${data[1]}, ${data[2]})`
            : `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${alpha})`;
          colorCache.set(colorStr, rgbStr);
          return rgbStr;
        } catch (e) {
          return '#ffffff';
        }
      };

      const replaceColorsInString = (val: string): string => {
        if (typeof val !== 'string' || (!val.includes('oklch') && !val.includes('oklab'))) {
          return val;
        }
        return val.replace(/(oklch|oklab)\([^)]+\)/g, (match) => {
          return convertColorToRgb(match);
        });
      };

      window.getComputedStyle = function(elt, pseudoElt) {
        const style = originalGetComputedStyle(elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop, receiver) {
            if (prop === 'getPropertyValue') {
              return function(propertyName: string) {
                const originalValue = target.getPropertyValue(propertyName);
                return replaceColorsInString(originalValue);
              };
            }
            const val = Reflect.get(target, prop);
            if (typeof val === 'string') return replaceColorsInString(val);
            if (typeof val === 'function') return val.bind(target);
            return val;
          }
        }) as any;
      };

      const element = document.getElementById('association-report-sheet');
      if (!element) throw new Error('Report template elements not found.');

      setProgress('جاري التقاط صورة من كشف الحساب المحاسبي...');
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      setProgress('جاري تشفير وتعميد مستند PDF...');
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      const fileName = `كشف_جمعية_${assoc.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      if (isNativeCapacitor()) {
        const dataUri = pdf.output('datauristring');
        await saveAndSharePdf(dataUri, fileName);
      } else {
        pdf.save(fileName);
      }

      setProgress('اكتمل التنزيل بنجاح!');
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      console.error(err);
      alert('يوجد خطأ أثناء توليد الـ PDF: ' + err?.message);
    } finally {
      window.getComputedStyle = originalGetComputedStyle;
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/8 w-full h-full flex items-center justify-center z-50 p-2 md:p-4 overflow-y-auto" id="pdf-export-modal">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-4xl p-4 md:p-6 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Controls Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800 no-print">
          <div className="flex items-center gap-2">
            <FileText className="text-indigo-600 dark:text-indigo-400" size={20} />
            <h3 className="font-black text-slate-900 dark:text-white text-sm md:text-base">تجهيز تقرير كشف الحساب والطباعة</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/10 flex items-center gap-1.5 transition-all cursor-pointer min-h-[38px] active:scale-95"
            >
              {isGenerating ? (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Download size={14} />
              )}
              <span>{isGenerating ? 'جاري التحضير...' : 'تنزيل مستند PDF 📥'}</span>
            </button>
            <button
              onClick={() => window.print()}
              disabled={isGenerating}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-805 dark:hover:bg-zinc-705 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer min-h-[38px]"
            >
              <Printer size={14} />
              <span>طباعة مباشرة 🖨️</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status Loading bar */}
        {isGenerating && (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-xs text-indigo-700 dark:text-indigo-300 font-bold mt-3 animate-pulse no-print flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>
            <span>{progress}</span>
          </div>
        )}

        {/* Printable Sheet */}
        <div className="flex-1 overflow-y-auto mt-4 p-2 md:p-4 bg-slate-100 dark:bg-zinc-950/50 rounded-xl shadow-inner border border-slate-200/50 dark:border-zinc-800/40">
          <div
            id="association-report-sheet"
            className="w-[210mm] min-h-[297mm] mx-auto bg-white p-[12mm] text-slate-900 font-sans shadow-lg relative border border-slate-300"
            style={{ direction: 'rtl' }}
          >
            {/* Elegant Header and Bordering line */}
            <div className="flex items-center justify-between border-b-2 border-indigo-605 pb-5">
              <div>
                <h1 className="text-xl font-black text-indigo-900 leading-none">
                  {appSettings.institution.name}
                </h1>
                <p className="text-xs text-slate-500 font-bold mt-1.5 flex items-center gap-1.5">
                  <span>العنوان: {appSettings.institution.address}</span>
                  <span>•</span>
                  <span>هاتف: {appSettings.institution.phone}</span>
                </p>
              </div>
              <div className="text-left font-mono">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-805 text-xs font-black rounded-lg">
                  مستند مالي معتمد
                </span>
                <p className="text-[10px] text-slate-500 mt-1">تاريخ الإنشاء: {todayStr}</p>
              </div>
            </div>

            {/* Document Title bar */}
            <div className="text-center my-6">
              <h2 className="text-lg font-black text-slate-900 underline underline-offset-8">
                سجل كشف حساب حركة: {assoc.name}
              </h2>
              <p className="text-xs text-indigo-700 font-bold mt-1">
                النوع: جمعية {assoc.type === 'daily' ? 'يومية' : assoc.type === 'weekly' ? 'أسبوعية' : 'شهرية'} ({assoc.role === 'manager' ? 'مدير الجمعية' : 'مشترك بالجمعية'})
              </p>
            </div>

            {/* General Ledger stats card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">مبلغ القسط الدورى</span>
                <span className="text-sm font-black text-indigo-900">
                  {assoc.installmentAmount.toLocaleString()} {appSettings.institution.currency}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">تاريخ بداية السريان</span>
                <span className="text-xs font-black text-slate-700">{assoc.startDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">عدد الحصص الإجمالي</span>
                <span className="text-sm font-black text-slate-800">{assoc.cyclesCount} دورة ومرحلة</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">الحجم المالي الإجمالي</span>
                <span className="text-sm font-black text-teal-700">
                  {assoc.totalAmount.toLocaleString()} {appSettings.institution.currency}
                </span>
              </div>
            </div>

            {/* Performance analysis block */}
            {!isManager && subStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 mb-6 text-sm">
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold block">إجمالي ما دفعته حتي الآن</span>
                  <span className="font-extrabold text-emerald-800">
                    {subStats.totalPaid.toLocaleString()} {appSettings.institution.currency}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold block">المتبقي المطلوب عليك</span>
                  <span className="font-extrabold text-rose-800">
                    {subStats.totalRemaining.toLocaleString()} {appSettings.institution.currency}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold block">الأقساط المدفوعة</span>
                  <span className="font-extrabold text-slate-700">
                    {subStats.paidCount} من أصل {assoc.cyclesCount}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 font-bold block">نسبة الإنجاز المحققة</span>
                  <span className="font-extrabold text-teal-800">{subStats.progressPercent}%</span>
                </div>
              </div>
            )}

            {isManager && manStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 mb-6 text-sm">
                <div>
                  <span className="text-[10px] text-indigo-600 font-bold block">رصيد الصندوق الحالي</span>
                  <span className="font-extrabold text-indigo-900">
                    {manStats.chestBalance.toLocaleString()} {appSettings.institution.currency}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-600 font-bold block">إجمالي المبالغ المحصلة</span>
                  <span className="font-extrabold text-emerald-800">
                    {manStats.totalCollected.toLocaleString()} {appSettings.institution.currency}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-600 font-bold block">مشتركين متأخرين</span>
                  <span className="font-extrabold text-rose-700">{manStats.membersWithLateCount} أعضاء</span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-600 font-bold block">من استلموا المستحق</span>
                  <span className="font-extrabold text-teal-800">
                    {manStats.receivedPayoutCount} من {manStats.activeMembersCount}
                  </span>
                </div>
              </div>
            )}

            {/* List of members if manager role */}
            {isManager && matchingMembers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-black text-rose-800 mb-2 border-r-4 border-rose-600 pr-2">
                  جدول كشف ملخص المشتركين ووضعهم المالي:
                </h3>
                <table className="w-full text-2xs text-right border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700">
                      <th className="border border-slate-200 p-2 font-bold w-12 text-center">الترتيب</th>
                      <th className="border border-slate-200 p-2 font-bold">اسم المشترك المعتمد</th>
                      <th className="border border-slate-200 p-2 font-bold text-center">تاريخ الانضمام</th>
                      <th className="border border-slate-200 p-2 font-bold text-center">رقم الهاتف</th>
                      <th className="border border-slate-200 p-2 font-bold text-center">حالة الاستلام</th>
                      <th className="border border-slate-200 p-2 font-bold text-center">الحالة الإدارية</th>
                      <th className="border border-slate-200 p-2 font-bold text-center">إجمالي المسدد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingMembers.map((m) => {
                      const mPayments = matchingTxs.filter(tx => tx.memberId === m.id && (tx.type === 'payment' || tx.type === 'late_payment'));
                      const mPaid = mPayments.reduce((sum, tx) => sum + tx.credit, 0);
                      const itemStatus = m.status || (m.receiveStatus === 'received' ? 'received' : 'regular');
                      const statusLabel = itemStatus === 'received' ? 'استلم دوره' : itemStatus === 'late' ? 'متأخر' : itemStatus === 'withdrawn' ? 'منسحب' : 'منتظم';

                      return (
                        <tr key={m.id} className="hover:bg-slate-50 hover:bg-opacity-50">
                          <td className="border border-slate-200 p-1.5 text-center font-bold font-mono">{m.receiveTurn}</td>
                          <td className="border border-slate-200 p-1.5 font-bold">{m.name}</td>
                          <td className="border border-slate-200 p-1.5 text-center font-mono text-slate-600">{m.joinedDate || m.receiveDate || assoc.startDate}</td>
                          <td className="border border-slate-200 p-1.5 text-center font-mono text-slate-600">{m.phone || 'غير مسجل'}</td>
                          <td className="border border-slate-200 p-1.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              m.receiveStatus === 'received' ? 'bg-emerald-100 text-emerald-805' : 'bg-amber-100 text-amber-805'
                            }`}>
                              {m.receiveStatus === 'received' ? `تم التسليم: (${m.receiveDate})` : 'بانتظار الاستلام'}
                            </span>
                          </td>
                          <td className="border border-slate-200 p-1.5 text-center font-bold text-slate-700">{statusLabel}</td>
                          <td className="border border-slate-200 p-1.5 text-center font-bold text-teal-850">
                            {mPaid.toLocaleString()} {appSettings.institution.currency}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Account Ledger Statements */}
            <div>
              <h3 className="text-xs font-black text-indigo-900 mb-2 border-r-4 border-indigo-650 pr-2">
                بيان سجل كشف حساب العمليات والقيود التفصيلية المعتمدة:
              </h3>
              {matchingTxs.length === 0 ? (
                <div className="py-6 border border-slate-150 rounded-xl text-center bg-slate-50 text-xs text-slate-400 font-bold">
                  لا توجد عمليات مقيدة مسجلة في كشف حساب هذه الجمعية حالياً.
                </div>
              ) : (
                <table className="w-full text-2xs text-right border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-indigo-950 text-white font-bold select-none text-[10px]">
                      <th className="border border-slate-200 p-2 w-24 text-center">التاريخ المالي</th>
                      <th className="border border-slate-200 p-2">البيان والتفاصيل المقيدة</th>
                      {isManager && <th className="border border-slate-200 p-2">المشترك</th>}
                      <th className="border border-slate-200 p-2 text-center w-14">الدورة</th>
                      <th className="border border-slate-200 p-2 text-center w-16">المدين (-)</th>
                      <th className="border border-slate-200 p-2 text-center w-16">الدائن (+)</th>
                      <th className="border border-slate-200 p-2 text-center w-20">الرصيد التراكمي</th>
                      <th className="border border-slate-200 p-2 text-center w-24">ملاحظات ووثائق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingTxs.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="border border-slate-200 p-1.5 text-center font-mono text-slate-600">{t.date}</td>
                        <td className="border border-slate-200 p-1.5 font-bold text-slate-800">{t.statement}</td>
                        {isManager && <td className="border border-slate-200 p-1.5 font-bold text-slate-600">{t.memberName || 'صندوق كلي'}</td>}
                        <td className="border border-slate-200 p-1.5 text-center font-mono font-bold text-slate-700">{t.cycleNumber || '-'}</td>
                        <td className="border border-slate-200 p-1.5 text-center font-bold text-rose-600">
                          {t.debit > 0 ? t.debit.toLocaleString() : '0'}
                        </td>
                        <td className="border border-slate-200 p-1.5 text-center font-bold text-emerald-600">
                          {t.credit > 0 ? t.credit.toLocaleString() : '0'}
                        </td>
                        <td className="border border-slate-200 p-1.5 text-center font-black font-mono text-indigo-900 bg-slate-50">
                          {t.balance.toLocaleString()} {appSettings.institution.currency}
                        </td>
                        <td className="border border-slate-200 p-1.5 font-sans text-[10px] text-slate-600">{t.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Signatures Footer */}
            <div className="absolute bottom-[15mm] left-[12mm] right-[12mm] border-t border-slate-200 pt-6 flex justify-between items-center text-xs">
              <div className="text-center font-bold">
                <p className="text-slate-400">توقيع المحاسب الجنائي المعتمد</p>
                <div className="h-10 w-28 border-b border-dashed border-slate-350 mx-auto mt-2"></div>
                <p className="text-slate-800 mt-1 font-mono text-2xs">{loggedInUserName}</p>
              </div>
              <div className="text-center font-bold">
                <p className="text-slate-400">توقيع وختم المسؤول عن الجمعية</p>
                <div className="h-10 w-28 border-b border-dashed border-slate-350 mx-auto mt-2"></div>
                <p className="text-slate-800 mt-1">{assoc.managerName || 'مسؤول الحساب'}</p>
              </div>
              <div className="text-center font-bold">
                <p className="text-slate-400">توقيع المشرف العام والتصديق</p>
                <div className="h-10 w-28 border-b border-dashed border-slate-350 mx-auto mt-2"></div>
              </div>
            </div>

          </div>
        </div>
        
      </div>
    </div>
  );
}
