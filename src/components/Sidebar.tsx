import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FilePieChart, 
  Sparkles, 
  Settings as SettingsIcon,
  ShieldCheck,
  Download,
  Moon,
  Sun,
  Laptop,
  Receipt,
  LogOut,
  Share2,
  FileDown,
  Coins,
  UserCheck,
  FileText,
  Wrench
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  institutionName: string;
  loggedInUserName: string;
  onLogout: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentUserRole,
  setCurrentUserRole,
  darkMode,
  setDarkMode,
  institutionName,
  loggedInUserName,
  onLogout
}: SidebarProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (window as any).pwaPrompt || null);
  const [showInstallBtn, setShowInstallBtn] = useState(true);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      const promptEvent = e.detail || e;
      setDeferredPrompt(promptEvent);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('pwa-prompt-available', handleBeforeInstall);
    window.addEventListener('pwa-app-installed', handleInstalled);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // Check if app is already running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener('pwa-prompt-available', handleBeforeInstall);
      window.removeEventListener('pwa-app-installed', handleInstalled);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const triggerInstall = async () => {
    // Check if the system is currently wrapped inside an iframe sandboxed workspace
    const isInIframe = window.self !== window.top;
    
    if (isInIframe) {
      alert('📲 ميزة التثبيت المباشر على الشاشة الرئيسية:\n\nأنت تتصفح النظام حالياً من داخل إطار المعاينة المعزول.\n\nلتثبيت التطبيق مباشرة على جوالك وبكبسة زر واحدة:\n1. اضغط على أيقونة (فتح في نافذة جديدة / Open in new tab) أعلى يسار المتصفح.\n2. اضغط على زر "تثبيت النظام علي الشاشة الرئيسية" هناك وسيعمل معك فوراً وبسرعة فائقة!');
      return;
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone || (window as any).pwaInstalled) {
      alert('النظام مثبت بالفعل على الشاشة الرئيسية.');
      return;
    }

    const activePrompt = deferredPrompt || (window as any).pwaPrompt;
    const userAgent = navigator.userAgent || '';
    const isChrome = /Chrome|CriOS/i.test(userAgent) && !/Edge|Edg|OPR|Opera/i.test(userAgent);

    if (activePrompt) {
      if (isChrome) {
        alert('اضغط على تثبيت لإضافة نظام الشيباني للحلول التقنية إلى الشاشة الرئيسية.');
      }
      try {
        await activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        if (outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
          (window as any).pwaInstalled = true;
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('Error triggering PWA installation:', err);
      }
    } else {
      // Robust multi-environment fallback instructions supporting Android Chrome, Samsung Internet, and iPhone Safari
      alert('📲 لتثبيت نظام الشيباني للحلول التقنية على الشاشة الرئيسية:\n\n1. اضغط على أيقونة القائمة (⋮) في أعلى اليسار.\n2. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home screen) أو "تثبيت التطبيق" (Install App).\n3. اضغط على "تثبيت" لتأكيد الإضافة.');
    }
  };

  const handleShareAPK = async () => {
    const appTitle = "نظام الشيباني للحلول التقنية";
    const appText = "يمكنك استخدام نظام الشيباني للحلول التقنية عبر الرابط التالي.";
    const appUrl = window.location.origin;

    try {
      if (navigator.share) {
        await navigator.share({
          title: appTitle,
          text: appText,
          url: appUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${appTitle}\n\n${appText}\n\n${appUrl}`);
        alert("تم نسخ رابط النظام ويمكنك مشاركته الآن.");
      }
    } catch (err: any) {
      // Check if the error is due to user canceling the share sheet/prompt
      const isCancellation = err && (
        err.name === 'AbortError' ||
        (err.message && (
          err.message.toLowerCase().includes('cancel') ||
          err.message.toLowerCase().includes('abort')
        ))
      );

      if (isCancellation) {
        console.log('Web share cancelled by user.');
        return;
      }

      console.error('Error during sharing:', err);
      try {
        await navigator.clipboard.writeText(`${appTitle}\n\n${appText}\n\n${appUrl}`);
        alert("تم نسخ رابط النظام ويمكنك مشاركته الآن.");
      } catch (clipboardErr) {
        alert(`${appTitle}\n\n${appText}\n\n${appUrl}`);
      }
    }
  };

  const getRoleLabel = (role: UserRole) => {
    const isCustomWorkspace = role === UserRole.USER && !!localStorage.getItem('amin_sh_user_id') && !['admin', 'accountant', 'viewer'].includes(localStorage.getItem('amin_sh_user_id') || '');
    if (isCustomWorkspace) {
      return 'مساحة عمل مخصصة (العمليات والتقارير)';
    }
    switch(role) {
      case UserRole.ADMIN: return 'مدير النظام (كامل الصلاحيات)';
      case UserRole.ACCOUNTANT: return 'محاسب (العمليات والتقارير)';
      case UserRole.USER: return 'مستخدم عادي (عرض وتقارير فقط)';
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'الرئيسية والإحصائيات', icon: LayoutDashboard },
    { id: 'employees', label: 'إدارة الموظفين', icon: Users },
    { id: 'transactions', label: 'شاشة السحوبات الشهرية', icon: Receipt },
    { id: 'associations', label: 'وحدة إدارة الجمعيات', icon: Coins, badge: 'رصيد دقيق' },
    { id: 'corporate-finance', label: 'المحاسبة المؤسسية والخزنة', icon: ShieldCheck, badge: 'جديد متكامل' },
    { id: 'customers', label: 'إدارة العملاء والديون والتحصيل', icon: UserCheck, badge: 'جديد متكامل' },
    { id: 'invoices', label: 'الفواتير وعروض الأسعار والطلبات', icon: FileText, badge: 'المرحلة ٧' },
    { id: 'reports', label: 'كشوفات الحساب والتقارير', icon: FilePieChart },
    { id: 'ai-assistant', label: 'المساعد الذكي أمين', icon: Sparkles, badge: 'جديد ذكي' },
    { id: 'settings', label: 'بيانات المؤسسة والإعدادات', icon: SettingsIcon },
    { id: 'maintenance', label: 'لوحة الصيانة والتشخيص', icon: Wrench, badge: 'الأمان' },
  ];

  const isCustomWorkspace = currentUserRole === UserRole.USER && !!localStorage.getItem('amin_sh_user_id') && !['admin', 'accountant', 'viewer'].includes(localStorage.getItem('amin_sh_user_id') || '');
  const filteredTabs = isCustomWorkspace ? tabs.filter(tab => tab.id !== 'settings' && tab.id !== 'maintenance') : tabs;

  return (
    <aside className="w-full lg:w-72 bg-gradient-to-b from-slate-900 to-indigo-950 text-slate-100 flex flex-col h-auto lg:h-screen lg:sticky lg:top-0 shadow-xl border-l border-indigo-900/40 no-print flex-shrink-0">
      {/* App Header Brand */}
      <div className="p-5 border-b border-indigo-900/50 flex flex-col gap-2 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 font-extrabold text-xl text-white">
            ش
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight text-white tracking-wide">
              {institutionName || "نظام الشيباني للحلول التقنية"}
            </h1>
            <span className="text-xs text-indigo-400 font-medium tracking-wider">
              نظام الشيباني للحلول التقنية v3.0
            </span>
          </div>
        </div>

        {/* User Profile Display and Secure Logout */}
        <div className="mt-4 p-3 rounded-xl bg-indigo-950/70 border border-indigo-800/40 flex flex-col gap-2 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-indigo-800/80 flex items-center justify-center font-black text-xs text-indigo-200 border border-indigo-700/40">
                {loggedInUserName ? loggedInUserName.substring(0, 2) : 'أش'}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-white leading-tight">
                  {loggedInUserName || 'مستخدم النظام'}
                </span>
                <span className="text-[10px] text-indigo-300 font-bold mt-0.5">
                  {getRoleLabel(currentUserRole)}
                </span>
              </div>
            </div>
            
            {/* Secure Logout action */}
            <button
               onClick={onLogout}
              className="p-2 rounded-lg text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 cursor-pointer transition-all active:scale-95 border-0 bg-transparent flex items-center justify-center"
              title="تسجيل الخروج الآمن"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredTabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-right flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                  : 'text-slate-300 hover:bg-indigo-950 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <IconComponent size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{tab.label}</span>
              </div>
              {tab.badge && (
                <span className="text-[9px] bg-red-500 text-white rounded-full px-2 py-0.5 animate-pulse font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Actions */}
      <div className="p-4 border-t border-indigo-900/50 bg-slate-950/20 space-y-2.5">
        {/* PWA Home Screen Install Button */}
        <button
          onClick={triggerInstall}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 shadow-md transition-all border border-indigo-500/20 active:scale-[0.98] cursor-pointer"
        >
          <Download size={14} />
          <span>📲 تثبيت النظام علي الشاشة الرئيسية</span>
        </button>

        {/* 📤 مشاركة التطبيق (Direct Share Button) */}
        <button
          onClick={handleShareAPK}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 shadow-md transition-all border border-emerald-500/20 active:scale-[0.98] cursor-pointer"
          title="مشاركة التطبيق أو رابط التحميل مباشرة"
        >
          <Share2 size={14} />
          <span>📤 مشاركة التطبيق</span>
        </button>

        {/* Theme Toggler */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-indigo-950/40 border border-indigo-900/60">
          <span className="text-xs text-slate-300">مظهر مريح للمحاسبين:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDarkMode(false)}
              className={`p-1.5 rounded-md transition-all ${!darkMode ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
              title="الوضع النهارى"
            >
              <Sun size={14} />
            </button>
            <button
              onClick={() => setDarkMode(true)}
              className={`p-1.5 rounded-md transition-all ${darkMode ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}
              title="الوضع الليلى"
            >
              <Moon size={14} />
            </button>
          </div>
        </div>

        {/* System Offline indicator */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium select-none">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>يدعم العمل دون اتصال بالإنترنت (Offline First)</span>
        </div>
      </div>
    </aside>
  );
}
