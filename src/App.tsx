import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import EmployeesView from './components/EmployeesView';
import TransactionsLogView from './components/TransactionsLogView';
import ReportsView from './components/ReportsView';
import AIAssistantView from './components/AIAssistantView';
import SettingsView from './components/SettingsView';
import WhatsAppSettingsView from './components/WhatsAppSettingsView';
import AssociationsView from './components/AssociationsView';
import CorporateFinanceView from './components/CorporateFinanceView';
import CustomersView from './components/CustomersView';
import InvoicesView from './components/InvoicesView';
import LoginView from './components/LoginView';
import MaintenanceView from './components/MaintenanceView';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  X, 
  Users, 
  Receipt, 
  FilePieChart, 
  Sparkles, 
  Settings as SettingsIcon,
  ChevronRight,
  Calculator,
  Laptop,
  Coins,
  ShieldCheck,
  UserCheck,
  FileText
} from 'lucide-react';

import { Employee, Transaction, AppSettings, UserRole } from './types';
import { INITIAL_EMPLOYEES, INITIAL_TRANSACTIONS } from './db/mockData';
import { addAuditLog } from './utils/auditLogger';
import { hasSystemPermission, isAbsoluteOwner } from './utils/permissions';
import { createLocalSnapshot, runAutoLoginBackupIfNeeded, restoreSystemFromPayload } from './utils/backupSystem';
import { canAccess } from './security/access';
import { isSessionValid } from './security/sessionGuard';
import { safeReadJSON, safeWriteJSON } from './utils/storage/safeStorage';

const DEFAULT_SETTINGS: AppSettings = {
  institution: {
    name: 'مؤسسة أمين الشيباني للتجارة العامة',
    logoText: 'الشيباني',
    phone: '777445566',
    address: 'الجمهورية اليمنية - صنعاء - شارع الستين',
    currency: 'ر.ي'
  },
  primaryColor: 'indigo',
  darkMode: false
};

