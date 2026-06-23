import React, { useState } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  History, 
  FileCheck2, 
  UserSquare2,
  BrainCircuit,
  PieChart,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { Employee, Transaction, AIAnalysisResult, AppSettings } from '../types';

interface AIAssistantViewProps {
  employees: Employee[];
  transactions: Transaction[];
  appSettings: AppSettings;
  customCategories: string[];
}

export default function AIAssistantView({
  employees,
  transactions,
  appSettings,
  customCategories
}: AIAssistantViewProps) {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const triggerAIAudit = async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employees,
          transactions,
          currentMonth: new Date().toLocaleString('ar-YE', { month: 'long', year: 'numeric' }),
          customCategories
        })
      });

      if (!response.ok) {
        let errorMsg = 'فشل الاتصال بالخادم الذكي لإرسال التقييم المالي.';
        try {
          const errData = await response.json();
          if (errData && errData.details) {
            errorMsg = `فشل التحليل الذكي: ${errData.details}`;
          } else if (errData && errData.error) {
            errorMsg = `فشل التحليل الذكي: ${errData.error}`;
          }
        } catch (_) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (err: any) {
      console.error(err);
      setErrorStatus(err?.message || 'حدث خطأ مجهول أثناء فحص قيود الموظفين.');
    } finally {
      setLoading(false);
    }
  };

  // Pre-load or provide an initial helper prompt if no audit has been triggered
  const hasData = employees.length > 0 && transactions.length > 0;

  // Tiny custom markdown-to-html helper to avoid any build failures
  const renderSimpleMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return <h4 key={idx} className="text-sm font-bold text-indigo-950 dark:text-indigo-300 mt-4 mb-2 border-b border-indigo-100 dark:border-zinc-800 pb-1">{trimmed.replace('###', '').trim()}</h4>;
      }
      if (trimmed.startsWith('##')) {
        return <h3 key={idx} className="text-base font-extrabold text-slate-900 dark:text-white mt-4 mb-2">{trimmed.replace('##', '').trim()}</h3>;
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        // Render bullets with style
        return (
          <li key={idx} className="list-disc list-inside mr-2 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed mb-1.5 font-medium">
            {trimmed.substring(1).trim()}
          </li>
        );
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return <p key={idx} className="font-bold text-xs text-indigo-950 dark:text-white mt-2">{trimmed.replace(/\*\*/g, '').trim()}</p>;
      }
      return <p key={idx} className="text-xs text-slate-600 dark:text-zinc-400 mt-1.5 leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BrainCircuit className="text-indigo-500" size={24} />
            <span>مساعد التدقيق المالي وخبير الحسابات الذكي "أمين الخبير"</span>
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1">
            تقوم خوارزميات الذكاء الاصطناعي بفحص القيود والأقساط ومطابقة الرواتب لتقديم تقارير مراجعة ذكية وتنبيهات تنظيمية خالية من الأخطاء البشرية.
          </p>
        </div>

        {hasData && (
          <button
            onClick={triggerAIAudit}
            disabled={loading}
            className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 active:scale-95 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all self-start sm:self-auto"
          >
            <Sparkles size={16} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'يجري مراجعة قيود الموظفين حالياً...' : 'تشغيل محرك الفحص والتدقيق المالي ✨'}</span>
          </button>
        )}
      </div>

      {errorStatus && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-2.5 border border-red-100 dark:border-red-900/40">
          <AlertCircle size={18} />
          <span>{errorStatus}</span>
        </div>
      )}

      {/* Main Intelligent Report Container */}
      {loading ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center gap-4 animate-pulse">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-indigo-200 dark:border-indigo-950 border-t-indigo-600 animate-spin flex items-center justify-center"></div>
            <Sparkles className="absolute inset-0 m-auto text-indigo-500 animate-bounce" size={20} />
          </div>
          <div className="space-y-1.5">
            <p className="font-extrabold text-sm text-slate-900 dark:text-zinc-100">تحليل الحسابات وموازنة الأستاذ جارٍ...</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500">يقوم الذكاء الاصطناعي بمقارنة السحوبات مع الحدود الائتمانية ورصد مديونيات سلفة الخميس وتوليد ملخص تنفيذي مالي.</p>
          </div>
        </div>
      ) : analysisResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Diagnostic Badges) */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* 1. Accounting Discrepancies Counter (اكتشاف الأخطاء) */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-3xs">
              <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-500" />
                <span>أخطاء وتناقضات القيود ({analysisResult.discrepancies.length})</span>
              </span>
              <div className="mt-3.5 space-y-2">
                {analysisResult.discrepancies.map((err, i) => (
                  <div key={i} className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/15 border border-red-100/60 dark:border-red-950/50 text-[11px] text-red-700 dark:text-red-300 font-medium leading-relaxed">
                    {err}
                  </div>
                ))}
                {analysisResult.discrepancies.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 italic">لا توجد أخطاء إملائية أو قيم صفرية متباينة في القيود الحالية.</p>
                )}
              </div>
            </div>

            {/* 2. Anomalies Detects (عمليات غير طبيعية) */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-3xs">
              <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>سحوبات وعمليات غير اعتيادية ({analysisResult.anomalies.length})</span>
              </span>
              <div className="mt-3.5 space-y-2">
                {analysisResult.anomalies.map((an, i) => (
                  <div key={i} className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/15 border border-amber-100/60 dark:border-amber-950/50 text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
                    {an}
                  </div>
                ))}
                {analysisResult.anomalies.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 italic">جميع عمليات السحب تندرج تحت القياس الطبيعي.</p>
                )}
              </div>
            </div>

            {/* 3. Recursive deductions recommendations (اقتراح الخصومات المتكررة) */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-3xs">
              <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider flex items-center gap-1.5">
                <History size={14} />
                <span>اقتراح خصومات وسلف دورية متكررة</span>
              </span>
              <div className="mt-3.5 space-y-2">
                {analysisResult.recursiveDeductions.map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg bg-indigo-50/55 dark:bg-indigo-950/25 border border-indigo-100/60 dark:border-indigo-950/50 text-[11px] text-indigo-800 dark:text-indigo-300 font-medium leading-relaxed">
                    {rec}
                  </div>
                ))}
                {analysisResult.recursiveDeductions.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 italic">لم تظهر حركات اقتطاع دورية مكررة متباعدة بشكل روتيني غير معزز.</p>
                )}
              </div>
            </div>

          </div>

          {/* Right Column (Comprehensive executive briefs - markdown) */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Expense breakdown text summary */}
            <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-zinc-900 dark:to-zinc-950 p-5 rounded-2xl border border-indigo-100/40 dark:border-zinc-800 shadow-3xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart size={16} className="text-indigo-500" />
                <span>تحليل النفقات والتدفقات النقدية</span>
              </h3>
              <p className="text-xs text-slate-700 dark:text-zinc-300 mt-2.5 leading-relaxed font-medium">
                {analysisResult.expenseSummary}
              </p>
            </div>

            {/* Comprehensive Executive Monthly markdown overview */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-3xs leading-relaxed">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 block mb-2-b pb-1 flex items-center gap-1.5">
                <FileCheck2 size={14} className="text-emerald-500" />
                <span>التقرير والملخص الإداري المحتسب تلقائياً</span>
              </span>
              
              <div className="prose prose-sm dark:prose-invert">
                {renderSimpleMarkdown(analysisResult.monthlySummaryMarkdown)}
              </div>
            </div>

            {/* Quick Audit certification badge */}
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-emerald-800 dark:text-emerald-400 select-none">
              <FileCheck2 size={24} className="text-emerald-600 flex-shrink-0" />
              <div>
                <span className="block text-xs font-bold text-emerald-900 dark:text-emerald-300 leading-none">مكتمل الفحص والاعتماد الذكي</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-1 block">تم فحص الكشوفات المالية ومقارنة المعايير. تم توليد هذا المحتوى آلياً بناءً على السجلات المسجلة وتاريخ الموظف المتراكم.</span>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-8 text-center shadow-xs flex flex-col items-center justify-center gap-4 max-w-2xl mx-auto py-12">
          <div className="h-16 w-16 rounded-full bg-indigo-50 dark:bg-indigo-950/45 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Sparkles size={32} />
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">هل ترغب بتدشين المراجعة الذكية للشركة؟</h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-md mx-auto leading-relaxed">
              سيتولى المساعد أمين فحص جميع رواتب الموظفين وقيود حركات الخميس، ملابس العيد، سحوبات السلف والأقساط، وتحذيرك من وجود غيابات متكررة بلا عذر مكتوب.
            </p>
          </div>

          {hasData ? (
            <button
              onClick={triggerAIAudit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 transition-all text-center"
            >
              <Sparkles size={14} />
              <span>ابدأ مراجعة الحسابات الفورية الآن ✨</span>
            </button>
          ) : (
            <p className="text-[11px] text-red-500 font-bold">
              * يرجى إدخال موظفين نشطين وحركات مالية مسجلة بالدفتر أولاً لتفعيل محرك التدقيق المحاسبي الموجه.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
