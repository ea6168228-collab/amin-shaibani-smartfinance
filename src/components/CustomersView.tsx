import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserPlus, Phone, MapPin, Briefcase, Calendar, 
  CheckCircle, AlertTriangle, ShieldCheck, Search, Filter, 
  TrendingUp, TrendingDown, DollarSign, Printer, FileText, 
  Trash2, Archive, RotateCcw, Edit, Plus, ArrowLeft, ArrowUpRight, 
  ArrowDownLeft, Clock, Info, RefreshCw, Layers, Shield
} from 'lucide-react';
import { 
  Client, ClientService, ClientDebt, ClientCollection, 
  PaymentVoucher, TreasuryState, AppSettings, UserRole, TreasuryActivity 
} from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { isNativeCapacitor, saveAndSharePdf } from '../utils/capacitorAndroidHelper';

interface CustomersViewProps {
  employees: any[];
  setEmployees: React.Dispatch<React.SetStateAction<any[]>>;
  transactions: any[];
  setTransactions: React.Dispatch<React.SetStateAction<any[]>>;
  currentUserRole: UserRole;
  appSettings: AppSettings;
}

export default function CustomersView({
  employees,
  setEmployees,
  transactions,
  setTransactions,
  currentUserRole,
  appSettings
}: CustomersViewProps) {
  
  const loggedInUserName = localStorage.getItem('amin_sh_logged_user') || 'المحاسب';
  const customUserId = localStorage.getItem('amin_sh_user_id') || '';
  const isCustomWorkspace = currentUserRole === UserRole.USER && !!customUserId && !['admin', 'accountant', 'viewer'].includes(customUserId);
  const prefix = isCustomWorkspace ? `_${customUserId}` : '';

  // Storage Keys
  const clientsKey = `amin_sh_clients${prefix}`;
  const servicesKey = `amin_sh_client_services${prefix}`;
  const debtsKey = `amin_sh_client_debts${prefix}`;
  const collectionsKey = `amin_sh_client_collections${prefix}`;
  const serviceTypesKey = `amin_sh_client_service_types${prefix}`;
  const treasuryKey = `amin_sh_treasury_state${prefix}`;
  const vouchersKey = `amin_sh_vouchers${prefix}`;

  // Core States
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

  const [services, setServices] = useState<ClientService[]>(() => {
    try {
      const data = localStorage.getItem(servicesKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.error(e); }
    return [];
  });

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

  const [serviceTypes, setServiceTypes] = useState<string[]>(() => {
    try {
      const data = localStorage.getItem(serviceTypesKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.error(e); }
    return ['خدمة التحصيل', 'استشارة قانونية', 'تخليص جمركي', 'خدمة شحن وتوصيل', 'صيانة تقنية', 'عقارات ومقاولات', 'أخرى'];
  });

  // Load standard vouchers and treasury to integrate
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

  const [treasuryState, setTreasuryState] = useState<TreasuryState>(() => {
    const data = localStorage.getItem(treasuryKey);
    if (data) {
      return JSON.parse(data);
    }
    return {
      initialBalance: 0,
      currentBalance: 0,
      activities: []
    };
  });

  // Sync back to localStorage
  useEffect(() => {
    localStorage.setItem(clientsKey, JSON.stringify(clients));
  }, [clients, clientsKey]);

  useEffect(() => {
    localStorage.setItem(servicesKey, JSON.stringify(services));
  }, [services, servicesKey]);

  useEffect(() => {
    localStorage.setItem(debtsKey, JSON.stringify(debts));
  }, [debts, debtsKey]);

  useEffect(() => {
    localStorage.setItem(collectionsKey, JSON.stringify(collections));
  }, [collections, collectionsKey]);

  useEffect(() => {
    localStorage.setItem(serviceTypesKey, JSON.stringify(serviceTypes));
  }, [serviceTypes, serviceTypesKey]);

  useEffect(() => {
    localStorage.setItem(vouchersKey, JSON.stringify(vouchers));
  }, [vouchers, vouchersKey]);

  useEffect(() => {
    localStorage.setItem(treasuryKey, JSON.stringify(treasuryState));
  }, [treasuryState, treasuryKey]);

  // UI States
  const [activeTab, setActiveTab] = useState<'clients' | 'services' | 'debts_collections' | 'alerts' | 'reports'>('clients');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modals / Specific Detail states
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientType, setNewClientType] = useState<'individual' | 'company' | 'agency' | 'other'>('individual');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // New Service states
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceClientId, setServiceClientId] = useState('');
  const [serviceTypeSelected, setServiceTypeSelected] = useState('خدمة التحصيل');
  const [customServiceType, setCustomServiceType] = useState('');
  const [serviceCost, setServiceCost] = useState<number>(0);
  const [servicePaid, setServicePaid] = useState<number>(0);
  const [serviceNotes, setServiceNotes] = useState('');
  const [serviceStatus, setServiceStatus] = useState<'new' | 'in_progress' | 'completed' | 'cancelled'>('new');

  // New Collection states
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionClientId, setCollectionClientId] = useState('');
  const [collectionDebtId, setCollectionDebtId] = useState('');
  const [collectionAmount, setCollectionAmount] = useState<number>(0);
  const [collectionMethod, setCollectionMethod] = useState<'cash' | 'check' | 'bank_transfer' | 'other'>('cash');
  const [linkToTreasury, setLinkToTreasury] = useState(true);
  const [linkToVoucher, setLinkToVoucher] = useState(true);
  const [collectionNotes, setCollectionNotes] = useState('');

  // Alerts configuration state
  const debtLimit = 500000; // حد المديونية الافتراضي

  // Reports filters
  const [selectedReportType, setSelectedReportType] = useState<string>('active_clients');
  const [reportTargetClientId, setReportTargetClientId] = useState<string>('all');
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [pdfGenerating, setPdfGenerating] = useState(false);

  // Stats calculation
  const stats = useMemo(() => {
    const totalClientsCount = clients.length;
    const activeClientsCount = clients.filter(c => c.status === 'active').length;
    const suspendedClientsCount = clients.filter(c => c.status === 'suspended').length;
    const archivedClientsCount = clients.filter(c => c.status === 'archived').length;

    // Total outstanding debt
    const totalRemainingDebts = debts.reduce((acc, d) => acc + (d.remaining), 0);
    // Total services cost vs total paid
    const totalServicesCost = services.reduce((acc, s) => acc + s.cost, 0);
    const totalServicesPaid = services.reduce((acc, s) => acc + s.paidAmount, 0);
    const totalCollectionsCount = collections.reduce((acc, c) => acc + c.amountCollected, 0);

    return {
      totalClientsCount,
      activeClientsCount,
      suspendedClientsCount,
      archivedClientsCount,
      totalRemainingDebts,
      totalServicesCost,
      totalServicesPaid,
      totalCollectionsCount
    };
  }, [clients, services, debts, collections]);

  // Alerts generator
  const generatedAlerts = useMemo(() => {
    const alertsList: { id: string; type: 'danger' | 'warning' | 'info'; title: string; text: string; date: string }[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Check overdue debts
    debts.forEach(d => {
      if (d.remaining > 0 && d.dueDate < today && d.status !== 'paid') {
        const client = clients.find(c => c.id === d.customerId);
        if (client && client.status !== 'archived') {
          alertsList.push({
            id: `alert-overdue-${d.id}`,
            type: 'danger',
            title: 'دين متأخر مستحق السداد',
            text: `العميل "${client.name}" لديه مديونية متأخرة بمبلغ ${d.remaining.toLocaleString()} ر.ي كانت مستحقة بتاريخ ${d.dueDate}.`,
            date: d.dueDate
          });
        }
      }
    });

    // Check duplicate incompleted services per client
    clients.forEach(c => {
      if (c.status !== 'archived') {
        const incompletedServices = services.filter(s => s.customerId === c.id && s.status !== 'completed' && s.status !== 'cancelled');
        if (incompletedServices.length > 1) {
          alertsList.push({
            id: `alert-many-incompleted-${c.id}`,
            type: 'warning',
            title: 'معاملات متعددة غير مكتملة',
            text: `العميل "${c.name}" لديه عدد (${incompletedServices.length}) معاملات جارية تحت التنفيذ أو جديدة في نفس الوقت.`,
            date: today
          });
        }
      }
    });

    // Check debt limit exceeded
    clients.forEach(c => {
      if (c.status !== 'archived') {
        const clientDebtsSum = debts.filter(d => d.customerId === c.id && d.status !== 'paid').reduce((acc, d) => acc + d.remaining, 0);
        if (clientDebtsSum > debtLimit) {
          alertsList.push({
            id: `alert-limit-${c.id}`,
            type: 'danger',
            title: 'تجاوز حد الائتمان المقبول',
            text: `إجمالي مديونية العميل "${c.name}" هو ${clientDebtsSum.toLocaleString()} ر.ي وهو أعلى من حد المديونية المتفق عليه (${debtLimit.toLocaleString()} ر.ي).`,
            date: today
          });
        }
      }
    });

    // Check transactions close to due dates (within 3 days)
    debts.forEach(d => {
      if (d.remaining > 0 && d.status !== 'paid') {
        const diffTime = new Date(d.dueDate).getTime() - new Date(today).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
          const client = clients.find(c => c.id === d.customerId);
          if (client) {
            alertsList.push({
              id: `alert-near-${d.id}`,
              type: 'warning',
              title: 'دين يقترب من موعد السداد',
              text: `مديونية العميل "${client.name}" بمبلغ ${d.remaining.toLocaleString()} ر.ي مستحقة بعد ${diffDays === 0 ? 'اليوم' : diffDays + 'أيام'} بتاريخ ${d.dueDate}.`,
              date: d.dueDate
            });
          }
        }
      }
    });

    return alertsList;
  }, [clients, debts, services]);

  // Clients filtered list
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.phone || '').includes(searchQuery) ||
                          (c.address && (c.address || '').toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'all' ? true : c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [clients, searchQuery, statusFilter]);

  // Services filtered list
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      const client = clients.find(c => c.id === s.customerId);
      const clientName = client ? client.name : '';
      const matchSearch = (clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.serviceType || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [services, clients, searchQuery]);

  // List of active/suspended clients to show in dropdowns
  const selectableClients = useMemo(() => {
    return clients.filter(c => c.status !== 'archived');
  }, [clients]);

  // Action: Add / Update Client
  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    if (editingClient) {
      // Edit
      setClients(prev => prev.map(c => c.id === editingClient.id ? {
        ...c,
        name: newClientName,
        phone: newClientPhone,
        address: newClientAddress,
        type: newClientType,
        notes: newClientNotes
      } : c));
      setEditingClient(null);
    } else {
      // Add
      const isDuplicate = clients.some(c => c.name.trim() === newClientName.trim() && c.status !== 'archived');
      if (isDuplicate) {
        alert('حدث خطأ: اسم العميل موجود مسبقاً بمستندات نشطة.');
        return;
      }
      const newClient: Client = {
        id: `C-${Date.now().toString().slice(-6)}`,
        name: newClientName,
        phone: newClientPhone,
        address: newClientAddress,
        type: newClientType,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'active',
        notes: newClientNotes
      };
      setClients(prev => [newClient, ...prev]);
    }

    // Reset Form
    setNewClientName('');
    setNewClientPhone('');
    setNewClientAddress('');
    setNewClientType('individual');
    setNewClientNotes('');
    setIsClientModalOpen(false);
  };

  // Archive / Restore Client
  const handleToggleArchiveClient = (clientId: string, action: 'archive' | 'activate' | 'suspend') => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        let status: 'active' | 'suspended' | 'archived' = 'active';
        if (action === 'archive') status = 'archived';
        if (action === 'suspend') status = 'suspended';
        return { ...c, status };
      }
      return c;
    }));
    // If selected client is open, update indeed
    if (selectedClient && selectedClient.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, status: action === 'archive' ? 'archived' : action === 'suspend' ? 'suspended' : 'active' } : null);
    }
  };

  // Prepare edit client
  const handleStartEditClient = (client: Client) => {
    setEditingClient(client);
    setNewClientName(client.name);
    setNewClientPhone(client.phone);
    setNewClientAddress(client.address);
    setNewClientType(client.type);
    setNewClientNotes(client.notes || '');
    setIsClientModalOpen(true);
  };

  // Helper to open selected client profile directly
  const handleOpenClientProfile = (client: Client) => {
    setSelectedClient(client);
    // Auto preset Client fields
    setServiceClientId(client.id);
    setCollectionClientId(client.id);
  };

  // Action: Add Service & Automate Debt Linkage
  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceClientId || serviceCost <= 0) return;

    const actualServiceType = serviceTypeSelected === 'أخرى' && customServiceType.trim() ? customServiceType.trim() : serviceTypeSelected;
    
    // Add custom service type if it was added
    if (serviceTypeSelected === 'أخرى' && customServiceType.trim() && !(serviceTypes || []).includes(customServiceType.trim())) {
      setServiceTypes(prev => [...prev, customServiceType.trim()]);
    }

    const serviceId = `SVR-${Date.now().toString().slice(-6)}`;
    const remaining = serviceCost - servicePaid;

    const newService: ClientService = {
      id: serviceId,
      customerId: serviceClientId,
      date: new Date().toISOString().split('T')[0],
      serviceType: actualServiceType,
      cost: serviceCost,
      paidAmount: servicePaid,
      remainingAmount: remaining,
      status: serviceStatus,
      notes: serviceNotes
    };

    setServices(prev => [newService, ...prev]);

    // Financial Integration 1: Unpaid / Partially unpaid service creates a Debt
    if (remaining > 0) {
      const debtId = `DBT-${Date.now().toString().slice(-6)}`;
      const newDebt: ClientDebt = {
        id: debtId,
        customerId: serviceClientId,
        serviceId: serviceId,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 Days payment terms default
        amount: remaining,
        paid: 0,
        remaining: remaining,
        status: 'open',
        notes: `ديون متبقية عن معاملة/خدمة رقم ${serviceId}: ${actualServiceType}`
      };
      setDebts(prev => [newDebt, ...prev]);
    }

    // Financial Integration 2: If there was a prepaid / paidAmount register it as collection
    if (servicePaid > 0) {
      const collId = `COL-${Date.now().toString().slice(-6)}`;
      const clientObj = clients.find(c => c.id === serviceClientId);
      const clientName = clientObj?.name || 'عميل خارجي';

      // Push collection log
      const newCollection: ClientCollection = {
        id: collId,
        customerId: serviceClientId,
        date: new Date().toISOString().split('T')[0],
        amountCollected: servicePaid,
        paymentMethod: 'cash',
        isLinkedToTreasury: true,
        notes: `دفعة مقدمة مستلمة أثناء قيد المعاملة ${serviceId}`
      };

      // Integrated Treasury Activity
      let activityId = '';
      if (linkToTreasury) {
        activityId = `ACT-${Date.now().toString().slice(-6)}`;
        const newActivity: TreasuryActivity = {
          id: activityId,
          date: new Date().toISOString().split('T')[0],
          type: 'general_revenue',
          statement: `متحصلات عميل مقدمة: العميل ${clientName} بموجب معاملة ${serviceId}`,
          amount: servicePaid,
          direction: 'in',
          relatedEntityId: serviceClientId,
          relatedEntityType: 'external',
          user: loggedInUserName,
          notes: `مسجلة تلقائياً عن معاملة ${serviceId}`
        };

        setTreasuryState(prev => ({
          ...prev,
          currentBalance: prev.currentBalance + servicePaid,
          activities: [newActivity, ...prev.activities]
        }));
      }

      // Integrated standard Receipt Voucher (قبض)
      let voucherId = '';
      if (linkToVoucher) {
        voucherId = `RV-${Date.now().toString().slice(-6)}`;
        const newVoucher: PaymentVoucher = {
          id: voucherId,
          date: new Date().toISOString().split('T')[0],
          type: 'receipt',
          beneficiaryOrPayer: clientName,
          relatedEntityType: 'external',
          relatedEntityId: serviceClientId,
          amount: servicePaid,
          statement: `دفعة مقدمة للخدمة ${actualServiceType} رقم ${serviceId}`,
          paymentMethod: 'cash',
          user: loggedInUserName,
          status: 'approved',
          notes: `سند معتمد تلقائي عند تسجيل الخدمة ${serviceId}`,
          linkedActivityId: activityId || undefined
        };
        setVouchers(prev => [newVoucher, ...prev]);
        newCollection.voucherId = voucherId;
      }

      if (activityId) {
        newCollection.linkedActivityId = activityId;
      }

      setCollections(prev => [newCollection, ...prev]);
    }

    // Reset
    setServiceCost(0);
    setServicePaid(0);
    setServiceNotes('');
    setCustomServiceType('');
    setServiceStatus('new');
    setIsServiceModalOpen(false);
  };

  // Action: Add Collection Payment and apply automated linkage
  const handleRecordCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionClientId || collectionAmount <= 0) return;

    const clientObj = clients.find(c => c.id === collectionClientId);
    if (!clientObj) return;

    const targetDebt = debts.find(d => d.id === collectionDebtId);
    
    // Prevent exceeding remaining debt if debt mode is selected
    if (targetDebt && collectionAmount > targetDebt.remaining) {
      alert(`تنبيه: المبلغ المدفوع (${collectionAmount.toLocaleString()} ر.ي) يتجاوز رصيد الدين المتبقي للمستند المالي (${targetDebt.remaining.toLocaleString()} ر.ي).`);
      return;
    }

    // Store log
    const collId = `COL-${Date.now().toString().slice(-6)}`;
    const newColl: ClientCollection = {
      id: collId,
      customerId: collectionClientId,
      debtId: collectionDebtId || undefined,
      date: new Date().toISOString().split('T')[0],
      amountCollected: collectionAmount,
      paymentMethod: collectionMethod,
      isLinkedToTreasury: linkToTreasury,
      notes: collectionNotes
    };

    // Auto-diminish remaining debt
    if (targetDebt) {
      setDebts(prev => prev.map(d => {
        if (d.id === collectionDebtId) {
          const newPaid = d.paid + collectionAmount;
          const newRemaining = d.amount - newPaid;
          return {
            ...d,
            paid: newPaid,
            remaining: newRemaining,
            status: newRemaining <= 0 ? 'paid' : 'open'
          };
        }
        return d;
      }));

      // Find original service and update its paid / remaining amount if matched
      if (targetDebt.serviceId) {
        setServices(prev => prev.map(s => {
          if (s.id === targetDebt.serviceId) {
            const newPaid = s.paidAmount + collectionAmount;
            const newRemaining = s.cost - newPaid;
            return {
              ...s,
              paidAmount: newPaid,
              remainingAmount: newRemaining,
              status: newRemaining <= 0 ? 'completed' : s.status
            };
          }
          return s;
        }));
      }
    } else {
      // General payment: reduce from older open debts of this client sequentially
      let remainingAmountToSettle = collectionAmount;
      const clientOpenDebts = debts.filter(d => d.customerId === collectionClientId && d.status !== 'paid')
                                   .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      
      if (clientOpenDebts.length > 0) {
        setDebts(prev => {
          const updated = [...prev];
          for (let i = 0; i < updated.length; i++) {
            const d = updated[i];
            if (d.customerId === collectionClientId && d.status !== 'paid' && remainingAmountToSettle > 0) {
              const settleAmt = Math.min(d.remaining, remainingAmountToSettle);
              d.paid += settleAmt;
              d.remaining -= settleAmt;
              if (d.remaining <= 0) {
                d.status = 'paid';
              }
              remainingAmountToSettle -= settleAmt;

              // Also update connected service
              if (d.serviceId) {
                setServices(currServices => currServices.map(s => {
                  if (s.id === d.serviceId) {
                    const newPaid = s.paidAmount + settleAmt;
                    const newRem = s.cost - newPaid;
                    return { ...s, paidAmount: newPaid, remainingAmount: newRem, status: newRem <= 0 ? 'completed' : s.status };
                  }
                  return s;
                }));
              }
            }
          }
          return updated;
        });
      }
    }

    // Integrated Treasury Activity
    let activityId = '';
    if (linkToTreasury) {
      activityId = `ACT-${Date.now().toString().slice(-6)}`;
      const newActivity: TreasuryActivity = {
        id: activityId,
        date: new Date().toISOString().split('T')[0],
        type: 'general_revenue',
        statement: `تحصيل ديون مستحقة من العميل: ${clientObj.name} بموجب سند تحصيل ${collId}`,
        amount: collectionAmount,
        direction: 'in',
        relatedEntityId: collectionClientId,
        relatedEntityType: 'external',
        user: loggedInUserName,
        notes: collectionNotes
      };

      setTreasuryState(prev => ({
        ...prev,
        currentBalance: prev.currentBalance + collectionAmount,
        activities: [newActivity, ...prev.activities]
      }));
    }

    // Integrated standard Receipt Voucher (قبض)
    let voucherId = '';
    if (linkToVoucher) {
      voucherId = `RV-${Date.now().toString().slice(-6)}`;
      const newVoucher: PaymentVoucher = {
        id: voucherId,
        date: new Date().toISOString().split('T')[0],
        type: 'receipt',
        beneficiaryOrPayer: clientObj.name,
        relatedEntityType: 'external',
        relatedEntityId: collectionClientId,
        amount: collectionAmount,
        statement: `تحصيل مبلغ مستحق مالي للعميل ${clientObj.name}${targetDebt ? ' عن معاملة #' + targetDebt.serviceId : ''}`,
        paymentMethod: collectionMethod,
        user: loggedInUserName,
        status: 'approved',
        notes: `مولد تلقائياً عند تحصيل المديونية ${collId}`,
        linkedActivityId: activityId || undefined
      };
      setVouchers(prev => [newVoucher, ...prev]);
      newColl.voucherId = voucherId;
    }

    if (activityId) {
      newColl.linkedActivityId = activityId;
    }

    setCollections(prev => [newColl, ...prev]);

    // Reset
    setCollectionAmount(0);
    setCollectionDebtId('');
    setCollectionNotes('');
    setIsCollectionModalOpen(false);
  };

  // Action: Refund Payment to Client (صرف للعميل)
  const handleRefundPaymentToClient = (client: Client, amountRefunded: number, notesReason: string) => {
    if (amountRefunded <= 0) return;

    const collId = `COL-${Date.now().toString().slice(-6)}`;
    // Negative collection represents out refund payment to Client
    const newColl: ClientCollection = {
      id: collId,
      customerId: client.id,
      date: new Date().toISOString().split('T')[0],
      amountCollected: -amountRefunded,
      paymentMethod: 'cash',
      isLinkedToTreasury: true,
      notes: `رد مبالغ مالية إلى العميل: ${notesReason}`
    };

    // Integrated Treasury Activity
    const activityId = `ACT-${Date.now().toString().slice(-6)}`;
    const newActivity: TreasuryActivity = {
      id: activityId,
      date: new Date().toISOString().split('T')[0],
      type: 'general_expense',
      statement: `استرداد مبالغ للعميل: ${client.name} بموجب سند ${collId}. السبب: ${notesReason}`,
      amount: amountRefunded,
      direction: 'out',
      relatedEntityId: client.id,
      relatedEntityType: 'external',
      user: loggedInUserName,
      notes: notesReason
    };

    setTreasuryState(prev => ({
      ...prev,
      currentBalance: prev.currentBalance - amountRefunded,
      activities: [newActivity, ...prev.activities]
    }));

    // Integrated Payment Voucher (صرف)
    const voucherId = `PV-${Date.now().toString().slice(-6)}`;
    const newVoucher: PaymentVoucher = {
      id: voucherId,
      date: new Date().toISOString().split('T')[0],
      type: 'payment',
      beneficiaryOrPayer: client.name,
      relatedEntityType: 'external',
      relatedEntityId: client.id,
      amount: amountRefunded,
      statement: `سند رد/صرف مالي للعميل ${client.name}. السبب: ${notesReason}`,
      paymentMethod: 'cash',
      user: loggedInUserName,
      status: 'approved',
      notes: `سند رد مستحق مال تلقائي ${collId}`,
      linkedActivityId: activityId
    };

    newColl.voucherId = voucherId;
    newColl.linkedActivityId = activityId;

    setCollections(prev => [newColl, ...prev]);
    setVouchers(prev => [newVoucher, ...prev]);

    // Also register this refund as a new debt/demand, or adjust indeed
    const debtId = `DBT-${Date.now().toString().slice(-6)}`;
    const newDebt: ClientDebt = {
      id: debtId,
      customerId: client.id,
      dueDate: new Date().toISOString().split('T')[0],
      amount: amountRefunded,
      paid: 0,
      remaining: amountRefunded,
      status: 'open',
      notes: `رصيد مطالبة مستجد نتيجة رد مبلغ مالي: ${notesReason}`
    };
    setDebts(prev => [newDebt, ...prev]);

    alert(`تم تسجيل دفعة مسترده للعميل (${amountRefunded.toLocaleString()} ر.ي) بنجاح، وتعديل الخزنة وسند الصرف.`);
  };

  // Detailed Client Statement calculation (كشف حساب عميل مفصل)
  const clientStatement = useMemo(() => {
    if (!selectedClient) return [];

    const list: { date: string; reference: string; details: string; debit: number; credit: number; balance: number }[] = [];
    
    // 1) Find all services (Debits the client with cost)
    services.filter(s => s.customerId === selectedClient.id).forEach(s => {
      list.push({
        date: s.date,
        reference: s.id,
        details: `رسوم خدمة/معاملة: ${s.serviceType}`,
        debit: s.cost,
        credit: 0,
        balance: 0
      });
    });

    // 2) Find all collections (Credits the client with payment)
    collections.filter(c => c.customerId === selectedClient.id).forEach(c => {
      const isRefund = c.amountCollected < 0;
      list.push({
        date: c.date,
        reference: c.id,
        details: isRefund ? `رد مبلغ مالي للعميل: ${c.notes}` : `متحصلات مقبوضة من العميل`,
        debit: isRefund ? Math.abs(c.amountCollected) : 0,
        credit: isRefund ? 0 : c.amountCollected,
        balance: 0
      });
    });

    // Sort by date ascending
    list.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compute cumulative balance
    let rollingBalance = 0;
    list.forEach(item => {
      rollingBalance += (item.debit - item.credit);
      item.balance = rollingBalance;
    });

    return list;
  }, [selectedClient, services, collections]);

  // Client financial summary
  const clientFinancialSummary = useMemo(() => {
    if (!selectedClient) return { totalServicesCost: 0, totalPaid: 0, remainingDebt: 0, financialStatus: 'متوازن' };

    const clientServices = services.filter(s => s.customerId === selectedClient.id);
    const clientCollections = collections.filter(c => c.customerId === selectedClient.id);

    const totalServicesCost = clientServices.reduce((acc, s) => acc + s.cost, 0);
    const totalPaid = clientCollections.reduce((acc, c) => acc + c.amountCollected, 0); // negative is refund, which is correct
    
    const remainingDebt = totalServicesCost - totalPaid;

    let financialStatus = 'متوازن';
    if (remainingDebt > 0) financialStatus = 'مدين';
    if (remainingDebt < 0) financialStatus = 'دائن'; // لديه أمانات أو دفع زائد

    return {
      totalServicesCost,
      totalPaid,
      remainingDebt,
      financialStatus
    };
  }, [selectedClient, services, collections]);

  // Handle PDF Statement generation correctly
  const handlePrintPDFStatement = async () => {
    if (!selectedClient) return;
    setPdfGenerating(true);
    const element = document.getElementById('printable-client-statement');
    if (!element) return;

    try {
      // Hide print button in element temporarily
      const pdf = new jsPDF('p', 'mm', 'a4');
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const fileName = `كشف_حساب_العميل_${selectedClient.name.replace(/\s+/g, '_')}.pdf`;
      if (isNativeCapacitor()) {
        const dataUri = pdf.output('datauristring');
        await saveAndSharePdf(dataUri, fileName);
      } else {
        pdf.save(fileName);
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setPdfGenerating(false);
    }
  };

  // Generate selected pre-made reports
  const reportData = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    switch (selectedReportType) {
      case 'active_clients':
        return clients.filter(c => c.status === 'active');
      case 'suspended_clients':
        return clients.filter(c => c.status === 'suspended' || c.status === 'archived');
      case 'open_debts':
        return debts.filter(d => d.status !== 'paid');
      case 'overdue_debts':
        return debts.filter(d => d.status !== 'paid' && d.dueDate < today);
      case 'collections_history':
        return collections.filter(c => c.date >= reportStartDate && c.date <= reportEndDate);
      case 'top_debted_clients':
        // Sum debt per client
        const debtMap: { [key: string]: { client: Client; sum: number } } = {};
        debts.filter(d => d.status !== 'paid').forEach(d => {
          if (!debtMap[d.customerId]) {
            const cl = clients.find(c => c.id === d.customerId);
            if (cl) {
              debtMap[d.customerId] = { client: cl, sum: 0 };
            }
          }
          if (debtMap[d.customerId]) {
            debtMap[d.customerId].sum += d.remaining;
          }
        });
        return Object.values(debtMap).sort((a,b) => b.sum - a.sum);
      case 'completed_services':
        return services.filter(s => s.status === 'completed');
      case 'monthly_collections_summary':
        // group collections by month
        const monthlyMap: { [key: string]: number } = {};
        collections.forEach(c => {
          const month = c.date.substring(0, 7); // YYYY-MM
          monthlyMap[month] = (monthlyMap[month] || 0) + c.amountCollected;
        });
        return Object.entries(monthlyMap).map(([month, total]) => ({ month, total }));
      default:
        return [];
    }
  }, [selectedReportType, clients, debts, collections, services, reportStartDate, reportEndDate]);

  // Trigger browser print helper
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-right" dir="rtl" id="customers-view-root">
      
      {/* Upper Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">إجمالي مديونية العملاء</p>
              <h3 className="text-2xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {(stats.totalRemainingDebts).toLocaleString()} <span className="text-xs">ر.ي</span>
              </h3>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-3 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">إجمالي المطالبات والديون المتبقية تحت التحصيل</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">إجمالي التحصيل المالي</p>
              <h3 className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.totalCollectionsCount.toLocaleString()} <span className="text-xs">ر.ي</span>
              </h3>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg">
              <TrendingDown size={20} />
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">مجموع المبالغ المحصلة من العملاء</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">العملاء النشطون</p>
              <h3 className="text-2xl font-bold font-mono text-zinc-900 dark:text-white mt-1">
                {stats.activeClientsCount} <span className="text-xs">عميل</span>
              </h3>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 p-3 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">من إجمالي {stats.totalClientsCount} عملاء مدونين بالنظام</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">التنبيهات والديون المتأخرة</p>
              <h3 className={`text-2xl font-bold font-mono mt-1 ${generatedAlerts.length > 0 ? 'text-amber-500 animate-pulse' : 'text-zinc-500'}`}>
                {generatedAlerts.length} <span className="text-xs">إشعار</span>
              </h3>
            </div>
            <div className={`p-3 rounded-lg ${generatedAlerts.length > 0 ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">خدمات متأخرة أو ديون تجاوزت الاستحقاق</p>
        </div>
      </div>

      {/* Main Tabs Selection / Quick Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm no-print">
        <div className="flex gap-2">
          <button 
            onClick={() => { setActiveTab('clients'); setSelectedClient(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'clients' ? 'bg-indigo-600 text-white shadow' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <Users size={16} />
            قائمة العملاء
          </button>
          <button 
            onClick={() => { setActiveTab('services'); setSelectedClient(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'services' ? 'bg-indigo-600 text-white shadow' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <Briefcase size={16} />
            الخدمات والمعاملات
          </button>
          <button 
            onClick={() => { setActiveTab('debts_collections'); setSelectedClient(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'debts_collections' ? 'bg-indigo-600 text-white shadow' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <Layers size={16} />
            الديون وسجل التحصيل
          </button>
          <button 
            onClick={() => { setActiveTab('reports'); setSelectedClient(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'reports' ? 'bg-indigo-600 text-white shadow' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <FileText size={16} />
            التقارير والمكشوفات
          </button>
          <button 
            onClick={() => { setActiveTab('alerts'); setSelectedClient(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 relative ${
              activeTab === 'alerts' ? 'bg-indigo-600 text-white shadow' : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
          >
            <AlertTriangle size={16} />
            تنبيهات الديون
            {generatedAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold animate-bounce">
                {generatedAlerts.length}
              </span>
            )}
          </button>
        </div>

        {/* Quick buttons */}
        <div className="flex gap-2">
          <button 
            onClick={() => { setEditingClient(null); setIsClientModalOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
          >
            <UserPlus size={16} />
            إضافة عميل جديد
          </button>
          <button 
            onClick={() => setIsServiceModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
          >
            <Plus size={16} />
            تسجيل معاملة عميل
          </button>
          <button 
            onClick={() => setIsCollectionModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition"
          >
            <TrendingDown size={16} />
            تحصيل دفعة مالية
          </button>
        </div>
      </div>

      {/* Tabs Contents */}
      
      {/* 1. Clients Tab */}
      {activeTab === 'clients' && !selectedClient && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm no-print">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">قائمة العملاء المدونين</h3>
            <div className="flex gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-2.5 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  placeholder="ابحث عن اسم، جوال وموقع..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm pr-10 pl-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
              </div>
              {/* Status filter */}
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">كل الحالات</option>
                <option value="active">نشط</option>
                <option value="suspended">موقوف</option>
                <option value="archived">مؤرشف</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredClients.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">لا يوجد عملاء يطابقون خيارات البحث الحالية.</div>
            ) : (
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-bold bg-zinc-50 dark:bg-zinc-800/40">
                    <th className="px-4 py-3">المعرف</th>
                    <th className="px-4 py-3">اسم العميل</th>
                    <th className="px-4 py-3">رقم الهاتف</th>
                    <th className="px-4 py-3">العنوان</th>
                    <th className="px-4 py-3">فئة العميل</th>
                    <th className="px-4 py-3">تاريخ الإضافة</th>
                    <th className="px-4 py-3">الحالة المالية</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3 text-left">أدوات التحكم</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map(c => {
                    // compute balance status
                    const associatedSvr = services.filter(s => s.customerId === c.id);
                    const associatedCol = collections.filter(coll => coll.customerId === c.id);
                    const totalCost = associatedSvr.reduce((acc, s) => acc + s.cost, 0);
                    const totalPaid = associatedCol.reduce((acc, col) => acc + col.amountCollected, 0);
                    const bal = totalCost - totalPaid;

                    let balBadge = 'متوازن';
                    let balColor = 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
                    if (bal > 0) {
                      balBadge = `مدين بقيمة ${bal.toLocaleString()} ر.ي`;
                      balColor = 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400';
                    } else if (bal < 0) {
                      balBadge = `دائن بقيمة ${Math.abs(bal).toLocaleString()} ر.ي`;
                      balColor = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400';
                    }

                    return (
                      <tr 
                        key={c.id} 
                        className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-4 py-4 font-mono font-bold text-xs text-zinc-500">{c.id}</td>
                        <td className="px-4 py-4">
                          <button 
                            onClick={() => handleOpenClientProfile(c)}
                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {c.name}
                          </button>
                        </td>
                        <td className="px-4 py-4 font-mono text-zinc-600 dark:text-zinc-400">{c.phone || 'بلا هاتف'}</td>
                        <td className="px-4 py-4 text-zinc-500">{c.address || 'غير محدد'}</td>
                        <td className="px-4 py-4">
                          <span className="bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full text-xs">
                            {c.type === 'individual' ? 'فرد' : c.type === 'company' ? 'شركة' : c.type === 'agency' ? 'جهة رسمية' : 'أخرى'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs font-mono text-zinc-500">{c.createdAt}</td>
                        <td className="px-4 py-4 text-xs">
                          <span className={`px-2 py-1 rounded inline-block ${balColor}`}>
                            {balBadge}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          {c.status === 'active' && (
                            <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded">نشط</span>
                          )}
                          {c.status === 'suspended' && (
                            <span className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded">موقف مؤقتاً</span>
                          )}
                          {c.status === 'archived' && (
                            <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-400 px-2 py-1 rounded">مؤرشف</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-left space-x-1 space-x-reverse">
                          <button 
                            onClick={() => handleStartEditClient(c)}
                            className="p-1 text-zinc-500 hover:text-indigo-600 transition"
                            title="تعديل"
                          >
                            <Edit size={16} />
                          </button>
                          {c.status !== 'archived' ? (
                            <button 
                              onClick={() => handleToggleArchiveClient(c.id, 'archive')}
                              className="p-1 text-zinc-500 hover:text-amber-600 transition"
                              title="أرشفة"
                            >
                              <Archive size={16} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleToggleArchiveClient(c.id, 'activate')}
                              className="p-1 text-zinc-500 hover:text-emerald-600 transition"
                              title="استعادة ملف العميل"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                          {c.status === 'active' ? (
                            <button 
                              onClick={() => handleToggleArchiveClient(c.id, 'suspend')}
                              className="p-1 text-zinc-500 hover:text-rose-600 transition"
                              title="إيقاف"
                            >
                              <AlertTriangle size={16} />
                            </button>
                          ) : c.status === 'suspended' ? (
                            <button 
                              onClick={() => handleToggleArchiveClient(c.id, 'activate')}
                              className="p-1 text-zinc-500 hover:text-emerald-600 transition"
                              title="تفعيل"
                            >
                              <CheckCircle size={16} />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* A Complete Customer Profile Modal View */}
      {selectedClient && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedClient(null)}
                  className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 p-2 rounded-lg transition"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{selectedClient.name}</h2>
                    <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-mono">
                      {selectedClient.id}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">تم تسجيله بتاريخ: {selectedClient.createdAt}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleStartEditClient(selectedClient)}
                  className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition"
                >
                  <Edit size={14} />تعديل البيانات
                </button>
                {selectedClient.status !== 'archived' ? (
                  <button 
                    onClick={() => handleToggleArchiveClient(selectedClient.id, 'archive')}
                    className="bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition"
                  >
                    <Archive size={14} />أرشفة العميل
                  </button>
                ) : (
                  <button 
                    onClick={() => handleToggleArchiveClient(selectedClient.id, 'activate')}
                    className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition"
                  >
                    <RotateCcw size={14} />استعادة الملف النشط
                  </button>
                )}
              </div>
            </div>

            {/* Profile fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl text-sm mb-6">
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Phone size={16} />
                <span>الهاتف:</span>
                <span className="font-mono text-zinc-900 dark:text-white">{selectedClient.phone || 'غير معين'}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <MapPin size={16} />
                <span>العنوان:</span>
                <span className="text-zinc-900 dark:text-white">{selectedClient.address || 'غير محدد'}</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Briefcase size={16} />
                <span>الفئة:</span>
                <span className="text-zinc-900 dark:text-white">
                  {selectedClient.type === 'individual' ? 'فرد' : selectedClient.type === 'company' ? 'شركة' : selectedClient.type === 'agency' ? 'جهة حكومية' : 'أخرى'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                <Clock size={16} />
                <span>الحالة الفنية:</span>
                <span className="text-zinc-900 dark:text-white">
                  {selectedClient.status === 'active' ? 'نشط ومطالب' : selectedClient.status === 'suspended' ? 'موقف مؤقتاً' : 'مؤرشف'}
                </span>
              </div>
            </div>

            {/* Financial summary for this specific client */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                <p className="text-xs text-zinc-500 font-medium">إجمالي رسوم الخدمات</p>
                <p className="text-lg font-bold font-mono text-zinc-800 dark:text-white mt-1">
                  {clientFinancialSummary.totalServicesCost.toLocaleString()} <span className="text-xs text-zinc-500">ر.ي</span>
                </p>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                <p className="text-xs text-zinc-500 font-medium">إجمالي المبالغ المدفوعة</p>
                <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {clientFinancialSummary.totalPaid.toLocaleString()} <span className="text-xs text-zinc-500">ر.ي</span>
                </p>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                <p className="text-xs text-zinc-500 font-medium">المتبقي / المديونية الحالية</p>
                <p className="text-lg font-bold font-mono text-rose-600 mt-1">
                  {clientFinancialSummary.remainingDebt > 0 ? clientFinancialSummary.remainingDebt.toLocaleString() : 0} <span className="text-xs text-zinc-500">ر.ي</span>
                </p>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl text-center">
                <p className="text-xs text-zinc-500 font-medium">الحالة المالية العامة</p>
                <span className={`px-3 py-1 rounded inline-block text-xs font-bold mt-2 ${
                  clientFinancialSummary.financialStatus === 'متوازن' ? 'bg-zinc-100 text-zinc-700' :
                  clientFinancialSummary.financialStatus === 'مدين' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {clientFinancialSummary.financialStatus === 'متوازن' ? 'حساب متوازن (0)' :
                   clientFinancialSummary.financialStatus === 'مدين' ? 'حساب مدين (مستحق)' : 'حساب دائن (أمانات)'}
                </span>
              </div>
            </div>

            {/* Interactive Timeline Tabs inside profile */}
            <div className="space-y-6" id="printable-client-statement">
              <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl">
                <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <FileText size={18} />
                  كشف الحساب وتفاصيل حركات العميل
                </h3>
                <div className="flex gap-2 no-print">
                  <button 
                    onClick={handlePrintPDFStatement}
                    disabled={pdfGenerating}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Printer size={14} /> {pdfGenerating ? 'جاري التحضير...' : 'تصدير الكشف بصيغة PDF'}
                  </button>
                  <button
                    onClick={() => {
                      const ans = prompt('أدخل قيمة الدفعة المستردة:', '0');
                      if (ans && parseFloat(ans) > 0) {
                        const notes = prompt('أدخل سبب الرد:', 'طلب إلغاء معاملة');
                        handleRefundPaymentToClient(selectedClient, parseFloat(ans), notes || 'رد مقاصة');
                      }
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
                  >
                    إرجاع أو صرف مبالغ للعميل
                  </button>
                </div>
              </div>

              {/* Statement List of Services, collections and ledger activities */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 bg-zinc-100/60 dark:bg-zinc-800/20">
                      <th className="px-4 py-3">التاريخ</th>
                      <th className="px-4 py-3">رقم المرجع / السند</th>
                      <th className="px-4 py-3">نوع الحركة / التفاصيل</th>
                      <th className="px-4 py-3 text-rose-600">رسوم ومطالبات (مدين)</th>
                      <th className="px-4 py-3 text-emerald-600">مدفوع ومتحصل (دائن)</th>
                      <th className="px-4 py-3">الرصيد المستمر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientStatement.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-zinc-400">لا يوجد حركات قيود مسجلة لهذا العميل حتى الآن.</td>
                      </tr>
                    ) : (
                      clientStatement.map((st, idx) => (
                        <tr 
                          key={idx} 
                          className="border-b border-zinc-100 dark:border-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/10"
                        >
                          <td className="px-4 py-3 font-mono text-xs">{st.date}</td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-zinc-500">{st.reference}</td>
                          <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{st.details}</td>
                          <td className="px-4 py-3 font-mono font-bold text-rose-500">
                            {st.debit > 0 ? `${st.debit.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-500">
                            {st.credit > 0 ? `${st.credit.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                            {st.balance.toLocaleString()} ر.ي
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section tabs inside details: Debts & Services list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Linked services */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">المعاملات والخدمات المرتبطة</h4>
                  <button 
                    onClick={() => { setServiceClientId(selectedClient.id); setIsServiceModalOpen(true); }}
                    className="p-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="space-y-3">
                  {services.filter(s => s.customerId === selectedClient.id).length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-4">بلا معاملات مضافة</p>
                  ) : (
                    services.filter(s => s.customerId === selectedClient.id).map(s => (
                      <div key={s.id} className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between text-zinc-800 dark:text-zinc-200 font-bold">
                          <span>{s.serviceType}</span>
                          <span className="font-mono">{s.cost.toLocaleString()} ر.ي</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>رقم المعاملة: {s.id}</span>
                          <span>التاريخ: {s.date}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50 mt-1">
                          <span className="text-zinc-500">مدفوع: {s.paidAmount.toLocaleString()} ر.ي</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            s.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                            s.status === 'in_progress' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {s.status === 'completed' ? 'مكتملة' : s.status === 'in_progress' ? 'قيد التنفيذ' : 'جديدة'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Outstanding Debts */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-white">الاستحقاقات والديون النشطة</h4>
                  <button 
                    onClick={() => { setCollectionClientId(selectedClient.id); setIsCollectionModalOpen(true); }}
                    className="bg-purple-50 text-purple-700 dark:bg-purple-950/20 text-xs px-2 py-1 rounded hover:bg-purple-100 transition"
                  >
                    تسجيل دفعة سداد
                  </button>
                </div>
                <div className="space-y-3">
                  {debts.filter(d => d.customerId === selectedClient.id && d.status !== 'paid').length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-4">لا يوجد ديون نشطة مستحقة حالياً. الحساب نظيف.</p>
                  ) : (
                    debts.filter(d => d.customerId === selectedClient.id && d.status !== 'paid').map(d => (
                      <div key={d.id} className="bg-rose-50/50 dark:bg-rose-950/10 p-3 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                          <span>دين رقم #{d.id}</span>
                          <span className="font-mono">المتبقي: {d.remaining.toLocaleString()} ر.ي</span>
                        </div>
                        <div className="flex justify-between text-zinc-500">
                          <span>قيمة الدين الأصلية: {d.amount.toLocaleString()} ر.ي</span>
                          <span className="font-bold">تاريخ الاستحقاق: {d.dueDate}</span>
                        </div>
                        <p className="text-zinc-400 text-[10px] italic">{d.notes}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. Services Tab */}
      {activeTab === 'services' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm no-print">
          <div className="flex justify-between items-center gap-4 mb-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">جدول جميع المعاملات والخدمات المسجلة</h3>
            <button 
              onClick={() => { setServiceClientId(''); setIsServiceModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5"
            >
              <Plus size={16} /> تسجيل خدمة جديدة
            </button>
          </div>

          <div className="overflow-x-auto">
            {filteredServices.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">لا يوجد خدمات مضافة مسبقاً.</div>
            ) : (
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 bg-zinc-50 dark:bg-zinc-850">
                    <th className="px-4 py-3">رقم الخدمة</th>
                    <th className="px-4 py-3">العميل</th>
                    <th className="px-4 py-3">نوع الخدمة</th>
                    <th className="px-4 py-3">قيمة الرسوم</th>
                    <th className="px-4 py-3 text-emerald-600">المدفوع الأول</th>
                    <th className="px-4 py-3 text-rose-600">المتبقي</th>
                    <th className="px-4 py-3">تاريخ القيد</th>
                    <th className="px-4 py-3">الحالة</th>
                    <th className="px-4 py-3">تعديل الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredServices.map(s => {
                    const client = clients.find(c => c.id === s.customerId);
                    return (
                      <tr key={s.id} className="border-b border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                        <td className="px-4 py-3 font-mono font-bold text-xs">{s.id}</td>
                        <td className="px-4 py-3">
                          {client ? (
                            <button 
                              onClick={() => handleOpenClientProfile(client)}
                              className="font-medium text-indigo-600 hover:underline"
                            >
                              {client.name}
                            </button>
                          ) : 'غير معروف'}
                        </td>
                        <td className="px-4 py-3 font-bold">{s.serviceType}</td>
                        <td className="px-4 py-3 font-mono">{s.cost.toLocaleString()} ر.ي</td>
                        <td className="px-4 py-3 font-mono text-emerald-600">{s.paidAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-rose-500 font-bold">{s.remainingAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500">{s.date}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                            s.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            s.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                            s.status === 'cancelled' ? 'bg-zinc-100 text-zinc-400' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {s.status === 'completed' ? 'مكتملة' : s.status === 'in_progress' ? 'قيد التنفيذ' : s.status === 'cancelled' ? 'ملغية' : 'جديدة'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={s.status} 
                            onChange={(e) => {
                              const newSt = e.target.value as any;
                              setServices(prev => prev.map(item => item.id === s.id ? { ...item, status: newSt } : item));
                            }}
                            className="bg-zinc-50 border border-zinc-200 rounded text-xs px-2 py-1 dark:bg-zinc-800 dark:border-zinc-700"
                          >
                            <option value="new">جديدة</option>
                            <option value="in_progress">قيد التنفيذ</option>
                            <option value="completed">مكتملة</option>
                            <option value="cancelled">ملغية</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* 3. Debts & Collection Tab */}
      {activeTab === 'debts_collections' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
          
          {/* Debts Table (Active & unpaid debts list) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-bold text-rose-600 mb-4 flex items-center gap-1.5">
              <TrendingUp size={16} />
              الديون المالية النشطة المرتبطة
            </h3>
            <div className="overflow-x-auto text-xs">
              {debts.filter(d => d.status !== 'paid').length === 0 ? (
                <div className="text-center py-8 text-zinc-400">لا توجد مديونيات أو التزامات نشطة حالياً.</div>
              ) : (
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 pb-2 bg-zinc-50 dark:bg-zinc-800">
                      <th className="p-2">الدين/السند</th>
                      <th className="p-2">العميل</th>
                      <th className="p-2">المبلغ الأصلي</th>
                      <th className="p-2">المدفوع</th>
                      <th className="p-2">المتبقي المطلوب</th>
                      <th className="p-2">تاريخ الاستحقاق</th>
                      <th className="p-2 text-left">أدوات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts.filter(d => d.status !== 'paid').map(d => {
                      const client = clients.find(c => c.id === d.customerId);
                      const isOverdue = new Date(d.dueDate) < new Date();
                      return (
                        <tr key={d.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                          <td className="p-2 font-mono font-bold">{d.id}</td>
                          <td className="p-2 text-zinc-900 dark:text-white font-medium">{client?.name || 'غير معروف'}</td>
                          <td className="p-2 font-mono">{d.amount.toLocaleString()}</td>
                          <td className="p-2 font-mono text-emerald-600">{d.paid.toLocaleString()}</td>
                          <td className="p-2 font-mono text-rose-500 font-bold">{d.remaining.toLocaleString()}</td>
                          <td className={`p-2 font-mono text-[10px] font-bold ${isOverdue ? 'text-rose-600 animate-pulse' : 'text-zinc-500'}`}>
                            {d.dueDate} {isOverdue && '(متأخر)'}
                          </td>
                          <td className="p-4 text-left">
                            <button
                              onClick={() => {
                                setCollectionClientId(d.customerId);
                                setCollectionDebtId(d.id);
                                setCollectionAmount(d.remaining);
                                setIsCollectionModalOpen(true);
                              }}
                              className="bg-emerald-50 text-emerald-600 font-bold px-2.5 py-1 rounded hover:bg-emerald-100 text-[10px]"
                            >
                              تسديد
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Collection and payments Log */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-emerald-600 mb-4 flex items-center gap-1.5">
              <TrendingDown size={16} />
              آخر حركات التحصيل والمدفوعات
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {collections.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-6">لا يوجد سجل مدفوعات مضاف مسبقاً.</p>
              ) : (
                collections.map(col => {
                  const client = clients.find(c => c.id === col.customerId);
                  const isRefund = col.amountCollected < 0;
                  return (
                    <div 
                      key={col.id} 
                      className={`p-3 rounded-lg text-xs border ${
                        isRefund 
                          ? 'bg-rose-50/40 border-rose-100 dark:bg-rose-950/10 dark:border-rose-900/30' 
                          : 'bg-emerald-50/40 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30'
                      }`}
                    >
                      <div className="flex justify-between items-start font-bold">
                        <span className="text-zinc-700 dark:text-zinc-300">{client?.name || 'عميل خارجي'}</span>
                        <span className={isRefund ? 'text-rose-600' : 'text-emerald-600 font-mono font-bold'}>
                          {isRefund ? '-' : '+'}{Math.abs(col.amountCollected).toLocaleString()} ر.ي
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-400 text-[10px] mt-1.5">
                        <span>رقم السند: {col.id}</span>
                        <span>{col.date}</span>
                      </div>
                      {col.voucherId && (
                        <div className="text-[10px] font-mono text-indigo-500 font-bold mt-1">
                          سند قبض مرتبط: #{col.voucherId}
                        </div>
                      )}
                      {col.notes && <p className="text-[10px] text-zinc-500 italic mt-1">{col.notes}</p>}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* 4. Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm no-print">
          <h3 className="text-lg font-bold text-amber-500 flex items-center gap-2 mb-6">
            <AlertTriangle size={24} />
            تنبيهات ومعالجة المخاطر المالية للعملاء
          </h3>

          <div className="space-y-4">
            {generatedAlerts.length === 0 ? (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-4 flex gap-3 text-sm items-center">
                <CheckCircle className="text-emerald-600" size={20} />
                <span>جميع حسابات ومعاملات العملاء نظيفة وتعمل بانتظام وبدون تجاوزات حالية للثوابت أو تواريخ الاستحقاق.</span>
              </div>
            ) : (
              generatedAlerts.map(alert => (
                <div 
                  key={alert.id} 
                  className={`border p-4 rounded-xl flex items-start gap-4 text-sm ${
                    alert.type === 'danger' 
                      ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-300' 
                      : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-300'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${alert.type === 'danger' ? 'bg-rose-200' : 'bg-amber-200'}`}>
                    <AlertTriangle size={18} />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold flex items-center gap-1.5">{alert.title}</h5>
                    <p className="text-xs opacity-90">{alert.text}</p>
                    <span className="text-[10px] block opacity-75 font-mono">المرجع/تاريخ الاستحقاق: {alert.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm no-print">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">توليد تقارير وكشوفات العملاء</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">نوع التقرير المطلوب</label>
                <select 
                  value={selectedReportType}
                  onChange={(e) => setSelectedReportType(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700"
                >
                  <option value="active_clients">1) تقرير العملاء النشطين ومستخلصاتهم</option>
                  <option value="suspended_clients">2) تقرير العملاء الموقوفين والمؤرشفين</option>
                  <option value="open_debts">3) تقرير الديون المفتوحة النشطة</option>
                  <option value="overdue_debts">4) تقرير الديون والالتزامات المتأخرة</option>
                  <option value="collections_history">5) تقرير تفصيلي بالتحصيلات المقبوضة</option>
                  <option value="top_debted_clients">6) تقرير أعلى العملاء مديونية (تنازلياً)</option>
                  <option value="completed_services">7) تقرير الخدمات والمعاملات المنجزة</option>
                  <option value="monthly_collections_summary">8) تقرير إجمالي التحصيل الشهري والمقرر</option>
                </select>
              </div>

              {selectedReportType === 'collections_history' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5">من تاريخ</label>
                    <input 
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5">إلى تاريخ</label>
                    <input 
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700"
                    />
                  </div>
                </>
              )}

              <div className="flex items-end">
                <button 
                  onClick={handlePrintReport}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 w-full"
                >
                  <Printer size={18} />
                  معاينة وطباعة التقرير (Print/PDF)
                </button>
              </div>
            </div>
          </div>

          {/* Printable Report Preview Panel */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-md printable-area relative">
            <div className="text-center border-b border-zinc-300 pb-6 mb-6">
              <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">{appSettings?.institution?.name || 'مؤسسة أمين الشيباني للأعمال'}</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{appSettings?.institution?.address || 'اليمن - صنعاء / تعز'}</p>
              <h3 className="text-lg font-bold text-zinc-900 mt-4 bg-zinc-100 dark:bg-zinc-850 py-2 rounded-lg inline-block px-12">
                {selectedReportType === 'active_clients' && 'تقرير العملاء والذمم النشطة'}
                {selectedReportType === 'suspended_clients' && 'سجل العملاء المؤرشفين والموقوفين'}
                {selectedReportType === 'open_debts' && 'كشف الفواتير والديون المستحقة المفتوحة'}
                {selectedReportType === 'overdue_debts' && 'سجل الديون المتأخرة المستحقة والمعلقة'}
                {selectedReportType === 'collections_history' && `سجل المتحصلات التفصيلية للعملاء للفترة من ${reportStartDate} إلى ${reportEndDate}`}
                {selectedReportType === 'top_debted_clients' && 'تقييم أعلى مديونيات العملاء ومستويات الائتمان'}
                {selectedReportType === 'completed_services' && 'بيان الخدمات والمعاملات المكتملة رقمياً'}
                {selectedReportType === 'monthly_collections_summary' && 'تقرير التدفق والتحصيل الشهري الشامل'}
              </h3>
              <p className="text-left py-1 text-xs text-zinc-400">تاريخ توليد السند: {new Date().toLocaleDateString('ar-YE')}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm border border-zinc-300">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-300 text-zinc-800 font-bold">
                    <th className="p-3">مستند/رقم</th>
                    {selectedReportType === 'monthly_collections_summary' ? (
                      <>
                        <th className="p-3">الشهر</th>
                        <th className="p-3">المبالغ المحصلة المودعة</th>
                      </>
                    ) : selectedReportType === 'collections_history' ? (
                      <>
                        <th className="p-3"> العميل</th>
                        <th className="p-3">المبلغ المستلم</th>
                        <th className="p-3">طريق الدفع</th>
                        <th className="p-3">ملاحظات التحصيل</th>
                      </>
                    ) : selectedReportType === 'top_debted_clients' ? (
                      <>
                        <th className="p-3">العميل</th>
                        <th className="p-3">جوال</th>
                        <th className="p-3">إجمالي المديونية الحالية</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3">العميل / التفاصيل</th>
                        <th className="p-3">القيمة والالتزام المالية</th>
                        <th className="p-3">المدفوع الكلي</th>
                        <th className="p-3">تفاصيل المتبقي</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-zinc-400">لا توجد بيانات مسجلة مطابقة لهذا التقرير حالياً.</td>
                    </tr>
                  ) : (
                    reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b border-zinc-200 hover:bg-zinc-50">
                        <td className="p-3 font-mono text-xs font-bold">{row.id || index(idx) || '-'}</td>
                        {selectedReportType === 'monthly_collections_summary' ? (
                          <>
                            <td className="p-3 font-bold">{row.month}</td>
                            <td className="p-3 font-mono font-bold text-emerald-600">{row.total.toLocaleString()} ر.ي</td>
                          </>
                        ) : selectedReportType === 'collections_history' ? (
                          <>
                            <td className="p-3 font-bold">{clients.find(c => c.id === row.customerId)?.name || 'عميل خارجي'}</td>
                            <td className="p-3 font-mono font-bold text-emerald-600">{row.amountCollected.toLocaleString()} ر.ي</td>
                            <td className="p-3">{row.paymentMethod === 'cash' ? 'نقداً بالعملة المحلية' : 'حوالة بنكية / شيك'}</td>
                            <td className="p-3 text-zinc-500 text-xs">{row.notes || 'بلا بيان'}</td>
                          </>
                        ) : selectedReportType === 'top_debted_clients' ? (
                          <>
                            <td className="p-3 font-bold">{row.client?.name}</td>
                            <td className="p-3 font-mono text-xs">{row.client?.phone || 'بلا'}</td>
                            <td className="p-3 font-mono font-bold text-rose-500">{row.sum.toLocaleString()} ر.ي</td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 font-bold">{row.name || row.serviceType || row.notes || 'بيان'}</td>
                            <td className="p-3 font-mono">{(row.cost || row.amount || 0).toLocaleString()} ر.ي</td>
                            <td className="p-3 font-mono text-emerald-600">{(row.paidAmount || row.paid || 0).toLocaleString()}</td>
                            <td className="p-3 font-mono text-rose-500 font-bold">{(row.remainingAmount || row.remaining || 0).toLocaleString()}</td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-8 grid grid-cols-2 text-center text-xs font-bold pt-8 border-t border-dashed border-zinc-300">
              <div>توقيع المسؤول المالي: __________________</div>
              <div>ختم وتصديق المدير العام: __________________</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Client Creation / Edit Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full text-right" dir="rtl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">
              {editingClient ? 'تعديل بيانات ملف العميل' : 'إضافة عميل وحساب جديد'}
            </h3>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">اسم العميل بالكامل / الشركة *</label>
                <input 
                  type="text" 
                  required 
                  value={newClientName} 
                  onChange={(e) => setNewClientName(e.target.value)} 
                  className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg focus:outline-indigo-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">رقم هاتف الاتصال / واتساب *</label>
                <input 
                  type="text" 
                  value={newClientPhone} 
                  onChange={(e) => setNewClientPhone(e.target.value)} 
                  placeholder="00967XXXXXXXX"
                  className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg focus:outline-indigo-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">العنوان والموقع الجغرافي</label>
                <input 
                  type="text" 
                  value={newClientAddress} 
                  onChange={(e) => setNewClientAddress(e.target.value)} 
                  className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg focus:outline-indigo-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">تصنيف العميل</label>
                <select 
                  value={newClientType}
                  onChange={(e) => setNewClientType(e.target.value as any)}
                  className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white"
                >
                  <option value="individual">عميل فرد عادي</option>
                  <option value="company">شركة ومؤسسة تجارية</option>
                  <option value="agency">منظمة / جهة رسمية</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">ملاحظات القيود</label>
                <textarea 
                  value={newClientNotes} 
                  onChange={(e) => setNewClientNotes(e.target.value)} 
                  rows={2}
                  className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg focus:outline-indigo-600 dark:bg-zinc-800 dark:text-white font-sans text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-650 rounded-lg text-xs font-bold"
                >
                  إلغاء التراجع
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  حفظ وتأكيد البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Action/Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full text-right" dir="rtl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">قيد معاملة أو خدمة محاسبية لعميل</h3>
            <form onSubmit={handleCreateService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">اختر العميل المعين *</label>
                <select
                  required
                  value={serviceClientId}
                  onChange={(e) => setServiceClientId(e.target.value)}
                  className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white"
                >
                  <option value="">-- اختر من قائمة العملاء --</option>
                  {selectableClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">نوع الخدمة المتاحة</label>
                  <select
                    value={serviceTypeSelected}
                    onChange={(e) => setServiceTypeSelected(e.target.value)}
                    className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white"
                  >
                    {serviceTypes.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                    <option value="أخرى">أخرى (توسعة مخصصة)...</option>
                  </select>
                </div>

                {serviceTypeSelected === 'أخرى' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">اكتب نوع الخدمة المخصصة *</label>
                    <input 
                      type="text" 
                      required 
                      value={customServiceType} 
                      onChange={(e) => setCustomServiceType(e.target.value)} 
                      className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">القيمة المحتسبة للرسوم *</label>
                  <input 
                    type="number" 
                    required 
                    min="1"
                    value={serviceCost} 
                    onChange={(e) => setServiceCost(parseFloat(e.target.value) || 0)} 
                    className="w-full font-mono bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">المبلغ كمدفوع معجل أولى</label>
                  <input 
                    type="number" 
                    min="0"
                    max={serviceCost}
                    value={servicePaid} 
                    onChange={(e) => setServicePaid(parseFloat(e.target.value) || 0)} 
                    className="w-full font-mono bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {serviceCost - servicePaid > 0 && (
                <div className="bg-rose-50 text-rose-700 dark:bg-rose-950/20 p-2 rounded-lg text-xs">
                  سيتم فتح ذمة مطالبة بقيمة متبقية قدرها {(serviceCost - servicePaid).toLocaleString()} ر.ي مستحقة ترحل كدين لملف العميل.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">تفاصيل وملاحظات إضافية</label>
                <textarea 
                  value={serviceNotes} 
                  onChange={(e) => setServiceNotes(e.target.value)} 
                  rows={2}
                  className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white font-sans text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-650 rounded-lg text-xs"
                >
                  إلغاء تراجع
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                >
                  حفظ وتسجيل المعاملة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Collection Payment Modal */}
      {isCollectionModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full text-right" dir="rtl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">تسجيل مستند تحصيل دفعة من عميل</h3>
            <form onSubmit={handleRecordCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">العميل المسدد للدين *</label>
                <select
                  required
                  value={collectionClientId}
                  onChange={(e) => {
                    setCollectionClientId(e.target.value);
                    setCollectionDebtId(''); // Reset debt selection
                  }}
                  className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white"
                >
                  <option value="">-- اختر من قائمة العملاء --</option>
                  {selectableClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {collectionClientId && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1 font-sans">اختر مديونية/دين استحقاق معين (إن وجد أو سداد عام)</label>
                  <select
                    value={collectionDebtId}
                    onChange={(e) => {
                      const dId = e.target.value;
                      setCollectionDebtId(dId);
                      const target = debts.find(d => d.id === dId);
                      if (target) {
                        setCollectionAmount(target.remaining);
                      }
                    }}
                    className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white text-xs"
                  >
                    <option value="">-- تحصيل على المستندات والمديونيات بشكل عام --</option>
                    {debts.filter(d => d.customerId === collectionClientId && d.status !== 'paid').map(d => (
                      <option key={d.id} value={d.id}>رقم {d.id} - المتبقي: {d.remaining.toLocaleString()} ر.ي - {d.notes?.slice(0, 30)}...</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">المبلغ المحصل الفعلي *</label>
                <input 
                  type="number" 
                  required 
                  min="10"
                  value={collectionAmount} 
                  onChange={(e) => setCollectionAmount(parseFloat(e.target.value) || 0)} 
                  className="w-full font-mono bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">طريقة استلام الدفع</label>
                <select
                  value={collectionMethod}
                  onChange={(e) => setCollectionMethod(e.target.value as any)}
                  className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white"
                >
                  <option value="cash">نقداً بالخزينة العامة</option>
                  <option value="bank_transfer">شيك مصرفي / تحويل محفظة</option>
                  <option value="check">شيك لأمر المؤسسة</option>
                </select>
              </div>

              {/* Financial linkage options */}
              <div className="space-y-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg text-xs">
                <span className="font-bold text-indigo-750 block">خيارات الربط والمزامنة التلقائية:</span>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={linkToTreasury} 
                    onChange={(e) => setLinkToTreasury(e.target.checked)} 
                    className="rounded text-indigo-600 focus:outline-indigo-500"
                  />
                  <span>ترحيل وزيادة رصيد الخزنة العامة بقيمة {collectionAmount.toLocaleString()} ر.ي</span>
                </label>
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={linkToVoucher} 
                    onChange={(e) => setLinkToVoucher(e.target.checked)} 
                    className="rounded text-indigo-600 focus:outline-indigo-500"
                  />
                  <span>توليد واعتماد "سند قبض" فوري للتحصيل (يظهر بشاشة السحوبات)</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">البيان والملاحظات</label>
                <textarea 
                  value={collectionNotes} 
                  onChange={(e) => setCollectionNotes(e.target.value)} 
                  placeholder="مثال: سداد القسط الأول رصيد مستحق"
                  rows={2}
                  className="w-full bg-zinc-50 text-zinc-950 p-2 border rounded-lg dark:bg-zinc-800 dark:text-white font-sans text-xs"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsCollectionModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-650 rounded-lg text-xs"
                >
                  إلغاء التراجع
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                >
                  تسجيل التحصيل المالي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );

  function index(idx: number): number {
    return idx + 1;
  }
}