const COLOR_THEMES: Record<string, Record<number, string>> = {
  indigo: {
    50: '#e0e7ff',
    100: '#c7d2fe',
    200: '#a5b4fc',
    300: '#818cf8',
    400: '#6366f1',
    500: '#4f46e5',
    600: '#4338ca',
    700: '#3730a3',
    800: '#1e1b4b',
    900: '#312e81',
    950: '#17153a'
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#022c22'
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03'
  },
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065'
  },
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
    950: '#042f2e'
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
    950: '#4c0519'
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // Secure offline login and user credentials storage
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loggedInUserName, setLoggedInUserName] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(UserRole.ADMIN);
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('amin_sh_user_id') || '';
  });

  const [session, setSession] = useState<any>(() => {
    return safeReadJSON<any>('user_session', null);
  });

  console.log('ENV MODE:', (import.meta as any).env?.MODE);
  console.log('SESSION:', session);

  const hasRole = (role: string) => {
    return session?.role?.toLowerCase() === role.toLowerCase();
  };

  const isAdmin = () => hasRole('admin');
  const isAccountant = () => hasRole('accountant');
  const isViewer = () => hasRole('viewer');

  const isCustomWorkspace = currentUserRole === UserRole.USER && !!currentUserId && !['admin', 'accountant', 'viewer'].includes(currentUserId);
  const employeesKey = isCustomWorkspace ? `amin_sh_employees_${currentUserId}` : 'amin_sh_employees';
  const transactionsKey = isCustomWorkspace ? `amin_sh_transactions_${currentUserId}` : 'amin_sh_transactions';
  const categoriesKey = isCustomWorkspace ? `amin_sh_categories_${currentUserId}` : 'amin_sh_categories';
  const settingsKey = isCustomWorkspace ? `amin_sh_settings_${currentUserId}` : 'amin_sh_settings';

  // 1. Initial mounting & database loading from localStorage (Offline-First)
  useEffect(() => {
    const cachedLoggedIn = localStorage.getItem('amin_sh_is_logged_in') === 'true';
    const cachedUserName = localStorage.getItem('amin_sh_logged_user') || '';
    const cachedUserRole = (localStorage.getItem('amin_sh_user_role') as UserRole) || UserRole.ADMIN;
    const cachedUserId = localStorage.getItem('amin_sh_user_id') || '';

    setIsLoggedIn(cachedLoggedIn);
    setLoggedInUserName(cachedUserName);
    setCurrentUserRole(cachedUserRole);
    setCurrentUserId(cachedUserId);

    const cachedSessionObj = safeReadJSON<any>('user_session', null);
    if (cachedLoggedIn) {
      const normalizedRole = cachedUserRole.toLowerCase() || 'viewer';
      const upgradedSession = {
        username: cachedSessionObj?.username || cachedSessionObj?.name || cachedUserName || 'viewer',
        fullName: cachedSessionObj?.fullName || cachedSessionObj?.name || cachedUserName || 'مستخدم افتراضي',
        role: normalizedRole,
        permissions: normalizedRole === 'admin' ? ['all'] : ['read', 'write'],
        activeBranchId: cachedSessionObj?.activeBranchId || 'branch_01',
        tokenExpires: cachedSessionObj?.tokenExpires || new Date(Date.now() + 3600 * 24 * 1000).toISOString()
      };

      if (!isSessionValid(upgradedSession)) {
        console.warn('⚠️ Session is invalid or expired. Logging out.');
        setIsLoggedIn(false);
        setLoggedInUserName('');
        setCurrentUserRole(UserRole.USER);
        setCurrentUserId('');
        setSession(null);
        localStorage.removeItem('amin_sh_is_logged_in');
        localStorage.removeItem('amin_sh_logged_user');
        localStorage.removeItem('amin_sh_user_role');
        localStorage.removeItem('amin_sh_user_id');
        localStorage.removeItem('amin_sh_active_role');
        localStorage.removeItem('user_session');
      } else {
        setSession(upgradedSession);
        safeWriteJSON('user_session', upgradedSession);
      }
    } else {
      setSession(null);
      localStorage.removeItem('user_session');
    }

    const isCustom = cachedUserId && !['admin', 'accountant', 'viewer'].includes(cachedUserId);
    const empKey = isCustom ? `amin_sh_employees_${cachedUserId}` : 'amin_sh_employees';
    const txKey = isCustom ? `amin_sh_transactions_${cachedUserId}` : 'amin_sh_transactions';
    const catKey = isCustom ? `amin_sh_categories_${cachedUserId}` : 'amin_sh_categories';
    const setKey = isCustom ? `amin_sh_settings_${cachedUserId}` : 'amin_sh_settings';

    const cachedEmployees = safeReadJSON<any[]>(empKey, null);
    const cachedTransactions = safeReadJSON<any[]>(txKey, null);
    const cachedCategories = safeReadJSON<any[]>(catKey, null);
    const cachedSettings = safeReadJSON<any>(setKey, null);

    if (cachedEmployees && Array.isArray(cachedEmployees)) {
      setEmployees(cachedEmployees);
    } else {
      if (isCustom) {
        setEmployees([]);
        safeWriteJSON(empKey, []);
      } else {
        setEmployees(INITIAL_EMPLOYEES);
        safeWriteJSON(empKey, INITIAL_EMPLOYEES);
      }
    }

    if (cachedTransactions && Array.isArray(cachedTransactions)) {
      setTransactions(cachedTransactions);
    } else {
      if (isCustom) {
        setTransactions([]);
        safeWriteJSON(txKey, []);
      } else {
        setTransactions(INITIAL_TRANSACTIONS);
        safeWriteJSON(txKey, INITIAL_TRANSACTIONS);
      }
    }

    if (cachedCategories && Array.isArray(cachedCategories)) {
      setCustomCategories(cachedCategories);
    } else {
      if (isCustom) {
        setCustomCategories([]);
        safeWriteJSON(catKey, []);
      } else {
        setCustomCategories(['سلفة الخميس العادية', 'مساهمة الكسوة والمناسبات']);
      }
    }

    if (cachedSettings) {
      setAppSettings(cachedSettings);
    } else {
      setAppSettings(DEFAULT_SETTINGS);
    }

    if (cachedLoggedIn) {
      const activeRole = localStorage.getItem('amin_sh_active_role');
      if (!activeRole) {
        let defaultActive = 'owner';
        if (cachedUserId === 'admin') defaultActive = 'owner';
        else if (cachedUserId === 'accountant') defaultActive = 'accountant';
        else if (cachedUserId === 'entry') defaultActive = 'data_entry';
        else if (cachedUserId === 'supervisor') defaultActive = 'supervisor';
        else if (cachedUserId === 'viewer') defaultActive = 'view_only';
        else {
          const isCustom = cachedUserId && !['admin', 'accountant', 'viewer'].includes(cachedUserId);
          if (isCustom) defaultActive = 'owner';
          else defaultActive = 'view_only';
        }
        localStorage.setItem('amin_sh_active_role', defaultActive);
      }
      runAutoLoginBackupIfNeeded();
    }
  }, []);

  // 2. State Auto-saving triggered upon modification
  useEffect(() => {
    if (isCustomWorkspace) {
      localStorage.setItem(employeesKey, JSON.stringify(employees));
    } else if (employees.length > 0) {
      localStorage.setItem(employeesKey, JSON.stringify(employees));
    }
  }, [employees, employeesKey, isCustomWorkspace]);

  useEffect(() => {
    if (isCustomWorkspace) {
      localStorage.setItem(transactionsKey, JSON.stringify(transactions));
    } else if (transactions.length > 0) {
      localStorage.setItem(transactionsKey, JSON.stringify(transactions));
    }
  }, [transactions, transactionsKey, isCustomWorkspace]);

  useEffect(() => {
    if (isCustomWorkspace) {
      localStorage.setItem(categoriesKey, JSON.stringify(customCategories));
    } else if (customCategories.length > 0) {
      localStorage.setItem(categoriesKey, JSON.stringify(customCategories));
    }
  }, [customCategories, categoriesKey, isCustomWorkspace]);

  useEffect(() => {
    localStorage.setItem(settingsKey, JSON.stringify(appSettings));
  }, [appSettings, settingsKey]);

  // 3. Sync Dark Mode to documentElement DOM level
  const isDarkMode = appSettings.darkMode;
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handles successful user login and sets sessions locally
  const handleLoginSuccess = (userName: string, role: UserRole, userId?: string) => {
    const id = userId || '';
    setIsLoggedIn(true);
    setLoggedInUserName(userName);
    setCurrentUserRole(role);
    setCurrentUserId(id);
    localStorage.setItem('amin_sh_is_logged_in', 'true');
    localStorage.setItem('amin_sh_logged_user', userName);
    localStorage.setItem('amin_sh_user_role', role);
    localStorage.setItem('amin_sh_user_id', id);

    const userSession = {
      name: userName,
      role: role,
      id: id
    };
    const normalizedRole = userSession.role?.toLowerCase?.() || 'viewer';
    const cleanSession = {
      ...userSession,
      role: normalizedRole
    };
    setSession(cleanSession);
    localStorage.setItem('user_session', JSON.stringify(cleanSession));

    // Set the specific active role for granular authorization layers
    let activeRole = 'owner';
    if (id === 'admin') activeRole = 'owner';
    else if (id === 'accountant') activeRole = 'accountant';
    else if (id === 'entry') activeRole = 'data_entry';
    else if (id === 'supervisor') activeRole = 'supervisor';
    else if (id === 'viewer') activeRole = 'view_only';
    else {
      const isCustom = id && !['admin', 'accountant', 'viewer'].includes(id);
      if (isCustom) activeRole = 'owner'; // WhatsApp workspace owns its records
      else activeRole = 'view_only';
    }
    localStorage.setItem('amin_sh_active_role', activeRole);

    addAuditLog('تسجيل الدخول', 'النظام الدفتري', `تم تسجيل دخول المحاسب/المسؤول: ${userName}`);
    runAutoLoginBackupIfNeeded();

    const isCustom = id && !['admin', 'accountant', 'viewer'].includes(id);
    const empKey = isCustom ? `amin_sh_employees_${id}` : 'amin_sh_employees';
    const txKey = isCustom ? `amin_sh_transactions_${id}` : 'amin_sh_transactions';
    const catKey = isCustom ? `amin_sh_categories_${id}` : 'amin_sh_categories';
    const setKey = isCustom ? `amin_sh_settings_${id}` : 'amin_sh_settings';

    const diskEmployees = localStorage.getItem(empKey);
    const diskTransactions = localStorage.getItem(txKey);
    const diskCategories = localStorage.getItem(catKey);
    const diskSettings = localStorage.getItem(setKey);

    if (diskEmployees) {
      setEmployees(JSON.parse(diskEmployees));
    } else {
      if (isCustom) {
        setEmployees([]);
        localStorage.setItem(empKey, JSON.stringify([]));
      } else {
        setEmployees(INITIAL_EMPLOYEES);
      }
    }

    if (diskTransactions) {
      setTransactions(JSON.parse(diskTransactions));
    } else {
      if (isCustom) {
        setTransactions([]);
        localStorage.setItem(txKey, JSON.stringify([]));
      } else {
        setTransactions(INITIAL_TRANSACTIONS);
      }
    }

    if (diskCategories) {
      setCustomCategories(JSON.parse(diskCategories));
    } else {
      if (isCustom) {
        setCustomCategories([]);
        localStorage.setItem(catKey, JSON.stringify([]));
      } else {
        setCustomCategories(['سلفة الخميس العادية', 'مساهمة الكسوة والمناسبات']);
      }
    }

    if (diskSettings) {
      setAppSettings(JSON.parse(diskSettings));
    } else {
      setAppSettings(DEFAULT_SETTINGS);
    }
  };

  // Handles secure user logout
  const handleLogout = () => {
    createLocalSnapshot('auto_logout', `نسخة احتياطية تلقائية عند الخروج الصريح لـ ${loggedInUserName}`);
    addAuditLog('تسجيل الخروج', 'النظام الدفتري', `تم تسجيل خروج المستخدم: ${loggedInUserName}`);

    setIsLoggedIn(false);
    setLoggedInUserName('');
    setCurrentUserRole(UserRole.USER);
    setCurrentUserId('');
    setSession(null);
    localStorage.removeItem('amin_sh_is_logged_in');
    localStorage.removeItem('amin_sh_logged_user');
    localStorage.removeItem('amin_sh_user_role');
    localStorage.removeItem('amin_sh_user_id');
    localStorage.removeItem('amin_sh_active_role');
    localStorage.removeItem('user_session');
    setActiveTab('dashboard'); // reset to default tab

    const empKey = 'amin_sh_employees';
    const txKey = 'amin_sh_transactions';
    const catKey = 'amin_sh_categories';
    const setKey = 'amin_sh_settings';

    try {
      const parsedEmp = JSON.parse(localStorage.getItem(empKey) || '[]');
      setEmployees(Array.isArray(parsedEmp) ? parsedEmp : INITIAL_EMPLOYEES);
    } catch {
      setEmployees(INITIAL_EMPLOYEES);
    }

    try {
      const parsedTx = JSON.parse(localStorage.getItem(txKey) || '[]');
      setTransactions(Array.isArray(parsedTx) ? parsedTx : INITIAL_TRANSACTIONS);
    } catch {
      setTransactions(INITIAL_TRANSACTIONS);
    }

    try {
      const parsedCat = JSON.parse(localStorage.getItem(catKey) || '[]');
      setCustomCategories(Array.isArray(parsedCat) ? parsedCat : ['سلفة الخميس العادية', 'مساهمة الكسوة والمناسبات']);
    } catch {
      setCustomCategories(['سلفة الخميس العادية', 'مساهمة الكسوة والمناسبات']);
    }

    try {
      const parsedSet = JSON.parse(localStorage.getItem(setKey) || '{}');
      setAppSettings(parsedSet && typeof parsedSet === 'object' && !Array.isArray(parsedSet) ? parsedSet : DEFAULT_SETTINGS);
    } catch {
      setAppSettings(DEFAULT_SETTINGS);
    }
  };

  // Handles restoring absolute database from JSON file (reusable on logins / settings)
  const handleImportBackup = async (file: File): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          if (content.employees && content.transactions) {
            setEmployees(content.employees);
            setTransactions(content.transactions);
            localStorage.setItem('amin_sh_employees', JSON.stringify(content.employees));
            localStorage.setItem('amin_sh_transactions', JSON.stringify(content.transactions));

            if (content.customCategories) {
              setCustomCategories(content.customCategories);
              localStorage.setItem('amin_sh_categories', JSON.stringify(content.customCategories));
            }
            if (content.appSettings) {
              setAppSettings(content.appSettings);
              localStorage.setItem('amin_sh_settings', JSON.stringify(content.appSettings));
            }
            resolve({
              success: true,
              message: `تم استرجاع الحسابات بنجاح! تم تحميل (${content.employees.length}) موظف مع سجل (${content.transactions.length}) حركات مالية دفترية وافدة.`
            });
          } else {
            resolve({
              success: false,
              message: 'ملف المزامنة غير متوافق مع نظام أمين الشيباني.'
            });
          }
        } catch (err: any) {
          resolve({
            success: false,
            message: `فشل قراءة الملف: ${err?.message || 'تأكد من اختيار نسخة احتياطية صالحة.'}`
          });
        }
      };
      reader.onerror = () => {
        resolve({
          success: false,
          message: 'حدث خطأ غير متوقع أثناء فتح الملف.'
        });
      };
      reader.readAsText(file);
    });
  };

  // Handle in-line state setters
  const toggleDarkMode = (val: boolean) => {
    setAppSettings(prev => ({ ...prev, darkMode: val }));
  };

  // Render correct tab view dynamically
  const renderTabContent = () => {
    const isReadOnly = !!appSettings.readonlyMode;
    const userRole = session?.role || 'viewer';

    const renderAccessDenied = (moduleLabel: string) => {
      return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-slate-250 dark:border-zinc-800 text-center shadow-lg max-w-lg mx-auto my-10">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">الوصول مقيد - حماية صلاحيات أمين</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
            عذراً، لا تمتلك الصلاحية الكافية لاستعراض أو تعديل قسم ({moduleLabel}) على مستوى النظام. يرجى التواصل مع مالك النظام للحصول على الإذن المطلوب.
          </p>
        </div>
      );
    };

    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            employees={employees} 
            transactions={transactions} 
            setActiveTab={setActiveTab}
          />
        );
      case 'employees':
        if (!canAccess(userRole, 'employees')) {
          return renderAccessDenied('الموظفين والسجلات الدفترية');
        }
        return (
          <EmployeesView 
            employees={employees} 
            setEmployees={setEmployees}
            currentUserRole={currentUserRole}
            isReadOnly={isReadOnly}
            transactions={transactions}
            setTransactions={setTransactions}
          />
        );
      case 'transactions':
        if (!canAccess(userRole, 'employees')) {
          return renderAccessDenied('سجل العمليات والقيود اليومية');
        }
        return (
          <TransactionsLogView 
            employees={employees} 
            transactions={transactions} 
            setTransactions={setTransactions}
            currentUserRole={currentUserRole}
            customCategories={customCategories}
            setCustomCategories={setCustomCategories}
            isReadOnly={isReadOnly}
          />
        );
      case 'reports':
        return (
          <ReportsView 
            employees={employees} 
            transactions={transactions} 
            appSettings={appSettings}
          />
        );
      case 'associations':
        if (!canAccess(userRole, 'associations')) {
          return renderAccessDenied('الجمعيات التعاونية السكنية');
        }
        return (
          <AssociationsView 
            employees={employees}
            transactions={transactions}
            setTransactions={setTransactions}
            currentUserRole={currentUserRole}
            appSettings={appSettings}
          />
        );
      case 'corporate-finance':
        if (!canAccess(userRole, 'corporate_finance')) {
          return renderAccessDenied('المالية العامة والحسابات الختامية');
        }
        return (
          <CorporateFinanceView 
            employees={employees}
            setEmployees={setEmployees}
            transactions={transactions}
            setTransactions={setTransactions}
            currentUserRole={currentUserRole}
            appSettings={appSettings}
          />
        );
      case 'customers':
        return (
          <CustomersView 
            employees={employees}
            setEmployees={setEmployees}
            transactions={transactions}
            setTransactions={setTransactions}
            currentUserRole={currentUserRole}
            appSettings={appSettings}
          />
        );
      case 'invoices':
        return (
          <InvoicesView 
            employees={employees}
            setEmployees={setEmployees}
            transactions={transactions}
            setTransactions={setTransactions}
            currentUserRole={currentUserRole}
            appSettings={appSettings}
          />
        );
      case 'ai-assistant':
        return (
          <AIAssistantView 
            employees={employees} 
            transactions={transactions} 
            appSettings={appSettings}
            customCategories={customCategories}
          />
        );
      case 'settings':
        if (isCustomWorkspace) {
          return (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-slate-250 dark:border-zinc-800 text-center shadow-lg max-w-lg mx-auto my-10">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <SettingsIcon size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">قسم مغلق وغير متاح الصلاحية لك</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                عذراً، مساحات العمل المستقلة المعزولة لا تمتلك الصلاحية للتحكم في الإعدادات الأمنية للمدير أو خيارت تهيئة النظام العامة.
              </p>
            </div>
          );
        }
        if (!canAccess(userRole, 'settings')) {
          return renderAccessDenied('الإعدادات الأمنية والمحاسبية للمنظومة');
        }
        return (
          <SettingsView 
            appSettings={appSettings}
            setAppSettings={setAppSettings}
            employees={employees}
            setEmployees={setEmployees}
            transactions={transactions}
            setTransactions={setTransactions}
            customCategories={customCategories}
            setCustomCategories={setCustomCategories}
            currentUserRole={currentUserRole}
          />
        );
      case 'whatsapp-settings':
        return (
          <WhatsAppSettingsView 
            isReadOnly={isReadOnly}
          />
        );
      case 'maintenance':
        if (!canAccess(userRole, 'maintenance')) {
          return renderAccessDenied('إدارة الصيانة وحقيبة الأمن السيبراني');
        }
        return (
          <MaintenanceView 
            employees={employees}
            setEmployees={setEmployees}
            transactions={transactions}
            setTransactions={setTransactions}
            currentUserRole={currentUserRole}
            isReadOnly={isReadOnly}
          />
        );
      default:
        return (
          <div className="text-center py-10 font-bold text-slate-500">
            شاشة غير موجودة مبرمجة حالياً في الأنظمة.
          </div>
        );
    }
  };

  // Let's determine the details for the section header dynamically in App
  const getSectionHeaderDetails = () => {
    switch (activeTab) {
      case 'employees':
        return {
          title: 'إدارة الموظفين والملفات المباشرة',
          icon: <Users className="text-indigo-600 dark:text-indigo-400" size={22} />,
          countText: `عدد الموظفين: ${employees.length} موظف مسجل`
        };
      case 'transactions':
        return {
          title: 'شاشة السحوبات والقيود الشهرية',
          icon: <Receipt className="text-indigo-600 dark:text-indigo-400" size={22} />,
          countText: `إجمالي الحركات: ${transactions.length} حركة مسجلة`
        };
      case 'associations':
        return {
          title: 'دفاتر السجل المحاسبي للجمعيات الحسابية',
          icon: <Coins className="text-indigo-600 dark:text-indigo-400" size={22} />,
          countText: 'إدارة متكاملة للمشتركين والمدراء والتدقيق المالي'
        };
      case 'corporate-finance':
        return {
          title: 'المحاسبة المؤسسية والخزنة العامة',
          icon: <ShieldCheck className="text-indigo-600 dark:text-indigo-400" size={22} />,
          countText: 'اللوحة المالية الشاملة، الصندوق الرئيسي، والسندات المقيدة'
        };
      case 'customers':
        return {
          title: 'إدارة شؤون العملاء والديون والتحصيل',
          icon: <UserCheck className="text-indigo-600 dark:text-indigo-400" size={22} />,
          countText: 'إدارة متكاملة للعملاء والخدمات والذمم والسندات والتحصيل'
        };
      case 'invoices':
        return {
          title: 'فواتير المبيعات وعروض الأسعار وطلبات الأعمال',
          icon: <FileText className="text-indigo-600 dark:text-indigo-400" size={22} />,
          countText: 'إدارة تجارية ذكية للربط المحاسبي بالعملاء وتتبع الأوراق المالية والتحصيل والتنبيهات المتقدمة'
        };
      case 'reports':
        return {
          title: 'كشوفات الحساب والتقارير المالية',
          icon: <FilePieChart className="text-indigo-600 dark:text-indigo-400" size={22} />,
          countText: `عدد الحسابات النشطة: ${employees.filter(e => !e.isArchived).length} حساب`
        };
      case 'ai-assistant':
        return {
          title: 'المساعد المحاسبي الذكي أمين',
          icon: <Sparkles className="text-indigo-600 dark:text-indigo-400" size={22} />,
          countText: 'تحليل وتدقيق ذكي وتطبيق توصيات'
        };
      case 'settings':
        return {
          title: 'بيانات المؤسسة والإعدادات العامة',
          icon: <SettingsIcon className="text-indigo-600 dark:text-indigo-400" size={22} />,
          countText: 'خيارات التخصيص والأمان للمؤسسة'
        };
      case 'whatsapp-settings':
        return {
          title: 'إعدادات بوابة WhatsApp API',
          icon: <Laptop className="text-indigo-600 dark:text-indigo-400" size={22} />,
          countText: 'التهيئة التقنية واختبار بث الإرسال'
        };
      case 'maintenance':
        return {
          title: 'لوحة الصيانة والتشخيص والاتساق',
          icon: <ShieldCheck className="text-indigo-600 dark:text-indigo-400" size={22} />,
          countText: 'الرقابة المالية النشطة وصيانة كتل البيانات'
        };
      default:
        return null;
    }
  };

  const currentSectionHeader = getSectionHeaderDetails();
  const currentTheme = COLOR_THEMES[appSettings.primaryColor || 'indigo'] || COLOR_THEMES.indigo;

  if (!isLoggedIn) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --color-indigo-50: ${currentTheme[50]} !important;
            --color-indigo-100: ${currentTheme[100]} !important;
            --color-indigo-200: ${currentTheme[200]} !important;
            --color-indigo-300: ${currentTheme[300]} !important;
            --color-indigo-400: ${currentTheme[400]} !important;
            --color-indigo-500: ${currentTheme[500]} !important;
            --color-indigo-600: ${currentTheme[600]} !important;
            --color-indigo-700: ${currentTheme[700]} !important;
            --color-indigo-800: ${currentTheme[800]} !important;
            --color-indigo-900: ${currentTheme[900]} !important;
            --color-indigo-950: ${currentTheme[950]} !important;
          }
        ` }} />
        <LoginView 
          onLoginSuccess={handleLoginSuccess}
          onImportBackup={handleImportBackup}
        />
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --color-indigo-50: ${currentTheme[50]} !important;
          --color-indigo-100: ${currentTheme[100]} !important;
          --color-indigo-200: ${currentTheme[200]} !important;
          --color-indigo-300: ${currentTheme[300]} !important;
          --color-indigo-400: ${currentTheme[400]} !important;
          --color-indigo-500: ${currentTheme[500]} !important;
          --color-indigo-600: ${currentTheme[600]} !important;
          --color-indigo-700: ${currentTheme[700]} !important;
          --color-indigo-800: ${currentTheme[800]} !important;
          --color-indigo-900: ${currentTheme[900]} !important;
          --color-indigo-950: ${currentTheme[950]} !important;
        }
      ` }} />
      <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 dark:bg-zinc-950 dark:text-zinc-100 transition-colors duration-200">
      
      {/* Sidebar Component (Persistent navigation and theme / PWA controls) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUserRole={currentUserRole}
        setCurrentUserRole={setCurrentUserRole}
        darkMode={isDarkMode}
        setDarkMode={toggleDarkMode}
        institutionName={appSettings.institution.name}
        loggedInUserName={loggedInUserName}
        onLogout={handleLogout}
        session={session}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 p-3 md:p-6 lg:p-8 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
            {activeTab === 'dashboard' ? (
              <div>
                {/* Responsive Header for Mobile Screens */}
                <header className="flex lg:hidden items-center justify-between border-b border-slate-100 dark:border-zinc-850 pb-4 mb-6 no-print">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-xs">
                      أ.ش
                    </div>
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate max-w-[170px]">
                      {appSettings.institution.name}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full px-2 py-0.5 select-none font-serif tracking-wider">
                    المساعد الذكي v3.0
                  </span>
                </header>
                {renderTabContent()}
              </div>
            ) : (
              currentSectionHeader && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xl overflow-hidden flex flex-col min-h-[calc(100vh-6rem)] lg:min-h-[calc(100vh-4rem)]">
                  {/* Page Header Area with Clear Title, Back, Close buttons, and Dynamic Registry Counter */}
                  <div className="bg-slate-50 dark:bg-zinc-900/40 px-4 py-4 md:px-6 md:py-5 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
                    
                    {/* Right: Section Icon, Section Title, and Record Count */}
                    <div className="flex items-center gap-3.5">
                      <div className="p-3 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700/60 rounded-xl shadow-sm">
                        {currentSectionHeader.icon}
                      </div>
                      <div>
                        <h2 className="text-base md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5 leading-none">
                          {currentSectionHeader.title}
                        </h2>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100/40 dark:border-indigo-900/30">
                            {currentSectionHeader.countText}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Left: Close and Back Actions (Large, legible touch targets for robust user experience) */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {/* Back Button */}
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-white dark:bg-zinc-800 hover:bg-slate-150 dark:hover:bg-zinc-700 active:scale-95 text-slate-700 dark:text-zinc-200 text-xs font-black px-4 py-3 md:py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm transition-all cursor-pointer min-h-[44px]"
                      >
                        <ArrowRight size={16} className="text-slate-500 dark:text-zinc-400" />
                        <span>رجوع للرئيسية</span>
                      </button>

                      {/* Close Button */}
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 dark:bg-rose-950/30 dark:text-rose-450 dark:hover:bg-rose-950/50 text-xs font-black px-4 py-3 md:py-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30 shadow-sm transition-all cursor-pointer min-h-[44px]"
                        title="إغلاق القسم الحالي"
                      >
                        <X size={16} />
                        <span>إغلاق القسم</span>
                      </button>
                    </div>
                  </div>

                  {/* Section Components Body Area */}
                  <div className="p-4 md:p-6 lg:p-8 flex-1">
                    {renderTabContent()}
                  </div>
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
    </>
  );
}
