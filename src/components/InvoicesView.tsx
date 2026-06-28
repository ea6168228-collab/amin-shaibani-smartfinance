import React, { useState, useEffect } from 'react';
import { 
  FileText, ClipboardList, PenTool, BarChart3, AlertTriangle, 
  Layers, Package, ShieldCheck, Coins, Users 
} from 'lucide-react';
import { 
  Employee, Transaction, AppSettings, UserRole, 
  Invoice, Quotation, ClientOrder, Client, PaymentVoucher, TreasuryState,
  ClientDebt, ClientCollection
} from '../types';
import InvoicesTab from './invoice/InvoicesTab';
import QuotationsTab from './invoice/QuotationsTab';
import OrdersTab from './invoice/OrdersTab';
import InvoiceReportsTab from './invoice/InvoiceReportsTab';
import InvoiceAlertsTab from './invoice/InvoiceAlertsTab';

interface InvoicesViewProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  currentUserRole: UserRole;
  appSettings: AppSettings;
}

export default function InvoicesView({
  employees,
  setEmployees,
  transactions,
  setTransactions,
  currentUserRole,
  appSettings
}: InvoicesViewProps) {
  
  const loggedInUserName = localStorage.getItem('amin_sh_logged_user') || 'المحاسب المسؤول';
  const customUserId = localStorage.getItem('amin_sh_user_id') || '';
  const isCustomWorkspace = currentUserRole === UserRole.USER && !!customUserId && !['admin', 'accountant', 'viewer'].includes(customUserId);
  const prefix = isCustomWorkspace ? `_${customUserId}` : '';

  // Core Storage Keys
  const clientsKey = `amin_sh_clients${prefix}`;
  const invoicesKey = `amin_sh_invoices${prefix}`;
  const quotationsKey = `amin_sh_quotations${prefix}`;
  const ordersKey = `amin_sh_orders${prefix}`;
  const debtsKey = `amin_sh_client_debts${prefix}`;
  const collectionsKey = `amin_sh_client_collections${prefix}`;
  const vouchersKey = `amin_sh_vouchers${prefix}`;
  const treasuryKey = `amin_sh_treasury_state${prefix}`;

  // Tabs
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'quotations' | 'orders' | 'reports' | 'alerts'>('invoices');

  // --- LOCAL DATABASE STATES ---
  
  // Clients (shared)
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const data = localStorage.getItem(clientsKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.error(e); }
    return [];
  });

  // Invoices (new)
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const data = localStorage.getItem(invoicesKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.error(e); }
    return [];
  });

  // Quotations (new)
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    try {
      const data = localStorage.getItem(quotationsKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.error(e); }
    return [];
  });

  // Orders / Service requests (new)
  const [orders, setOrders] = useState<ClientOrder[]>(() => {
    try {
      const data = localStorage.getItem(ordersKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.error(e); }
    return [];
  });

  // Client Debts (shared)
  const [debts, setDebts] = useState<ClientDebt[]>(() => {
    try {
      const data = localStorage.getItem(debtsKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.error(e); }
    return [];
  });

  // Client Collections / Settle payments (shared)
  const [collections, setCollections] = useState<ClientCollection[]>(() => {
    try {
      const data = localStorage.getItem(collectionsKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.error(e); }
    return [];
  });

  // General accounting vouchers (shared)
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>(() => {
    try {
      const data = localStorage.getItem(vouchersKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.error(e); }
    return [];
  });

  // Treasury Cash State (shared)
  const [treasuryState, setTreasuryState] = useState<TreasuryState>(() => {
    const data = localStorage.getItem(treasuryKey);
    if (data) return JSON.parse(data);
    return {
      initialBalance: 1500000,
      currentBalance: 1500000,
      activities: []
    };
  });

  // --- AUTOMATIC OFFLINE SYNCS ---
  
  // Update local storage in real-time
  useEffect(() => {
    localStorage.setItem(invoicesKey, JSON.stringify(invoices));
  }, [invoices, invoicesKey]);

  useEffect(() => {
    localStorage.setItem(quotationsKey, JSON.stringify(quotations));
  }, [quotations, quotationsKey]);

  useEffect(() => {
    localStorage.setItem(ordersKey, JSON.stringify(orders));
  }, [orders, ordersKey]);

  useEffect(() => {
    localStorage.setItem(debtsKey, JSON.stringify(debts));
  }, [debts, debtsKey]);

  useEffect(() => {
    localStorage.setItem(collectionsKey, JSON.stringify(collections));
  }, [collections, collectionsKey]);

  useEffect(() => {
    localStorage.setItem(vouchersKey, JSON.stringify(vouchers));
  }, [vouchers, vouchersKey]);

  useEffect(() => {
    localStorage.setItem(treasuryKey, JSON.stringify(treasuryState));
  }, [treasuryState, treasuryKey]);

  // Handle updates made by others tabs to clients database (watch client database)
  useEffect(() => {
    const handleStorageChange = () => {
      const data = localStorage.getItem(clientsKey);
      if (data) setClients(JSON.parse(data));
    };
    window.addEventListener('storage', handleStorageChange);
    // Periodically sync too for safe offline inside iframe
    const interval = setInterval(handleStorageChange, 3000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [clientsKey]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Dynamic Tabs switcher */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800 no-print my-4">
        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`px-5 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'invoices'
              ? 'border-indigo-650 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FileText size={17} />
          شاشة الفواتير
        </button>

        <button
          onClick={() => setActiveSubTab('quotations')}
          className={`px-5 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'quotations'
              ? 'border-indigo-650 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <ClipboardList size={17} />
          شاشة عروض الأسعار
        </button>

        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-5 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'orders'
              ? 'border-indigo-650 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <PenTool size={17} />
          طلبات الأعمال والخدمات
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`px-5 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'reports'
              ? 'border-indigo-650 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <BarChart3 size={17} />
          التقارير التجارية
        </button>

        <button
          onClick={() => setActiveSubTab('alerts')}
          className={`px-5 py-3 text-sm font-black transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === 'alerts'
              ? 'border-indigo-650 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <AlertTriangle size={17} />
          التنبيهات التنفيذية والامتثال
        </button>
      </div>

      {/* RENDER ACTIVE SCREEN */}
      <div className="transition-all duration-200">
        {activeSubTab === 'invoices' && (
          <InvoicesTab
            invoices={invoices}
            setInvoices={setInvoices}
            clients={clients}
            vouchers={vouchers}
            setVouchers={setVouchers}
            treasuryState={treasuryState}
            setTreasuryState={setTreasuryState}
            debts={debts}
            setDebts={setDebts}
            collections={collections}
            setCollections={setCollections}
            currentUserRole={currentUserRole}
            appSettings={appSettings}
            loggedInUserName={loggedInUserName}
          />
        )}

        {activeSubTab === 'quotations' && (
          <QuotationsTab
            quotations={quotations}
            setQuotations={setQuotations}
            invoices={invoices}
            setInvoices={setInvoices}
            clients={clients}
            currentUserRole={currentUserRole}
            appSettings={appSettings}
            loggedInUserName={loggedInUserName}
            setActiveSubTab={setActiveSubTab}
          />
        )}

        {activeSubTab === 'orders' && (
          <OrdersTab
            orders={orders}
            setOrders={setOrders}
            quotations={quotations}
            setQuotations={setQuotations}
            invoices={invoices}
            setInvoices={setInvoices}
            clients={clients}
            employees={employees}
            currentUserRole={currentUserRole}
            appSettings={appSettings}
            loggedInUserName={loggedInUserName}
            setActiveSubTab={setActiveSubTab}
          />
        )}

        {activeSubTab === 'reports' && (
          <InvoiceReportsTab
            invoices={invoices}
            quotations={quotations}
            orders={orders}
            clients={clients}
            appSettings={appSettings}
          />
        )}

        {activeSubTab === 'alerts' && (
          <InvoiceAlertsTab
            invoices={invoices}
            quotations={quotations}
            orders={orders}
            clients={clients}
            appSettings={appSettings}
          />
        )}
      </div>
    </div>
  );
}
