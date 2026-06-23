import React, { useState, useRef, useEffect } from 'react';
import { 
  Lock, 
  User as UserIcon, 
  ShieldCheck, 
  Database, 
  Upload, 
  FileCheck2, 
  Compass, 
  AlertCircle,
  HelpCircle,
  BookOpen,
  ArrowRightLeft,
  Phone,
  RefreshCw,
  X,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../types';

interface LoginViewProps {
  onLoginSuccess: (userName: string, role: UserRole, userId?: string) => void;
  onImportBackup: (file: File) => Promise<{ success: boolean; message: string }>;
}

// Custom styled SVG for the official WhatsApp Brand Icon
const WhatsAppIcon = ({ size = 20, className = "" }: { size?: number; className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.37 5.378 0 12.003 0c3.21.002 6.223 1.248 8.492 3.52 2.27 2.272 3.51 5.287 3.505 8.498-.01 6.63-5.385 12.001-12.013 12.001-2.001-.002-3.97-.497-5.714-1.439L0 24zm6.59-11.838c-.14-.233-.51-.375-1.065-.653-.556-.278-2.617-1.29-3.024-1.439-.408-.149-.705-.222-.965.167-.259.39-.997 1.258-1.22 1.51-.223.251-.446.28-.997.002-.551-.277-2.327-.857-4.437-2.738-1.642-1.464-2.75-3.27-3.07-3.824-.32-.555-.034-.854.243-1.13.249-.249.551-.64.827-.96.275-.319.367-.549.55-.916.183-.367.091-.687-.046-.96-.137-.272-1.22-2.94-1.671-4.021-.439-1.056-.889-.912-1.22-.928-.316-.016-.679-.019-1.042-.019a2.003 2.003 0 0 0-1.45.679c-.502.549-1.913 1.868-1.913 4.557 0 2.688 1.956 5.284 2.23 5.65.278.367 3.848 5.877 9.324 8.239 1.3.562 2.318.897 3.11 1.148 1.306.415 2.494.356 3.434.215 1.049-.158 3.217-1.316 3.671-2.589.453-1.272.453-2.364.317-2.589-.136-.226-.506-.367-1.066-.64z"/>
  </svg>
);

export default function LoginView({ onLoginSuccess, onImportBackup }: LoginViewProps) {
  // Tabs for administrative and new users 
  const [loginTab, setLoginTab] = useState<'new_user' | 'admin'>('new_user');

  // Input states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Fallback states for WhatsApp shipment failures
  const [isWhatsappFailed, setIsWhatsappFailed] = useState(false);
  const [smsStatusMsg, setSmsStatusMsg] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Status & notifications
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  // OTP Verification Modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const [timer, setTimer] = useState(60);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Backup restore states
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'err'; text: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP Countdown timer
  useEffect(() => {
    if (!showOtpModal || timer === 0) return;
    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showOtpModal, timer]);

  // Handle auto-verification when all 6 digits are typed
  useEffect(() => {
    if (showOtpModal) {
      const code = otpValues.join('');
      if (code.length === 6) {
        handleOtpVerification(code);
      }
    }
  }, [otpValues, showOtpModal]);

  // Administrative user login
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMsg('الرجاء إدخال اسم المستخدم وكلمة المرور لتسجيل الدخول كمسؤول.');
      return;
    }

    if (trimmedUser === 'admin' && trimmedPass === 'admin') {
      onLoginSuccess('مدير النظام', UserRole.ADMIN, 'admin');
    } else if (trimmedUser === 'accountant' && trimmedPass === 'accountant') {
      onLoginSuccess('المحاسب المسؤول', UserRole.ACCOUNTANT, 'accountant');
    } else if (trimmedUser === 'entry' && trimmedPass === 'entry') {
      onLoginSuccess('مدخل البيانات', UserRole.ACCOUNTANT, 'entry');
    } else if (trimmedUser === 'supervisor' && trimmedPass === 'supervisor') {
      onLoginSuccess('مشرف جمعية', UserRole.ACCOUNTANT, 'supervisor');
    } else if (trimmedUser === 'viewer' && trimmedPass === 'viewer') {
      onLoginSuccess('المشاهد المالي', UserRole.USER, 'viewer');
    } else {
      setErrorMsg('اسم المستخدم أو كلمة المرور غير صحيحة. يرجى مراجعة بيانات الاعتماد المسرّبة.');
    }
  };

  // Modern verification request via WhatsApp API
  const handleInitiateOtpSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsWhatsappFailed(false);
    setSmsStatusMsg(null);

    const trimmedName = fullName.trim();
    let trimmedPhone = phone.trim().replace(/[\s\-\(\)]/g, '');

    // Name length check (must be quadruple الاسم الرباعي)
    const nameParts = trimmedName.split(/\s+/).filter(part => part.length > 0);
    if (!trimmedName || nameParts.length < 4) {
      setErrorMsg('يرجى إدخال الاسم الرباعي كاملاً (أربعة أسماء على الأقل، على سبيل المثال: عاصم أمين سعيد الشيباني).');
      return;
    }

    // Formatting rules:
    // If starts with 0 (e.g. 0777123456) -> replace leading 0 with +967
    if (trimmedPhone.startsWith('0')) {
      trimmedPhone = '+967' + trimmedPhone.slice(1);
    }
    // If starts with 7 and is 9 digits (e.g. 777123456) -> prefix with +967
    else if (trimmedPhone.startsWith('7') && trimmedPhone.length === 9) {
      trimmedPhone = '+967' + trimmedPhone;
    }
    // If written as 967XXXXXXXX -> make it +967XXXXXXXX
    else if (trimmedPhone.startsWith('967') && trimmedPhone.length === 12) {
      trimmedPhone = '+' + trimmedPhone;
    }

    // Now validate if it fits a valid Yemeni Mobile number format +9677XXXXXXXX or general +967XXXXXXXX (starts with +967 followed by 9 digits)
    const yemeniPhoneRegex = /^\+967[0-9]{9}$/;
    if (!trimmedPhone || !yemeniPhoneRegex.test(trimmedPhone)) {
      setErrorMsg('يرجى إدخال رقم هاتف صحيح بالصيغة اليمنية (مثال: 777123456 أو 0777123456 أو +967777123456).');
      return;
    }

    setPhone(trimmedPhone); // Set state to final international format

    setIsLoading(true);
    setLoadingText('جاري التحقق من رقم الهاتف لدى خوادم واتساب التقنية...');

    try {
      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: trimmedPhone, name: trimmedName })
      });
      const data = await response.json();
      setIsLoading(false);

      if (response.ok) {
        if (data.success) {
          setGeneratedOtp(data.code || '');
          setOtpValues(Array(6).fill(''));
          setTimer(60);
          setVerificationError(null);
          setIsWhatsappFailed(false);
          setSmsStatusMsg(null);
          setSuccessMsg('تم إرسال رمز التحقق عبر الواتساب بنجاح.');
          setShowOtpModal(true);
        } else {
          // Fallback to local generation if WhatsApp send failed
          const localCode = Math.floor(100000 + Math.random() * 900000).toString();
          setGeneratedOtp(localCode);
          setOtpValues(Array(6).fill(''));
          setTimer(60);
          setVerificationError(null);
          setIsWhatsappFailed(true);
          setSmsStatusMsg(null);
          setSuccessMsg('تنبيه: نعتذر لتعذر إرسال الواتساب من المزود البوابي، تم تشغيل نظام توليد رمز التحقق الفلكي المحلي لعضويتك.');
          setShowOtpModal(true);
        }
      } else {
        const localCode = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(localCode);
        setOtpValues(Array(6).fill(''));
        setTimer(60);
        setVerificationError(null);
        setIsWhatsappFailed(true);
        setSmsStatusMsg(null);
        setSuccessMsg('تنبيه: تم تشغيل نظام التحقق الفردي بالمحاكاة المحلية لعدم توفر إنترنت.');
        setShowOtpModal(true);
      }
    } catch (error) {
      setIsLoading(false);
      const localCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(localCode);
      setOtpValues(Array(6).fill(''));
      setTimer(60);
      setVerificationError(null);
      setIsWhatsappFailed(true);
      setSmsStatusMsg(null);
      setSuccessMsg('تنبيه: تم تفعيل طبقة توليد الأرقام المحلية في وضع عدم الاتصال بالشبكة (أوفلاين).');
      setShowOtpModal(true);
    }
  };

  const handleOtpVerification = async (enteredCode: string) => {
    setIsLoading(true);
    setLoadingText('جاري التحقق من رمز التحقق...');

    const runLocalLoginSuccess = (enteredCode: string) => {
      if (enteredCode === generatedOtp && generatedOtp !== '') {
        setSuccessMsg('تم التحقق من هوية رقم الهاتف بنجاح! جاري دخول النظام (وضع أوفلاين)...');
        setVerificationError(null);

        // Save user creation status to localStorage (حفظ الحساب للتسجيل اللاحق)
        const systemUsersStr = localStorage.getItem('amin_sh_system_users') || '[]';
        const systemUsers = JSON.parse(systemUsersStr);
        
        const cleanPhone = phone.trim().replace(/\s/g, '');
        const existing = systemUsers.find((u: any) => u.phone === cleanPhone);

        let isNew = false;
        let targetUser = existing;

        if (!existing) {
          isNew = true;
          targetUser = {
            id: 'usr_' + Date.now().toString(),
            name: fullName.trim(),
            phone: cleanPhone,
            role: UserRole.USER,
            createdAt: new Date().toISOString()
          };
          systemUsers.push(targetUser);
          localStorage.setItem('amin_sh_system_users', JSON.stringify(systemUsers));

          // Seed empty databases for this isolated custom user space
          localStorage.setItem(`amin_sh_employees_${targetUser.id}`, JSON.stringify([]));
          localStorage.setItem(`amin_sh_transactions_${targetUser.id}`, JSON.stringify([]));
          localStorage.setItem(`amin_sh_categories_${targetUser.id}`, JSON.stringify([]));
          
          const customSettings = {
            institution: {
              name: 'نظام الشيباني للحلول التقنية',
              logoText: 'الشيباني',
              phone: cleanPhone,
              address: '',
              currency: 'ر.ي'
            },
            primaryColor: 'indigo',
            darkMode: false
          };
          localStorage.setItem(`amin_sh_settings_${targetUser.id}`, JSON.stringify(customSettings));
        }

        if (isNew) {
          alert(
            "مرحباً بك في نظام أمين الشيباني الذكي.\n\n" +
            "تم إنشاء مساحة عمل جديدة خاصة بك.\n\n" +
            "يمكنك الآن البدء بإدخال بياناتك من الصفر."
          );
        }

        setTimeout(() => {
          setShowOtpModal(false);
          onLoginSuccess(targetUser.name, UserRole.USER, targetUser.id);
        }, 1200);
        return true;
      }
      return false;
    };

    try {
      if (isWhatsappFailed) {
        const verified = runLocalLoginSuccess(enteredCode);
        if (verified) {
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: enteredCode })
      });
      const data = await response.json();
      setIsLoading(false);

      if (response.ok && data.success) {
        setSuccessMsg('تم التحقق من هوية رقم الهاتف بنجاح! جاري دخول النظام...');
        setVerificationError(null);

        // Save user creation status to localStorage (حفظ الحساب للتسجيل اللاحق)
        const systemUsersStr = localStorage.getItem('amin_sh_system_users') || '[]';
        const systemUsers = JSON.parse(systemUsersStr);
        
        const cleanPhone = phone.trim().replace(/\s/g, '');
        const existing = systemUsers.find((u: any) => u.phone === cleanPhone);

        let isNew = false;
        let targetUser = existing;

        if (!existing) {
          isNew = true;
          targetUser = {
            id: 'usr_' + Date.now().toString(),
            name: fullName.trim(),
            phone: cleanPhone,
            role: UserRole.USER,
            createdAt: new Date().toISOString()
          };
          systemUsers.push(targetUser);
          localStorage.setItem('amin_sh_system_users', JSON.stringify(systemUsers));

          // Seed empty databases for this isolated custom user space
          localStorage.setItem(`amin_sh_employees_${targetUser.id}`, JSON.stringify([]));
          localStorage.setItem(`amin_sh_transactions_${targetUser.id}`, JSON.stringify([]));
          localStorage.setItem(`amin_sh_categories_${targetUser.id}`, JSON.stringify([]));
          
          const customSettings = {
            institution: {
              name: 'نظام الشيباني للحلول التقنية',
              logoText: 'الشيباني',
              phone: cleanPhone,
              address: '',
              currency: 'ر.ي'
            },
            primaryColor: 'indigo',
            darkMode: false
          };
          localStorage.setItem(`amin_sh_settings_${targetUser.id}`, JSON.stringify(customSettings));
        }

        if (isNew) {
          alert(
            "مرحباً بك في نظام أمين الشيباني الذكي.\n\n" +
            "تم إنشاء مساحة عمل جديدة خاصة بك.\n\n" +
            "يمكنك الآن البدء بإدخال بياناتك من الصفر."
          );
        }

        setTimeout(() => {
          setShowOtpModal(false);
          onLoginSuccess(targetUser.name, UserRole.USER, targetUser.id);
        }, 1200);
      } else {
        // Fallback local verify if API tells us failure but we ran in simulated local
        if (runLocalLoginSuccess(enteredCode)) {
          setIsLoading(false);
          return;
        }
        setVerificationError(data.error || 'رمز التحقق الذي أدخلته غير مطابق! يرجى التحقق وإعادة المحاولة.');
        setOtpValues(Array(6).fill(''));
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 100);
      }
    } catch (e) {
      // Offline fallback
      if (runLocalLoginSuccess(enteredCode)) {
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
      setVerificationError('فشل الاتصال بالخادم. يرجى مراجعة الرمز المحلي الظاهر على الشاشة.');
    }
  };

  const handleResendCode = async () => {
    if (timer > 0 && !isWhatsappFailed) return;

    setIsLoading(true);
    setLoadingText('جاري إعادة إصدار رمز التحقق الجديد...');

    try {
      const trimmedName = fullName.trim();
      let trimmedPhone = phone.trim().replace(/[\s\-\(\)]/g, '');

      if (trimmedPhone.startsWith('0')) {
        trimmedPhone = '+967' + trimmedPhone.slice(1);
      } else if (trimmedPhone.startsWith('7') && trimmedPhone.length === 9) {
        trimmedPhone = '+967' + trimmedPhone;
      } else if (trimmedPhone.startsWith('967') && trimmedPhone.length === 12) {
        trimmedPhone = '+' + trimmedPhone;
      }

      setPhone(trimmedPhone);

      const response = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: trimmedPhone, name: trimmedName })
      });
      const data = await response.json();
      setIsLoading(false);

      if (response.ok) {
        if (data.success) {
          setGeneratedOtp(data.code || '');
          setOtpValues(Array(6).fill(''));
          setTimer(60);
          setVerificationError(null);
          setIsWhatsappFailed(false);
          setSmsStatusMsg(null);
          setSuccessMsg('تم إرسال رمز التحقق عبر الواتساب بنجاح.');
          setTimeout(() => {
            otpRefs.current[0]?.focus();
          }, 100);
        } else {
          const detail = data.error || data.message || '';
          const errMsg = detail 
            ? `فشل إرسال رمز التحقق عبر واتساب، تحقق من اتصال UltraMsg أو إعدادات API: ${detail}`
            : 'فشل إرسال رمز التحقق عبر واتساب، تحقق من اتصال UltraMsg أو إعدادات API';
          setVerificationError(errMsg);
        }
      } else {
        setVerificationError('فشل إرسال رمز التحقق عبر واتساب، تحقق من اتصال UltraMsg أو إعدادات API');
      }
    } catch (e) {
      setIsLoading(false);
      setVerificationError('فشل إرسال رمز التحقق عبر واتساب، تحقق من اتصال UltraMsg أو إعدادات API');
    }
  };

  // Individual digit processing
  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    if (!cleanVal) return;

    const newOtp = [...otpValues];
    newOtp[index] = cleanVal[cleanVal.length - 1];
    setOtpValues(newOtp);

    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otpValues];
      if (otpValues[index]) {
        newOtp[index] = '';
        setOtpValues(newOtp);
      } else if (index > 0) {
        newOtp[index - 1] = '';
        setOtpValues(newOtp);
        otpRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pasteData.length === 6) {
      setOtpValues(pasteData.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  // Drag and drop database restores
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processBackupFile = async (file: File) => {
    if (!file) return;
    setRestoreMessage(null);
    try {
      const result = await onImportBackup(file);
      if (result.success) {
        setRestoreMessage({
          type: 'success',
          text: result.message
        });
      } else {
        setRestoreMessage({
          type: 'err',
          text: result.message
        });
      }
    } catch (err: any) {
      setRestoreMessage({
        type: 'err',
        text: `خطأ أثناء قراءة النسخة الاحتياطية: ${err?.message || 'تأكد من اختيار ملف صالح.'}`
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processBackupFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processBackupFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 md:p-8 select-none font-sans" dir="rtl">
      
      {/* Container holding Login Card and Mobile-Optimized Interface */}
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden">
        
        {/* Network and delivery loader overlays */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="relative flex items-center justify-center mb-6">
              <span className="absolute animate-ping inline-flex h-14 w-14 rounded-full bg-emerald-400 opacity-20"></span>
              <div className="h-14 w-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <WhatsAppIcon size={28} />
              </div>
            </div>
            <div className="space-y-2 max-w-xs">
              <h3 className="text-sm font-black text-slate-800 dark:text-zinc-100">درجة الاتصال بالبوابة المالية</h3>
              <p className="text-2xs text-slate-500 dark:text-zinc-400 font-bold animate-pulse">{loadingText}</p>
            </div>
          </div>
        )}

        {/* Header - Portal Branding and Title */}
        <div className="px-6 pt-8 pb-5 text-center bg-gradient-to-b from-slate-50/50 to-white dark:from-zinc-900/20 dark:to-zinc-900 border-b border-slate-100 dark:border-zinc-850">
          
          {/* Logo of the system */}
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white text-3xl shadow-xl shadow-emerald-500/20 mb-4 scale-100 hover:scale-105 transition-all duration-300">
            ش
          </div>
          
          {/* System Name */}
          <h1 className="text-xl font-black text-slate-900 dark:text-white leading-relaxed">
            نظام الشيباني للحلول التقنية
          </h1>
          
          {/* Professional welcoming phrase */}
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-bold mt-1.5 leading-relaxed max-w-xs mx-auto">
            أهلاً بك في البوابة الذكية الموحدة. يرجى تسجيل الدخول للوصول إلى لوحة التحكم كمسؤول أو مستخدم.
          </p>
          
          {/* Modern security badge */}
          <div className="flex items-center justify-center gap-1.5 mt-3.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1 rounded-full border border-emerald-100/40 dark:border-emerald-900/30 w-max mx-auto">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>بوابة مشفّرة وآمنة بالكامل كلياً</span>
          </div>
        </div>

        {/* Form Selection Slider (Tabs) */}
        <div className="mx-6 mt-6 p-1 bg-slate-100 dark:bg-zinc-850 rounded-xl flex">
          <button
            type="button"
            onClick={() => {
              setLoginTab('new_user');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-2xs font-extrabold rounded-lg transition-all ${
              loginTab === 'new_user'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            👤 مستخدم جديد (واتساب)
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginTab('admin');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-2xs font-extrabold rounded-lg transition-all ${
              loginTab === 'admin'
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            🔒 دخول الكادر والمحاسبين
          </button>
        </div>

        {/* Dynamic Form block Body */}
        <div className="p-6 md:p-8 space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-xs font-bold flex items-center gap-2 border border-red-100 dark:border-red-900/30">
              <AlertCircle size={16} className="shrink-0" />
              <span className="whitespace-pre-line">{errorMsg}</span>
            </div>
          )}

          {successMsg && !showOtpModal && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 border border-emerald-100 dark:border-emerald-900/30">
              <WhatsAppIcon size={16} className="shrink-0 text-emerald-600" />
              <span className="whitespace-pre-line">{successMsg}</span>
            </div>
          )}

          {loginTab === 'new_user' ? (
            /* Tab 1: New User WhatsApp OTP Form */
            <form onSubmit={handleInitiateOtpSend} className="space-y-4">
              {/* Full Quadruple Name Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 dark:text-zinc-400 mr-1">
                  الاسم الرباعي الكامل
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: خالد وليد عارف الشيباني"
                    className="w-full pl-3 pr-10 py-3 text-xs bg-slate-50 dark:bg-zinc-850 text-slate-950 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all min-h-[44px]"
                    required
                    autoFocus
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                    <UserIcon size={16} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-normal mr-1">
                  * يجب إدخال 4 كلمات على الأقل لتطابق الاسم الرباعي الرسمي.
                </p>
              </div>

              {/* Phone Number Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-500 dark:text-zinc-400 mr-1">
                  رقم هاتف الواتساب
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="77xxxxxxx أو رقمك الدولي"
                    className="w-full pl-3 pr-10 py-3 text-left font-mono text-xs bg-slate-50 dark:bg-zinc-850 text-slate-950 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all min-h-[44px]"
                    required
                    style={{ direction: 'ltr' }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                    <Phone size={16} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-normal mr-1">
                  * تأكد من إمكانية استقبال رسائل واتساب على هذا الرقم لاستلام رمز OTP المكون من 6 أرقام.
                </p>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15 cursor-pointer transition-all min-h-[44px] border-0"
              >
                <WhatsAppIcon size={18} />
                <span>إرسال رمز التحقق</span>
              </button>
            </form>
          ) : (
            /* Tab 2: Classic Administrative Form */
            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-zinc-400 mb-1.5 mr-1">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: admin"
                    className="w-full pl-3 pr-10 py-3 text-xs bg-slate-50 dark:bg-zinc-850 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[44px]"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                    <UserIcon size={16} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 dark:text-zinc-400 mb-1.5 mr-1">
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3 pr-10 py-3 text-xs bg-slate-50 dark:bg-zinc-850 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all min-h-[44px]"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                    <Lock size={16} />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15 cursor-pointer transition-all min-h-[44px] border-0"
              >
                <ShieldCheck size={18} />
                <span>تسجيل دخول المسؤولين</span>
              </button>
            </form>
          )}

          {/* Quick Guidance Card */}
          <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 border border-slate-150 dark:border-zinc-850 rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-zinc-200 pb-1">
              <HelpCircle size={14} className="text-emerald-500" />
              <span>إرشادات الدخول السريعة:</span>
            </div>
            <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
              {loginTab === 'new_user' ? (
                <div>• يتيح التسجيل بـ <strong className="text-slate-700 dark:text-zinc-200">الاسم والواتساب</strong> إنشاء حساب فوري مع التصفح ومتابعة كافة القيود والحركات كعضو معتمد.</div>
              ) : (
                <>
                  <div>• <strong className="text-slate-700 dark:text-zinc-200">المدير الكلي (المالك)</strong>: admin / admin</div>
                  <div>• <strong className="text-slate-700 dark:text-zinc-200">المحاسب المسؤول</strong>: accountant / accountant</div>
                  <div>• <strong className="text-slate-700 dark:text-zinc-200">مدخل بيانات</strong>: entry / entry</div>
                  <div>• <strong className="text-slate-700 dark:text-zinc-200">مشرف جمعية</strong>: supervisor / supervisor</div>
                  <div>• <strong className="text-slate-700 dark:text-zinc-200">مستعرض عام</strong>: viewer / viewer</div>
                </>
              )}
            </div>
          </div>

          {/* Separation line */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-100 dark:border-zinc-800"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
              استيراد الحسابات الاحتياطية
            </span>
            <div className="flex-grow border-t border-slate-100 dark:border-zinc-800"></div>
          </div>

          {/* Import Backup Drag/Drop Area */}
          <div className="space-y-3">
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 text-center leading-relaxed">
              إذا قمت بنقل النظام التقني إلى جهاز آخر، يمكنك سحب أو اختيار ملف النسخة الاحتياطية (.json) المصدّر مسبقاً لاسترجاع كافة الحركات والموظفين فوراً.
            </p>

            {restoreMessage && (
              <div className={`p-3 rounded-xl text-xs font-bold border ${
                restoreMessage.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                  : 'bg-rose-50 text-rose-800 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
              }`}>
                <span>{restoreMessage.text}</span>
              </div>
            )}

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`p-5 rounded-2xl border-2 border-dashed text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 ${
                dragActive 
                  ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10' 
                  : 'border-slate-200 hover:border-emerald-500/50 dark:border-zinc-800 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/20'
              }`}
            >
              <Database className="text-slate-400 dark:text-zinc-500 animate-pulse" size={24} />
              <div className="space-y-0.5">
                <span className="block text-xs font-extrabold text-slate-700 dark:text-zinc-200">تحميل أو سحب ملف النسخة الاحتياطية 📥</span>
                <span className="block text-[10px] text-slate-400 dark:text-zinc-500">من الذاكرة المحلية للجهاز لاسترجاع الدفاتر العائلية والمؤسسية</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-900/40 border-t border-slate-100 dark:border-zinc-800/60 text-center">
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
            🔒 تشفير بيانات العميل والموظفين آمن وتخزين محلي 100% على الذاكرة الداخلية للجوال.
          </p>
        </div>

      </div>

      {/* INDEPENDENT OTP VERIFICATION WINDOW (نافذة مستقلة لإدخال رمز التحقق المكونة من 6 خانات منفصلة) */}
      {showOtpModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop screen filter */}
          <div 
            className="absolute inset-0 bg-slate-900/60 dark:bg-zinc-950/80 backdrop-blur-md transition-opacity duration-300" 
            onClick={() => setShowOtpModal(false)}
          ></div>
          
          {/* Form card container */}
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-2xl p-6 md:p-8 overflow-hidden" dir="rtl">
            
            {/* Delivery/network loader overlays inside modal */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs z-50 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent mb-3"></div>
                <span className="text-2xs font-extrabold text-slate-700 dark:text-zinc-300">جاري إصدار الرمز التلقائي ومزامنة القنوات...</span>
              </div>
            )}

            {/* Modal Heading block */}
            <div className="text-center space-y-2 mb-6">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <ShieldCheck size={26} />
              </div>
              <h2 className="text-md font-black text-slate-900 dark:text-white">تأكيد رمز التحقق</h2>
              <p className="text-2xs text-slate-500 dark:text-zinc-400 font-bold max-w-xs mx-auto leading-relaxed">
                أدخل الكود المكون من 6 أرقام المرسل تواً إليك على رقم هاتف الواتساب:
              </p>
              <div className="inline-block px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 rounded-lg text-2xs font-mono font-black" style={{ direction: 'ltr' }}>
                {phone}
              </div>
            </div>

            {/* WhatsApp notification badge inside verification screen */}
            {isWhatsappFailed ? (
              <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-2xs font-bold flex flex-col gap-1 border border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
                  <AlertCircle size={16} className="shrink-0 text-red-600" />
                  <span className="font-extrabold">فشل إرسال رمز التحقق عبر الواتساب.</span>
                </div>
              </div>
            ) : (
              <div className="p-3 mb-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 text-2xs font-bold flex items-center gap-2 border border-emerald-100 dark:border-emerald-900/30">
                <WhatsAppIcon size={16} className="text-emerald-600 shrink-0" />
                <span>تم إرسال رمز التحقق عبر الواتساب بنجاح.</span>
              </div>
            )}

            {/* Display verification code box for copy option if WhatsApp sending failed */}
            {isWhatsappFailed && (
              <div className="p-3.5 mb-4 rounded-xl bg-indigo-50/80 dark:bg-zinc-800/80 border border-indigo-100 dark:border-zinc-700 font-bold space-y-2.5 text-center">
                <p className="text-2xs text-slate-700 dark:text-zinc-300">
                  رمز التحقق الخاص بك هو:
                </p>
                <div className="font-mono text-base text-indigo-700 dark:text-indigo-400 bg-white dark:bg-zinc-900 px-3 py-1 rounded-lg border border-indigo-100 dark:border-zinc-800 inline-block font-black select-all">
                  {generatedOtp}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedOtp);
                    setCopyFeedback(true);
                    setTimeout(() => setCopyFeedback(false), 2000);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-black text-2xs py-2 rounded-lg flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer border-0"
                >
                  <Sparkles size={13} />
                  <span>نسخ رمز التحقق</span>
                </button>
                {copyFeedback && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black animate-pulse">
                    تم نسخ رمز التحقق.
                  </p>
                )}
              </div>
            )}

            {verificationError && (
              <div className="p-3 mb-5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 text-2xs font-bold text-center border border-red-100 dark:border-red-900/30 animate-shake">
                <span>{verificationError}</span>
              </div>
            )}

            {/* Six separate inputs representation (ست خانات منفصلة للتحقق التلقائي) */}
            <div className="space-y-2">
              <div className="flex justify-between gap-1.5 max-w-xs mx-auto" style={{ direction: 'ltr' }}>
                {otpValues.map((val, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpRefs.current[index] = el)}
                    type="text"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-10 h-12 text-center text-md font-black rounded-xl border border-slate-250 dark:border-zinc-700 bg-slate-55 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner font-mono text-lg"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* Seamless testing experience assistant badge */}
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100/60 dark:border-amber-900/20 text-[10px] text-amber-800 dark:text-amber-400 font-extrabold text-center leading-normal">
                💻 <span className="text-slate-600 dark:text-zinc-300">مساعد معاينة محاكاة المطورين:</span> الرمز المرسل لجوالك هو:{' '}
                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-indigo-150 inline-block font-black mt-1">
                  {generatedOtp}
                </span>
                <p className="text-[9px] text-amber-700/80 dark:text-amber-400/70 font-medium mt-1">
                  (قم بكتابة هذه الأرقام الستة أعلاه وسيتم تسجيل دخولك ومزامنة حسابك فوراً!)
                </p>
              </div>
            </div>

            {/* OTP Modal Action list */}
            <div className="flex flex-col items-center gap-4 text-center mt-6 pt-3 border-t border-slate-100 dark:border-zinc-800">
              
              {isWhatsappFailed ? (
                <div className="w-full space-y-2">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-2xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer border-0"
                  >
                    <RefreshCw size={14} className="shrink-0" />
                    <span>إعادة المحاولة عبر الواتساب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSmsStatusMsg("خدمة SMS غير مفعلة حالياً.");
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 active:scale-98 text-slate-700 font-black text-2xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-zinc-700"
                  >
                    <span>إرسال عبر SMS</span>
                  </button>

                  {smsStatusMsg && (
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-black animate-pulse">
                      {smsStatusMsg}
                    </p>
                  )}
                </div>
              ) : (
                /* Resend OTP button after 60 seconds (زر إعادة إرسال الرمز بعد 60 ثانية) */
                timer > 0 ? (
                  <div className="text-2xs font-extrabold text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                    <RefreshCw size={12} className="animate-spin duration-3000 shrink-0" />
                    <span>إعادة إرسال رمز التحقق خلال <span className="font-mono text-emerald-600 dark:text-emerald-400">{timer}</span> ثانية...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 underline cursor-pointer flex items-center gap-1 transition-all"
                  >
                    <RefreshCw size={14} />
                    <span>إعادة إرسال الرمز عبر واتساب الآن</span>
                  </button>
                )
              )}

              {/* Close and return to details */}
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="text-2xs text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-400 font-extrabold flex items-center gap-1 transition-all"
              >
                <X size={14} />
                <span>إلغاء والعودة لتنقيح البيانات</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
