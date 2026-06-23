import React, { useState, useEffect } from 'react';
import { isNativeCapacitor, saveAndSharePdf } from '../utils/capacitorAndroidHelper';
import { 
  Printer, 
  Share2, 
  Sliders, 
  Calendar, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle,
  HelpCircle,
  Mail,
  MessageCircle,
  BookOpen,
  Download,
  ShieldCheck,
  Save,
  FileDown,
  Eye,
  Loader2,
  Share,
  Send,
  FileSpreadsheet,
  FolderClosed,
  Activity,
  Check,
  Trash2,
  Info,
  ChevronRight,
  Globe
} from 'lucide-react';
import { Employee, Transaction, TransactionType, AppSettings } from '../types';
import { ExecutiveReportsView } from './ExecutiveReportsView';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Area
} from 'recharts';

interface ReportsViewProps {
  employees: Employee[];
  transactions: Transaction[];
  appSettings: AppSettings;
}

interface SavedReport {
  id: string;
  fileName: string;
  filePath: string;
  employeeName: string;
  period: string;
  createdAt: string;
  fileSize: string;
  orientation: 'portrait' | 'landscape';
  filters: {
    employeeId: string;
    reportType: string;
    selectedMonth: string;
    selectedYear: number;
    dateFrom: string;
    dateTo: string;
  };
}

export default function ReportsView({
  employees,
  transactions,
  appSettings
}: ReportsViewProps) {
  const [reportType, setReportType] = useState<'monthly' | 'annual' | 'custom'>('monthly');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [dateFrom, setDateFrom] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // PDF Layout configurations
  const [layoutOrientation, setLayoutOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [activeTab, setActiveTab] = useState<'preview' | 'analytics' | 'archive' | 'executive'>('preview');
  const [selectedExecReport, setSelectedExecReport] = useState<string | null>(null);
  const [selectedChartMonth, setSelectedChartMonth] = useState<string | null>(null);
  
  // PDF Generation States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Share Dialog State
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  
  // Saved Reports state loaded from local storage
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  // Load saved reports
  useEffect(() => {
    const saved = localStorage.getItem('amin_sh_saved_pdf_reports');
    if (saved) {
      try {
        setSavedReports(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved reports", e);
      }
    }
  }, []);

  // Handle auto employee selection on load
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees]);

  // Toast Auto-dismiss
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const currentEmployee = employees.find(e => e.id === selectedEmployeeId);

  const MONTHS_AR = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  // Calculate monthly stats for the current employee in selectedYear
  const getMonthlyChartData = () => {
    if (!selectedEmployeeId) return [];
    return MONTHS_AR.map((monthName, index) => {
      const monthNum = index + 1;
      const monthStr = `${selectedYear}-${String(monthNum).padStart(2, '0')}`;
      const monthTx = transactions.filter(t => 
        t.employeeId === selectedEmployeeId && 
        t.date.startsWith(monthStr)
      );

      const credits = monthTx.reduce((sum, t) => sum + (t.credit || 0), 0);
      const debits = monthTx.reduce((sum, t) => sum + (t.debit || 0), 0);
      const net = credits - debits;

      return {
        name: monthName,
        monthKey: monthStr,
        'الرواتب والمستحقات': credits,
        'الخصوميات والمسحوبات': debits,
        'الصافي المتبقي': net,
        txCount: monthTx.length,
        transactions: monthTx
      };
    });
  };

  const chartData = getMonthlyChartData();

  // Find peak months
  const peakSalaryMonth = chartData.length > 0 ? [...chartData].sort((a, b) => b['الرواتب والمستحقات'] - a['الرواتب والمستحقات'])[0] : null;
  const peakDeductionMonth = chartData.length > 0 ? [...chartData].sort((a, b) => b['الخصوميات والمسحوبات'] - a['الخصوميات والمسحوبات'])[0] : null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-950 p-3.5 border border-slate-150 dark:border-zinc-805 rounded-xl shadow-xl space-y-2 text-right">
          <p className="text-2xs font-extrabold text-slate-800 dark:text-zinc-100 border-b border-slate-100 dark:border-zinc-900 pb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => {
            const labelName = entry.name;
            const val = entry.value;
            const dotColor = entry.color || entry.fill;
            return (
              <div key={index} className="flex items-center justify-between gap-8 font-bold text-3xs">
                <span className="flex items-center gap-1.5" style={{ color: dotColor }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                  <span>{labelName}:</span>
                </span>
                <span className="font-mono text-slate-900 dark:text-white">{val.toLocaleString()} ر.ي</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Filter and compute report transactions based on selection
  const getReportData = () => {
    let list = [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. Employee Filter
    if (selectedEmployeeId) {
      list = list.filter(t => t.employeeId === selectedEmployeeId);
    }

    // 2. Date / Period Filters
    if (reportType === 'monthly') {
      list = list.filter(t => t.date.startsWith(selectedMonth));
    } else if (reportType === 'annual') {
      list = list.filter(t => t.date.startsWith(String(selectedYear)));
    } else {
      // Custom Range
      list = list.filter(t => t.date >= dateFrom && t.date <= dateTo);
    }

    // Compute running balance for this set
    let runBal = 0;
    return list.map(tx => {
      runBal = runBal + (tx.credit || 0) - (tx.debit || 0);
      return {
        ...tx,
        balance: runBal
      };
    });
  };

  const reportList = getReportData();

  // Calculations for summary card
  const totalSalariesCredited = reportList.reduce((sum, tx) => sum + (tx.type === TransactionType.SALARY ? tx.credit : 0), 0);
  const totalAdvancesTaken = reportList.reduce((sum, tx) => sum + ([TransactionType.ADVANCE, TransactionType.THURSDAY_ADVANCE, TransactionType.INSTALLMENT, TransactionType.CUSTODY].includes(tx.type as TransactionType) ? tx.debit : 0), 0);
  const totalDeductionsMade = reportList.reduce((sum, tx) => sum + ([TransactionType.DEDUCTION, TransactionType.ABSENCE].includes(tx.type as TransactionType) ? tx.debit : 0), 0);
  const totalBonusesAdded = reportList.reduce((sum, tx) => sum + (tx.type === TransactionType.BONUS ? tx.credit : 0), 0);
  const totalDebits = reportList.reduce((sum, tx) => sum + tx.debit, 0);
  const totalCredits = reportList.reduce((sum, tx) => sum + tx.credit, 0);

  const basicSalaryOfEmp = currentEmployee ? currentEmployee.salary : 0;
  const netDueSalary = totalCredits - totalDebits;

  // Direct trigger to execute browser layout printing
  const handlePrint = () => {
    window.print();
  };

  // Generate a text representation of the report for quick sharing on Mobile (WhatsApp/Email/Telegram)
  const generateShareText = () => {
    if (!currentEmployee) return '';
    const inst = appSettings.institution;
    const dateText = reportType === 'monthly' ? selectedMonth : reportType === 'annual' ? selectedYear : `${dateFrom} إلى ${dateTo}`;
    
    return `*كشف مالي رسمي - ${inst.name}*\n` +
      `----------------------------------------\n` +
      `*اسم الموظف:* ${currentEmployee.name}\n` +
      `*رقم الهوية:* ${currentEmployee.id}\n` +
      `*الوظيفة:* ${currentEmployee.jobTitle}\n` +
      `*الفترة المالية:* ${dateText}\n` +
      `----------------------------------------\n` +
      `*الراتب الأساسي:* ${basicSalaryOfEmp.toLocaleString()} ر.ي\n` +
      `*إجمالي السحوبات والسلف:* ${totalAdvancesTaken.toLocaleString()} ر.ي\n` +
      `*إجمالي الخصومات والغياب:* ${totalDeductionsMade.toLocaleString()} ر.ي\n` +
      `*إجمالي المكافآت والبدلات المضافة:* ${totalBonusesAdded.toLocaleString()} ر.ي\n` +
      `----------------------------------------\n` +
      `*إجمالي المقبوض (دائن):* ${totalCredits.toLocaleString()} ر.ي\n` +
      `*إجمالي المسحوب (مدين):* ${totalDebits.toLocaleString()} ر.ي\n` +
      `*الصافي النهائي المستحق الصرف:* ${netDueSalary.toLocaleString()} ر.ي\n\n` +
      `_تم التصدير والاستخراج تلقائياً من نظام أمين الشيباني الذكي_`;
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://telegram.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${text}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`كشف حساب الموظف: ${currentEmployee?.name || ''}`);
    const body = encodeURIComponent(generateShareText());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `كشف راتب ${currentEmployee?.name}`,
          text: generateShareText(),
          url: window.location.href
        });
      } catch (err) {
        console.log('User cancelled or web share issue', err);
      }
    } else {
      setToast({
        show: true,
        message: "⚠️ ميزة المشاركة التلقائية غير مدعومة على متصفحك الحالي، يمكنك استخدام الواتساب أو الإيميل ومهمتنا تسهيل ذلك!",
        type: 'info'
      });
    }
  };

  // Save PDF to archive / Local download
  const handleExportPDF = (saveToArchive: boolean = false) => {
    generateMultipagePDF(saveToArchive);
  };

  // Export to Excel / CSV format opened natively inside Microsoft Excel
  const handleExportCSV = () => {
    if (!currentEmployee) return;
    const headers = ["رقم الحركة", "تاريخ الحركة", "نوع الحركة", "البيان والشرح التفصيلي", "مدين (سحب/خصم)", "دائن (مرتب/مكافأة)", "الرصيد الجاري"];
    const rows = reportList.map(tx => [
      tx.id,
      tx.date,
      tx.type === TransactionType.SALARY ? 'راتب' : tx.type === TransactionType.ADVANCE ? 'سلفة' : tx.type === TransactionType.THURSDAY_ADVANCE ? 'سلفة خميس' : tx.type === TransactionType.DEDUCTION ? 'خصم مالي' : tx.type === TransactionType.BONUS ? 'مكافأة' : tx.type,
      tx.statement.replace(/,/g, ' - '),
      tx.debit,
      tx.credit,
      tx.balance
    ]);
    
    // Arabic Windows BOM support
    const headerLines = [
      [`نظام أمين الشيباني الذكي - كشف حساب مالي رسمي`],
      [`اسم المؤسسة: ${appSettings.institution.name}`],
      [`اسم الموظف الحسابي: ${currentEmployee.name} (رقم المعرف: ${currentEmployee.id})`],
      [`الوظيفة / القسم: ${currentEmployee.jobTitle}`],
      [`الفترة المالية المستخرجة: ${reportType === 'monthly' ? selectedMonth : reportType === 'annual' ? String(selectedYear) : `${dateFrom} إلى ${dateTo}`}`],
      [`تاريخ استخراج التقرير: ${new Date().toLocaleString('ar-YE')}`],
      [],
      headers,
      ...rows.map(r => r.map(c => String(c)))
    ];

    const csvContent = "\uFEFF" + headerLines.map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const sanitizedEmpName = currentEmployee.name.replace(/\s+/g, '_');
    const periodText = reportType === 'monthly' ? selectedMonth : reportType === 'annual' ? String(selectedYear) : 'مخصص';
    link.setAttribute("download", `كشف_حساب_${sanitizedEmpName}_${periodText}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setToast({
      show: true,
      message: "🟢 تم تصدير ملفات Excel CSV بنجاح وبدقة محاسبية كاملة!",
      type: 'success'
    });
  };

  // Core multipage generator using sequential high-DPI canvas slices
  const generateMultipagePDF = async (saveToArchive: boolean = false) => {
    if (!currentEmployee) return;
    
    setIsGenerating(true);
    setProgressMessage("جاري تجميع البيانات والتحقق من التناسق الهيكلي...");
    
    const originalGetComputedStyle = window.getComputedStyle;
    
    try {
      // Small timeout to allow the browser to draw perfectly
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pageElements = document.querySelectorAll('[data-pdf-page]');
      if (pageElements.length === 0) {
        throw new Error("عذراً، لم تكتمل معاينة الصفحات. يرجى تفعيل اسم الموظف أولاً.");
      }

      // Safe oklch/oklab fallback converter
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
            if (typeof val === 'string') {
              return replaceColorsInString(val);
            }
            if (typeof val === 'function') {
              return val.bind(target);
            }
            return val;
          }
        }) as any;
      };
      
      const orient = layoutOrientation === 'portrait' ? 'p' : 'l';
      const pdf = new jsPDF({
        orientation: orient,
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const totalPagesToPrint = pageElements.length;
      
      for (let i = 0; i < totalPagesToPrint; i++) {
        setProgressMessage(`جاري نمذجة وتصوير الصفحة الحسابية المُرقّمة الصفية ${i + 1} من ${totalPagesToPrint}...`);
        
        const pageEl = pageElements[i] as HTMLElement;
        
        // Render at scale 2x for professional high density
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdfWidth = layoutOrientation === 'portrait' ? 210 : 297;
        const pdfHeight = layoutOrientation === 'portrait' ? 297 : 210;
        
        if (i > 0) {
          pdf.addPage([pdfWidth, pdfHeight], orient);
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }
      
      // Auto file naming scheme format: كشف_راتب_[اسم_الموظف]_[الشهر]_[السنة].pdf
      const sanitizedEmpName = currentEmployee.name.replace(/\s+/g, '_');
      let yearPart = String(selectedYear);
      let monthPart = 'الكامل';
      
      if (reportType === 'monthly') {
        const parts = selectedMonth.split('-');
        yearPart = parts[0];
        monthPart = parts[1];
      }
      
      const fileName = `كشف_راتب_${sanitizedEmpName}_${monthPart}_${yearPart}.pdf`;
      const docPath = `Documents/AminAlShaibaniSmartSystem/Reports/${fileName}`;
      
      setProgressMessage("جاري تعميد السند وتشفير مستند PDF المحمي الحسابي...");
      
      // Local download trigger or native Capacitor sharing
      if (isNativeCapacitor()) {
        const dataUri = pdf.output('datauristring');
        await saveAndSharePdf(dataUri, fileName);
      } else {
        pdf.save(fileName);
      }
      
      // Record into Virtual Archive
      if (saveToArchive) {
        const byteLength = pdf.output('arraybuffer').byteLength;
        const sizeEstimation = `${(byteLength / 1024).toFixed(1)} KB`;
        
        const newReportItem: SavedReport = {
          id: `REP-${Date.now()}`,
          fileName: fileName,
          filePath: docPath,
          employeeName: currentEmployee.name,
          period: reportType === 'monthly' ? selectedMonth : reportType === 'annual' ? String(selectedYear) : `${dateFrom} - ${dateTo}`,
          createdAt: new Date().toLocaleDateString('ar-YE') + " - " + new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
          fileSize: sizeEstimation,
          orientation: layoutOrientation,
          filters: {
            employeeId: selectedEmployeeId,
            reportType,
            selectedMonth,
            selectedYear,
            dateFrom,
            dateTo
          }
        };
        
        const updated = [newReportItem, ...savedReports];
        setSavedReports(updated);
        localStorage.setItem('amin_sh_saved_pdf_reports', JSON.stringify(updated));
        
        setToast({
          show: true,
          message: `💾 تم حفظ المستند الحسابي رسمياً في المجلد المستهدف:\n📂 ${docPath}\n(تم تنزيل النسخة محلياً بجهازك تلقائياً)`,
          type: 'success'
        });
      } else {
        setToast({
          show: true,
          message: `📄 تم تصدير كشف الحساب بنجاح كملف PDF:\n📊 ${fileName}`,
          type: 'success'
        });
      }
      
    } catch (err: any) {
      console.error(err);
      setToast({
        show: true,
        message: `❌ فشل استخراج التقرير الحسابي PDF: ${err.message || 'خطأ غير معرف'}`,
        type: 'error'
      });
    } finally {
      window.getComputedStyle = originalGetComputedStyle;
      setIsGenerating(false);
    }
  };

  // Restore filter to preview archived item again
  const handleLoadArchiveFilters = (archive: SavedReport) => {
    setSelectedEmployeeId(archive.filters.employeeId);
    setReportType(archive.filters.reportType as any);
    setSelectedMonth(archive.filters.selectedMonth);
    setSelectedYear(archive.filters.selectedYear);
    setDateFrom(archive.filters.dateFrom);
    setDateTo(archive.filters.dateTo);
    setLayoutOrientation(archive.orientation);
    setActiveTab('preview');
    
    setToast({
      show: true,
      message: `📄 تم استدعاء ومعاينة قيد الأرشيف الحسابي لـ ${archive.employeeName} بنجاح.`,
      type: 'info'
    });
  };

  // Delete saved archive report index
  const handleDeleteArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedReports.filter(r => r.id !== id);
    setSavedReports(updated);
    localStorage.setItem('amin_sh_saved_pdf_reports', JSON.stringify(updated));
    setToast({
      show: true,
      message: "🗑️ تم حذف القيد من أرشيف الكشوفات المحفوظة بالنظام.",
      type: 'success'
    });
  };

  // Pagination and Page chunking calculations
  const getPagedTransactions = () => {
    const rowsPerPage = layoutOrientation === 'portrait' ? 12 : 8;
    const pages: Transaction[][] = [];
    for (let i = 0; i < reportList.length; i += rowsPerPage) {
      pages.push(reportList.slice(i, i + rowsPerPage));
    }
    return pages.length === 0 ? [[]] : pages;
  };

  const pages = getPagedTransactions();

  return (
    <div className="space-y-6">
      {/* Toast Alert Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 left-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border transition-all animate-bounce max-w-md ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/90 dark:border-emerald-900 dark:text-emerald-100'
            : toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/90 dark:border-rose-900 dark:text-rose-100'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/90 dark:border-indigo-900 dark:text-indigo-100'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={20} className="text-emerald-600 shrink-0" /> : <Info size={20} className="text-indigo-600 shrink-0" />}
          <p className="text-xs font-bold leading-5 whitespace-pre-line">{toast.message}</p>
        </div>
      )}

      {/* Loading overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100 dark:border-zinc-800">
            <div className="flex justify-center">
              <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={40} />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">جاري معالجة مستند PDF رسمي</h3>
            <p className="text-2xs text-slate-500 dark:text-zinc-400 leading-5">{progressMessage}</p>
            <div className="w-full bg-slate-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full animate-pulse" style={{ width: '80%' }}></div>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">يرجى الانتظار وإبقاء هذه النافذة نشطة لضمان دقة ترميز الألوان والخطوط.</p>
          </div>
        </div>
      )}

      {/* Share Actions Modal */}
      {isShareOpen && currentEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-100 dark:border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="text-indigo-600 dark:text-indigo-400" size={18} />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">خيارات مشاركة التقرير المالي</h3>
              </div>
              <button 
                onClick={() => setIsShareOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold px-2 py-1 bg-slate-50 dark:bg-zinc-800 rounded-lg"
              >
                إغلاق
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-850 rounded-xl space-y-1">
              <span className="block text-[10px] text-slate-450 font-bold">ملخص الكشف الحالي:</span>
              <p className="text-3xs font-mono text-slate-600 dark:text-zinc-300 leading-4">
                الموظف: {currentEmployee.name} | الفترة: {reportType === 'monthly' ? selectedMonth : 'مخصص'}<br />
                الراتب الأساسي: {basicSalaryOfEmp.toLocaleString()} ر.ي | الصافي المستحق: {netDueSalary.toLocaleString()} ر.ي
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-150 border border-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:hover:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs"
              >
                <MessageCircle size={16} className="text-emerald-605" />
                <span>واتساب 📱</span>
              </button>
              
              <button
                onClick={handleShareTelegram}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-800 dark:bg-sky-950/20 dark:border-sky-900 dark:hover:bg-sky-950/40 dark:text-sky-300 font-bold text-xs"
              >
                <Send size={16} className="text-sky-600" />
                <span>تليجرام ✈️</span>
              </button>

              <button
                onClick={handleShareEmail}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-slate-800 dark:bg-zinc-800 dark:border-zinc-750 dark:hover:bg-zinc-750 dark:text-zinc-200 font-bold text-xs"
              >
                <Mail size={16} />
                <span>إيميل ورسائل ✉️</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-800 dark:bg-indigo-950/20 dark:border-indigo-900 dark:hover:bg-indigo-950/40 dark:text-indigo-300 font-bold text-xs"
              >
                <Share2 size={16} className="text-indigo-605" />
                <span>مشاركة مدمجة 🔗</span>
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-zinc-800 pt-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateShareText());
                  setToast({
                    show: true,
                    message: "📋 تم نسخ النص الملخص المحاسبي الكامل للحافظة لإرساله بأي برنامج مشاركة!",
                    type: 'success'
                  });
                  setIsShareOpen(false);
                }}
                className="w-full bg-slate-100 dark:bg-zinc-805 hover:bg-indigo-50 hover:text-indigo-600 dark:text-white py-2.5 px-4 rounded-xl font-bold text-2xs transition-all flex items-center justify-center gap-1.5"
              >
                نسخ النص المنسق المحاسبي بالكامل 📋
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print border-b border-slate-100 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Printer size={20} className="text-indigo-600 dark:text-indigo-400" />
            نظام الإصدارات والتقارير المالية الذكي (A4 PDF Engine)
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-2xs mt-1">
            صياغة كشوفات تفصيلية مخصصة للمطابقة، مع تفعيل آليات الترميز وتصدير ملفات PDF متعددة الصفحات بدعم كامل للغة العربية.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl self-start sm:self-auto text-2xs font-extrabold flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'preview' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400'
            }`}
          >
            <Eye size={12} />
            معاينة كشف A4
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'analytics' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400'
            }`}
          >
            <Activity size={12} />
            التحليل الإحصائي
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'archive' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400'
            }`}
          >
            <FolderClosed size={12} />
            مجلد التقارير المحفوظة ({savedReports.length})
          </button>
          <button
            onClick={() => setActiveTab('executive')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'executive' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-400'
            }`}
          >
            <ShieldCheck size={12} className="text-indigo-600 dark:text-indigo-400" />
            التقارير الإدارية الذكية
          </button>
        </div>
      </div>

      {/* Reports parameters selector Form (no-print) */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-xs space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all ${
                reportType === 'monthly'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              📅 كشف شهري تفصيلي
            </button>
            <button
              onClick={() => setReportType('annual')}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all ${
                reportType === 'annual'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              🏢 تقرير سنوي مجمع
            </button>
            <button
              onClick={() => setReportType('custom')}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all ${
                reportType === 'custom'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
              }`}
            >
              ⚙️ نطاق تاريخ مخصص
            </button>
          </div>

          {/* Orientation Config */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-850 p-1 rounded-lg border border-slate-150 dark:border-zinc-800 text-[10px] font-bold">
            <span className="text-slate-405 px-1">تخطيط الورقة:</span>
            <button
              onClick={() => setLayoutOrientation('portrait')}
              className={`px-2 py-1 rounded-md transition-all ${
                layoutOrientation === 'portrait' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
              }`}
            >
              عمودي (Portrait)
            </button>
            <button
              onClick={() => setLayoutOrientation('landscape')}
              className={`px-2 py-1 rounded-md transition-all ${
                layoutOrientation === 'landscape' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400'
              }`}
            >
              أفقي (Landscape)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Employee dropdown */}
          <div>
            <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1">الموظف المعني بالتقرير</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700/80 focus:outline-none focus:border-indigo-505 font-bold"
            >
              <option value="" disabled>-- اختر الموظف --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
              ))}
            </select>
          </div>

          {/* Conditional filter inputs based on Report type */}
          {reportType === 'monthly' && (
            <div>
              <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1">اختر الشهر المالي</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-1 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700/80 focus:outline-none font-bold font-mono"
              />
            </div>
          )}

          {reportType === 'annual' && (
            <div>
              <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1">السنة المالية</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700/80 focus:outline-none font-bold"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>
          )}

          {reportType === 'custom' && (
            <>
              <div>
                <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1">من تاريخ</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-1 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-2xs font-bold text-slate-400 dark:text-zinc-500 mb-1">إلى تاريخ</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-1 text-xs bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-white rounded-lg border border-slate-200 dark:border-zinc-700 focus:outline-none font-mono"
                />
              </div>
            </>
          )}

          {/* Action Tools (no-print) */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportCSV}
              disabled={!currentEmployee}
              className="bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 text-white p-2 rounded-lg text-2xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:scale-100 flex-1 h-[34px] shadow-sm shadow-emerald-700/10 shrink-0"
              title="تصدير كجدول Excel"
            >
              <FileSpreadsheet size={13} />
              <span>تصدير Excel 🟢</span>
            </button>
            
            <button
              onClick={() => setIsShareOpen(true)}
              disabled={!currentEmployee}
              className="bg-slate-750 hover:bg-slate-850 hover:scale-[1.02] active:scale-95 text-white p-2 rounded-lg text-2xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:scale-100 flex-1 h-[34px] shadow-sm shrink-0"
              title="مشاركة الكشف كروابط مجهزة"
            >
              <Share2 size={13} />
              <span>مشاركة الكشف 📤</span>
            </button>
          </div>
        </div>

        {!selectedEmployeeId && (
          <p className="text-[11px] text-amber-600 font-bold flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <Info size={14} className="shrink-0 text-amber-500" />
            <span>تنبيـه: يرجى تحديد موظف من القائمة لعرض كشف حسابه وتفعيل أزرار الطابعة والتقارير.</span>
          </p>
        )}
      </div>

      {/* Primary Section Toggling */}
      {activeTab === 'executive' ? (
        <ExecutiveReportsView employees={employees} transactions={transactions} />
      ) : currentEmployee ? (
        <>
          {/* Active Tab Content */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* PDF Print Options Toolbar */}
              <div className="bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-2xl border border-slate-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 no-print">
                <span className="text-[10px] text-slate-500 font-bold px-1 select-none">
                  الخيارات المعززة لقوات الطباعة والتصدير:
                </span>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="bg-slate-705 border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-800 dark:text-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-2xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                    title="الطباعة المادية المباشرة باستخدام نظام المتصفح"
                  >
                    <Printer size={13} />
                    <span>طباعة الكشف (نظام) 📄</span>
                  </button>
                  
                  <button
                    onClick={() => handleExportPDF(false)}
                    className="bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-600/10 hover:scale-[1.01] active:scale-95 border border-indigo-500 text-white text-2xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    title="تحميل الملف فوراً كـ PDF لجهازك"
                  >
                    <FileDown size={13} />
                    <span>تصدير PDF 🔴</span>
                  </button>

                  <button
                    onClick={() => handleExportPDF(true)}
                    className="bg-slate-900 hover:bg-slate-950/90 dark:bg-white dark:text-slate-900 hover:scale-[1.01] active:scale-95 text-white text-2xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    title="حفظ الملف بنسخة دائمة داخل مجلد التقارير المحفوظة"
                  >
                    <Save size={13} />
                    <span>حفظ PDF في الأرشيف 💾</span>
                  </button>
                </div>
              </div>

              {/* Instructions banner */}
              <div className="bg-slate-50 dark:bg-zinc-900 p-3 rounded-xl text-[10px] text-slate-500 dark:text-zinc-400 space-y-1.5 border border-slate-100 dark:border-zinc-800/80 no-print">
                <p className="font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <Info size={12} className="text-indigo-550" />
                  أبرز خواص الطابعة الذكية المطورة:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pr-4 list-disc text-3xs">
                  <div>• هيكلة تفصيلية بمستندات A4 رسمية مقسمة لصفحات لتجنب التشويه والتداخل بالطباعة.</div>
                  <div>• تصدير PDF مدمج بجودة عالية يحافظ على كامل الخطوط والتوجيه باللغة العربية (RTL).</div>
                  <div>• حفظ تلقائي للمستندات بالمجلد الافتراضي المحفوظ بالنظام: <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono">Documents/AminAlShaibaniSmartSystem/Reports/</code>.</div>
                  <div>• إدماج أرقام الصفحات، العناوين المتكررة والمختوم والبيانات الحركية بدقة تامة.</div>
                </div>
              </div>

              {/* A4 PAGES CONTAINER PREVIEW FRAME */}
              <div className="w-full text-center py-2 no-print bg-slate-50 dark:bg-zinc-900 rounded-3xl pb-6 border border-slate-150 dark:border-zinc-850">
                <span className="text-[10px] bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-extrabold px-3 py-1 rounded-full border border-slate-350 dark:border-zinc-700">
                  لوحة معاينة صفحات المستند الحسابي الرسمية والترقيم الممنهج (A4 Digital View)
                </span>
                
                {/* Horizontal / vertical scrolling frame */}
                <div className="mt-6 flex flex-col items-center gap-10 overflow-x-auto w-full px-4 scrollbar-thin">
                  {pages.map((pageRows, pageIndex) => (
                    <div
                      key={pageIndex}
                      data-pdf-page
                      id={`page-node-${pageIndex}`}
                      className={`bg-white text-slate-900 border border-slate-300 dark:border-zinc-800 shadow-2xl relative text-right flex flex-col justify-between p-10 md:p-12 transition-all ${
                        layoutOrientation === 'portrait' 
                          ? 'w-[794px] h-[1123px] min-w-[794px] min-h-[1123px]' 
                          : 'w-[1123px] h-[794px] min-w-[1123px] min-h-[794px]'
                      }`}
                      style={{
                        boxSizing: 'border-box',
                        direction: 'rtl',
                        fontFamily: '"Cairo", "Tajawal", "Noto Kufi Arabic", "Inter", sans-serif'
                      }}
                    >
                      {/* Top White Page Frame Header */}
                      <div className="space-y-4">
                        {/* Repeated Banner Brand */}
                        <div className="flex border-b border-slate-800 dark:border-zinc-800 pb-4 items-center justify-between">
                          <div className="w-[45%] space-y-1 text-right flex flex-col justify-center" style={{ direction: 'rtl' }}>
                            <h3 className="font-bold text-[13.5px] text-slate-900 whitespace-nowrap" style={{ fontFamily: '"Cairo", "Tajawal", "Noto Kufi Arabic", sans-serif', letterSpacing: '0px', wordSpacing: 'normal', direction: 'rtl', display: 'block', unicodeBidi: 'plaintext' }}>
                              نظام الشيباني للحلول التقنية والخدمات النقدية
                            </h3>
                            <p className="text-[9.5px] text-slate-500 font-bold" style={{ letterSpacing: '0px', direction: 'rtl' }}>إدارة الحسابات • قسم الموارد البشرية</p>
                            <p className="text-[9px] text-slate-400 font-mono" style={{ direction: 'rtl' }}>تاريخ استخراج كشف: {new Date().toLocaleDateString('ar-YE')}</p>
                          </div>

                          <div className="w-[15%] text-center flex flex-col items-center justify-center">
                            <div className="h-10 w-10 rounded-full border border-slate-800 flex items-center justify-center font-black text-slate-950 bg-slate-50 text-[12px] font-mono shadow-xs">
                              {appSettings.institution.logoText || "أ.ش"}
                            </div>
                            <span className="font-bold text-[9px] text-slate-700 mt-1" style={{ letterSpacing: '0px' }}>سند حساب مالي دوري</span>
                          </div>

                          <div className="w-[40%] text-left font-mono text-[9px] text-slate-500 space-y-0.5">
                            <p className="font-sans" style={{ direction: 'rtl', textAlign: 'left' }}>اسم النظام: <strong className="text-indigo-600">نظام أمين الشيباني الذكي</strong></p>
                            <p>المستند المالي: AMIN-ST-{selectedEmployeeId}</p>
                            <p>الفترة المستهدفة: {reportType === 'monthly' ? selectedMonth : reportType === 'annual' ? selectedYear : 'مخصص'}</p>
                          </div>
                        </div>

                        {/* Employee Metadata Details (Render fully only on Page 1 to save space, otherwise condensed indicator) */}
                        {pageIndex === 0 ? (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-4 gap-2 text-[10px]">
                            <div>
                              <span className="block text-[8px] text-slate-400 font-bold">اسم الموظف:</span>
                              <span className="font-extrabold text-slate-900 block mt-0.5">{currentEmployee.name}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-400 font-bold">رقم المعرف:</span>
                              <span className="font-mono font-bold text-slate-800 block mt-0.5">{currentEmployee.id}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-400 font-bold">المسمى الوظيفي:</span>
                              <span className="font-bold text-slate-700 block mt-0.5">{currentEmployee.jobTitle}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-slate-400 font-bold">تاريخ القيد بالدفاتر:</span>
                              <span className="font-mono text-slate-700 block mt-0.5">{currentEmployee.hireDate}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-1 px-3 bg-slate-50 border-r-2 border-indigo-600 rounded flex justify-between items-center text-[9px]">
                            <span className="font-bold text-slate-600">تابع لكشف حساب الموظف المالي: <strong className="text-slate-900">{currentEmployee.name}</strong></span>
                            <span className="font-mono text-slate-400">رقم المعرف: {currentEmployee.id}</span>
                          </div>
                        )}

                        {/* Tables */}
                        <div className="mt-3">
                          <table className="w-full text-right text-[10px] border-collapse">
                            <thead>
                              <tr className="border-b-2 border-slate-350 bg-slate-100 text-slate-700 font-bold">
                                <th className="px-2.5 py-2 font-mono text-[9px]">رقم القيد</th>
                                <th className="px-2.5 py-2">تاريخ الحركة</th>
                                <th className="px-2.5 py-2 text-center">نوع الحركة</th>
                                <th className="px-2.5 py-2 w-[45%]">البيان والشرح التفصيلي القيظ</th>
                                <th className="px-2.5 py-2 text-left text-red-650">مدين (-)</th>
                                <th className="px-2.5 py-2 text-left text-emerald-650">دائن (+)</th>
                                <th className="px-2.5 py-2 text-left text-slate-900">الرصيد الجاري</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {pageRows.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50 font-medium text-slate-800">
                                  <td className="px-2.5 py-2 font-mono text-slate-400 text-[8px]">{tx.id}</td>
                                  <td className="px-2.5 py-2 font-mono text-slate-500 text-[9px]">{tx.date}</td>
                                  <td className="px-2.5 py-2 text-center text-[9px]">
                                    <span className={`px-1 rounded-sm text-[8px] ${
                                      tx.type === TransactionType.SALARY ? 'bg-indigo-50 text-indigo-700' :
                                      tx.type === TransactionType.ADVANCE || tx.type === TransactionType.THURSDAY_ADVANCE ? 'bg-amber-50 text-amber-700' :
                                      tx.type === TransactionType.DEDUCTION ? 'bg-rose-50 text-rose-700' :
                                      'bg-emerald-50 text-emerald-700'
                                    }`}>
                                      {tx.type === TransactionType.SALARY ? 'راتب أساسي' : tx.type === TransactionType.ADVANCE ? 'سلفة' : tx.type === TransactionType.THURSDAY_ADVANCE ? 'سلفة خميس' : tx.type === TransactionType.DEDUCTION ? 'خصم مالي' : tx.type === TransactionType.BONUS ? 'مكافأة' : tx.type}
                                    </span>
                                  </td>
                                  <td className="px-2.5 py-2 text-[10px] leading-relaxed truncate max-w-xs">{tx.statement}</td>
                                  <td className="px-2.5 py-2 text-left text-red-650 font-mono font-bold">
                                    {tx.debit > 0 ? `${tx.debit.toLocaleString()} ر.ي` : '-'}
                                  </td>
                                  <td className="px-2.5 py-2 text-left text-emerald-650 font-mono font-bold">
                                    {tx.credit > 0 ? `${tx.credit.toLocaleString()} ر.ي` : '-'}
                                  </td>
                                  <td className="px-2.5 py-2 text-left font-mono font-bold text-slate-900 font-mono">
                                    {(tx.balance !== undefined ? tx.balance : 0).toLocaleString()} ر.ي
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary Block on Last Page */}
                        {pageIndex === pages.length - 1 && (
                          <>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 mt-4 text-[10px]">
                              <div className="flex justify-between">
                                <span>إجمالي الاستحقاق المالي (دائن):</span>
                                <span className="font-mono text-slate-900">{totalCredits.toLocaleString()} ر.ي</span>
                              </div>
                              <div className="flex justify-between">
                                <span>إجمالي المسحوبات والسلف والخصومات:</span>
                                <span className="font-mono text-red-650 font-bold">-{totalDebits.toLocaleString()} ر.ي</span>
                              </div>
                              <div className="border-t border-slate-300 pt-1.5 flex justify-between font-black text-slate-950 text-xs">
                                <span>صافي المستخلص النهائي الجاري:</span>
                                <span className={`font-mono border-b border-double border-slate-500 pb-0.5 ${
                                  netDueSalary >= 0 ? 'text-emerald-700' : 'text-red-700'
                                }`}>
                                  {netDueSalary.toLocaleString()} ر.ي
                                </span>
                              </div>
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-4 border-t border-slate-200">
                              <div className="space-y-4">
                                <span className="font-bold text-slate-500 block">منظم المحاسبة المعتمد:</span>
                                <div className="h-0.5 w-16 bg-slate-300 mx-auto"></div>
                                <span className="text-[8px] text-zinc-500 font-bold block">مكتب التدقيق المحاسبي</span>
                              </div>
                              <div className="space-y-4">
                                <span className="font-bold text-slate-500 block">توقيع المستلم باليد:</span>
                                <div className="h-0.5 w-16 bg-slate-300 mx-auto"></div>
                                <span className="text-[8px] text-zinc-500 block truncate font-bold">{currentEmployee.name}</span>
                              </div>
                              <div className="space-y-4">
                                <span className="font-bold text-slate-500 block">اعتماد أمين الشيباني:</span>
                                <div className="h-0.5 w-16 bg-slate-300 mx-auto"></div>
                                <span className="text-[8px] text-indigo-600 font-black block">ختم الإدارة والمؤسسة</span>
                              </div>
                            </div>
                          </>
                        )}

                        {/* Pagination Footer (Inside A4 Page boundaries) */}
                        <div className="text-[8px] text-slate-400 font-mono flex items-center justify-between border-t border-slate-200 pt-2 flex-row-reverse">
                          <span>صفحة {pageIndex + 1} من {pages.length}</span>
                          <span>تم تصديره تلقائياً بواسطة نظام أمين علي الشيباني الذكي</span>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="text-indigo-650 shrink-0" size={18} />
                    <span>تحليل وبنية المؤشرات المالية للموظف: {currentEmployee.name}</span>
                  </h3>
                  <p className="text-2xs text-slate-405 mt-0.5">مقارنة كتل الدائن والمدين وتحديد التوازنات المالية الجارية للموظف.</p>
                </div>
                
                {/* Standalone Year selector for the Chart / Analytics */}
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-850 p-1.5 rounded-xl border border-slate-150 dark:border-zinc-800 text-2xs font-bold">
                  <span className="text-slate-400 px-1">السنة المالية:</span>
                  {[2026, 2025, 2024].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        selectedYear === yr 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'text-slate-500 hover:text-slate-705 dark:hover:text-zinc-200'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* KPI indicators grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/30 rounded-2xl">
                  <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold">المرتب والمكافآت (إجمالي الدائن للعام)</span>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    {chartData.reduce((sum, d) => sum + d['الرواتب والمستحقات'], 0).toLocaleString()} <span className="text-[10px]">ر.ي</span>
                  </p>
                  <div className="mt-2 text-[9px] text-slate-400">يمثل الرواتب والبدلات والمكافآت السنوية المدفوعة.</div>
                </div>

                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/60 dark:border-rose-900/30 rounded-2xl">
                  <span className="text-[10px] text-rose-805 dark:text-rose-300 font-bold">السحبيات والخصم (إجمالي المدين للعام)</span>
                  <p className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
                    {chartData.reduce((sum, d) => sum + d['الخصوميات والمسحوبات'], 0).toLocaleString()} <span className="text-[10px]">ر.ي</span>
                  </p>
                  <div className="mt-2 text-[9px] text-slate-400">يمثل السلفيات وسحب الخميس والخفوضات والجزاءات السنوية.</div>
                </div>

                <div className={`p-4 border rounded-2xl ${
                  netDueSalary >= 0 
                  ? 'bg-indigo-50/55 border-indigo-100 dark:bg-indigo-950/10 dark:border-indigo-900/30 text-indigo-800' 
                  : 'bg-amber-50/55 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30 text-amber-800'
                }`}>
                  <span className="text-[10px] dark:text-zinc-300 font-bold">الرصيد المحاسبي السنوي (الصافي)</span>
                  <p className={`text-lg font-black font-mono mt-1 ${netDueSalary >= 0 ? 'text-indigo-650 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-450'}`}>
                    {(chartData.reduce((sum, d) => sum + d['الرواتب والمستحقات'], 0) - chartData.reduce((sum, d) => sum + d['الخصوميات والمسحوبات'], 0)).toLocaleString()} <span className="text-[10px]">ر.ي</span>
                  </p>
                  <div className="mt-2 text-[9px] text-slate-400">فائض ميزان أو مديونية الموظف الإجمالية المتبقية.</div>
                </div>
              </div>

              {/* Peak distribution indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {peakSalaryMonth && peakSalaryMonth['الرواتب والمستحقات'] > 0 && (
                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-850 border border-slate-150 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="block text-3xs text-slate-400 font-bold">الشهر الأعلى استحقاقاً (الأعلى دائن):</span>
                      <span className="text-2xs font-extrabold text-slate-800 dark:text-zinc-200">شهر {peakSalaryMonth.name}</span>
                    </div>
                    <div className="text-left font-bold text-slate-800 dark:text-white">
                      <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-450">{peakSalaryMonth['الرواتب والمستحقات'].toLocaleString()} ر.ي</span>
                    </div>
                  </div>
                )}
                {peakDeductionMonth && peakDeductionMonth['الخصوميات والمسحوبات'] > 0 && (
                  <div className="p-3.5 bg-slate-50 dark:bg-zinc-850 border border-slate-150 dark:border-zinc-800 rounded-2xl flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="block text-3xs text-slate-400 font-bold">الشهر الأعلى خصومات (الأعلى مدين):</span>
                      <span className="text-2xs font-extrabold text-slate-800 dark:text-zinc-200">شهر {peakDeductionMonth.name}</span>
                    </div>
                    <div className="text-left font-bold text-slate-800 dark:text-white">
                      <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-455">{peakDeductionMonth['الخصوميات والمسحوبات'].toLocaleString()} ر.ي</span>
                    </div>
                  </div>
                )}
              </div>

              {/* THE RECHARTS INTERACTIVE COMPOSSED CHART */}
              <div className="bg-slate-50/50 dark:bg-zinc-850/50 border border-slate-150 dark:border-zinc-800 rounded-3xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 dark:border-zinc-800 pb-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-white text-right">جدول التوزيع الشهري التفاعلي للأرصدة ({selectedYear})</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 text-right">انقر على أي شهر أو عمود بالرسم البياني لتفصيل حركاته وقيوده المحاسبية فوراً.</p>
                  </div>

                  <div className="flex items-center gap-4 text-[10.5px] font-bold" style={{ direction: 'rtl' }}>
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>الرواتب والبدلات</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-500 dark:text-rose-450">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span>الخصومات والسلفيات</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400">
                      <span className="w-2.5 h-1 bg-indigo-500" />
                      <span>الصافي المتبقي</span>
                    </span>
                  </div>
                </div>

                <div className="w-full h-80 relative font-mono text-[9px] select-none" style={{ direction: 'ltr' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={chartData}
                      margin={{ top: 15, right: 5, left: 15, bottom: 5 }}
                      onClick={(data: any) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          const payload = data.activePayload[0].payload;
                          setSelectedChartMonth(payload.monthKey);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="opacity-40 dark:opacity-10" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis 
                        tick={{ fontSize: 9, fill: '#64748b' }} 
                        axisLine={false} 
                        tickLine={false} 
                        tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} 
                        orientation="right"
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="الرواتب والمستحقات" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={32} 
                        name="الرواتب والمكافآت (دائن)" 
                        cursor="pointer"
                      />
                      <Bar 
                        dataKey="الخصوميات والمسحوبات" 
                        fill="#f43f5e" 
                        radius={[4, 4, 0, 0]} 
                        maxBarSize={32} 
                        name="الخصومات والسحبيات (مدين)" 
                        cursor="pointer"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="الصافي المتبقي" 
                        stroke="#4f46e5" 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2 }} 
                        name="الرصيد الصافي المستحق" 
                        cursor="pointer"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Quick month selection list */}
                <div className="border-t border-slate-150 dark:border-zinc-800 pt-3">
                  <span className="block text-[10px] text-slate-400 dark:text-zinc-500 font-bold mb-2 text-right">أزرار الانتقال والفرز السريع لكل شهر في العام:</span>
                  <div className="flex flex-wrap gap-1.5 justify-start" style={{ direction: 'rtl' }}>
                    {chartData.map((d) => {
                      const isSelected = selectedChartMonth === d.monthKey;
                      const hasData = d.txCount > 0;
                      return (
                        <button
                          key={d.monthKey}
                          onClick={() => setSelectedChartMonth(isSelected ? null : d.monthKey)}
                          className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/10 scale-102 font-black'
                              : hasData
                                ? 'bg-emerald-50/20 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60 hover:bg-slate-50'
                                : 'bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border-slate-150 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-750'
                          }`}
                        >
                          <span>{d.name}</span>
                          {hasData && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* MONTH DRILL DOWN TRANSACTIONS */}
              {selectedChartMonth && (
                <div className="bg-slate-50/50 dark:bg-zinc-850/50 border border-slate-150 dark:border-zinc-800 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-150 dark:border-zinc-800 pb-3" style={{ direction: 'rtl' }}>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">
                        تفصيل العمليات والرواتب لشهر: {MONTHS_AR[Number(selectedChartMonth.split('-')[1]) - 1]} ({selectedChartMonth})
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">الحركات والمطابقات المعتمدة في هذا الشهر المالي للموظف.</p>
                    </div>

                    <button
                      onClick={() => setSelectedChartMonth(null)}
                      className="px-2.5 py-1 text-[10px] bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-355 rounded-lg hover:bg-slate-300 dark:hover:bg-zinc-700 font-bold cursor-pointer"
                    >
                      إغلاق التفاصيل ×
                    </button>
                  </div>

                  <div className="overflow-x-auto w-full scrollbar-thin rounded-xl border border-slate-150 dark:border-zinc-805 bg-white dark:bg-zinc-900">
                    <table className="w-full text-right text-3xs border-collapse font-bold" style={{ direction: 'rtl' }}>
                      <thead>
                        <tr className="bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-b border-slate-150 dark:border-zinc-800">
                          <th className="p-2.5">تاريخ الحركة</th>
                          <th className="p-2.5">البيان والشرح</th>
                          <th className="p-2.5 text-rose-500 dark:text-rose-455">مدين (سحب/خصم)</th>
                          <th className="p-2.5 text-emerald-600 dark:text-emerald-400">دائن (استحقاق)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.filter(t => t.employeeId === selectedEmployeeId && t.date.startsWith(selectedChartMonth)).map((t, idx) => (
                          <tr key={idx} className="border-b border-slate-100 dark:border-zinc-800/60 hover:bg-slate-50/50 dark:hover:bg-zinc-855/30">
                            <td className="p-2.5 font-mono text-slate-500 dark:text-zinc-400">{t.date}</td>
                            <td className="p-2.5 text-slate-700 dark:text-zinc-300">{t.statement}</td>
                            <td className="p-2.5 font-mono text-rose-600 dark:text-rose-400">
                              {t.debit > 0 ? `${t.debit.toLocaleString()} ر.ي` : '—'}
                            </td>
                            <td className="p-2.5 font-mono text-emerald-600 dark:text-emerald-400">
                              {t.credit > 0 ? `${t.credit.toLocaleString()} ر.ي` : '—'}
                            </td>
                          </tr>
                        ))}

                        {transactions.filter(t => t.employeeId === selectedEmployeeId && t.date.startsWith(selectedChartMonth)).length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 text-3xs font-extrabold bg-slate-50/30 dark:bg-zinc-900">
                              لا توجد أي حركات مالية مسجلة لهذا الموظف خلال هذا الشهر.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Progress diagram breakdown */}
              <div className="space-y-4 bg-slate-50 dark:bg-zinc-850 p-5 rounded-2xl border border-slate-150 dark:border-zinc-800">
                <span className="text-2xs font-bold text-slate-500 dark:text-zinc-305 block">ميزان الصافي بالمقارنة الكتلية:</span>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-3xs text-slate-400 font-bold">
                    <span>نسبة السحب والمدين من إجمالي المستحق</span>
                    <span className="font-mono">{totalCredits > 0 ? ((totalDebits / totalCredits) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-zinc-700 h-2.5 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-rose-500 h-full transition-all" 
                      style={{ width: `${totalCredits > 0 ? Math.min(100, (totalDebits / totalCredits) * 100) : 0}%` }}
                    ></div>
                    <div 
                      className="bg-emerald-500 h-full flex-1 transition-all"
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-3xs text-zinc-400 pt-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                    <span>المدين المستهلك (سحب): {totalDebits.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                    <span>صافي المدخر (المتبقي): {Math.max(0, netDueSalary).toLocaleString()} ر.ي</span>
                  </div>
                </div>
              </div>

              {/* Detailed statistical list of actions */}
              <div className="space-y-3">
                <span className="text-2xs font-extrabold text-slate-800 dark:text-white block">تحليل سلوك الحركة الحالية للدفتر:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-2xs">
                  <div className="p-3 border border-slate-100 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                    <span className="text-slate-400 font-bold">إجمالي الحركات المحولة المودعة:</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">{reportList.length} قيود مسجلة</span>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-zinc-800 rounded-xl flex items-center justify-between">
                    <span className="text-slate-400 font-bold">الراتب الأساسي المعين للموظف:</span>
                    <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">{basicSalaryOfEmp.toLocaleString()} ر.ي</span>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-zinc-800 rounded-xl flex items-center justify-between col-span-1 sm:col-span-2">
                    <span className="text-slate-400 font-bold">حالة الكشف:</span>
                    <span className={`px-2 py-0.5 rounded-full text-3xs font-black ${netDueSalary >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30' : 'bg-rose-105 text-rose-800 dark:bg-rose-950/30'}`}>
                      {netDueSalary >= 0 ? 'متزن ومصادف دائن' : 'مدين بالخصم'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'archive' && (
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-100 dark:border-zinc-800 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-805 pb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <FolderClosed className="text-indigo-600 dark:text-indigo-400" size={18} />
                    مجلد النظام الأرشيفي لملفات PDF وبنية الدليل الموثق
                  </h3>
                  <p className="text-2xs text-slate-405 mt-0.5">البوابة التخيلية المقترنة تفصيلاً بمسار التخزين لجهازك: <code className="bg-slate-100 dark:bg-zinc-800/80 p-0.5 px-1.5 rounded-lg text-indigo-500 dark:text-indigo-400 font-mono text-[9px]">Documents/AminAlShaibaniSmartSystem/Reports/</code></p>
                </div>

                <div className="text-[10px] text-zinc-400 font-bold font-mono">
                  إجمالي التقارير المصنفة: {savedReports.length} ملف
                </div>
              </div>

              {/* List of saved reports */}
              <div className="space-y-3">
                {savedReports.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadArchiveFilters(item)}
                    className="p-4 bg-slate-50 dark:bg-zinc-850 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-2xl border border-slate-150 dark:border-zinc-800 flex items-center justify-between gap-4 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-red-105 dark:bg-rose-950/30 text-rose-600 flex items-center justify-center font-bold">
                        PDF
                      </div>
                      <div className="space-y-1">
                        <span className="block text-2xs font-extrabold text-slate-800 dark:text-zinc-200 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.fileName}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-3xs text-slate-400">
                          <span>الموظف: <strong className="text-slate-600 dark:text-zinc-300">{item.employeeName}</strong></span>
                          <span>•</span>
                          <span>الفترة: <strong className="font-mono text-slate-605">{item.period}</strong></span>
                          <span>•</span>
                          <span>الحجم التجريبي: <code className="font-mono text-slate-500">{item.fileSize}</code></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadArchiveFilters(item);
                        }}
                        className="p-2 bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-500 dark:text-zinc-300 rounded-lg text-3xs font-bold border border-slate-200/60 dark:border-zinc-700 cursor-pointer shadow-xs whitespace-nowrap"
                        title="تحميل عوامل تصفية هذا الكشف للمعاينة المباشرة"
                      >
                        معاينة السند 
                      </button>

                      <button
                        onClick={(e) => handleDeleteArchive(item.id, e)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 rounded-lg text-xs font-bold border border-rose-100 dark:border-rose-900/30 cursor-pointer"
                        title="حذف من الأرشيف الداخلي"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}

                {savedReports.length === 0 && (
                  <div className="text-center py-12 text-slate-400 space-y-2 border-2 border-dashed border-slate-200/60 dark:border-zinc-800 rounded-2xl">
                    <FolderClosed size={32} className="mx-auto text-slate-200 dark:text-zinc-800" />
                    <p className="font-extrabold text-2xs">عفواً، لم تقم بحفظ أو تصدير أي كشوفات PDF للأرشيف العام بعد.</p>
                    <p className="text-[10px] text-zinc-400">عند المعاينة بتبويب "معاينة كشف A4"، انقر على زر "حفظ PDF في الأرشيف 💾" لإدراج المستندات وتعميدها بالملف الموثق.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-12 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-2xl text-slate-400 flex flex-col items-center justify-center gap-2">
          <Sliders size={36} className="text-slate-200" />
          <p className="font-bold text-xs">يرجى تسجيل وتدشين الموظفين أولاً لتشغيل طابعة كشوف كشوفات الرواتب الحسابية.</p>
        </div>
      )}
    </div>
  );
}
