export type SystemPermission =
  | 'add'
  | 'edit'
  | 'delete'
  | 'archive'
  | 'pdf'
  | 'export'
  | 'settings'
  | 'associations'
  | 'transactions';

export interface RolePermissions {
  add: boolean;
  edit: boolean;
  delete: boolean; // Note: permanent deletes are hardcoded to owner only in the app as requested, but we config it here too
  archive: boolean;
  pdf: boolean;
  export: boolean;
  settings: boolean;
  associations: boolean;
  transactions: boolean;
}

export type RoleCode = 'owner' | 'accountant' | 'data_entry' | 'supervisor' | 'view_only';

export interface RoleConfig {
  code: RoleCode;
  name: string;
  description: string;
  permissions: RolePermissions;
}

export const DEFAULT_ROLE_CONFIGS: Record<RoleCode, RoleConfig> = {
  owner: {
    code: 'owner',
    name: 'المالك الحصري',
    description: 'يمتلك كامل الصلاحيات الإدارية والمحاسبية والرقابية وإلغاء القيود بشكل كلي نهائي.',
    permissions: {
      add: true,
      edit: true,
      delete: true,
      archive: true,
      pdf: true,
      export: true,
      settings: true,
      associations: true,
      transactions: true,
    },
  },
  accountant: {
    code: 'accountant',
    name: 'المحاسب المسؤول',
    description: 'يتحكم بالقيود اليومية والرواتب والسلف وإعداد الكشوف، لا يملك الحذف النهائي أو الدخول للإعدادات.',
    permissions: {
      add: true,
      edit: true,
      delete: false,
      archive: true,
      pdf: true,
      export: true,
      settings: false,
      associations: false,
      transactions: true,
    },
  },
  data_entry: {
    code: 'data_entry',
    name: 'مدخل بيانات',
    description: 'يقوم بتسجيل حركات الموظفين وإجراءات اليومية والرواتب فقط، مع حظر التصدير أو الأرشفة المتقدمة.',
    permissions: {
      add: true,
      edit: true,
      delete: false,
      archive: false,
      pdf: true,
      export: false,
      settings: false,
      associations: false,
      transactions: true,
    },
  },
  supervisor: {
    code: 'supervisor',
    name: 'مشرف جمعية',
    description: 'مخول لإدارة سجلات الجمعيات المفتوحة، والمشتركين والتحصيلات، وليس له وصول كلي لرواتب الموظفين.',
    permissions: {
      add: true,
      edit: true,
      delete: false,
      archive: true,
      pdf: true,
      export: true,
      settings: false,
      associations: true,
      transactions: false,
    },
  },
  view_only: {
    code: 'view_only',
    name: 'مستخدم عرض فقط (استعراض)',
    description: 'مخصص للشركاء والمراجعين للاطلاع ومتابعة الحسابات أو طباعة الفواتير دون أي تخويل بالتسجيل أو التعديل.',
    permissions: {
      add: false,
      edit: false,
      delete: false,
      archive: false,
      pdf: true,
      export: false,
      settings: false,
      associations: false,
      transactions: false,
    },
  },
};

// Gets the current configuration of all roles from localStorage
export function getRolesConfig(): Record<RoleCode, RoleConfig> {
  try {
    const configStr = localStorage.getItem('amin_sh_permissions_config');
    if (configStr) {
      const parsed = JSON.parse(configStr);
      // Validate structure is correct, otherwise revert to defaults
      if (parsed.owner && parsed.accountant && parsed.data_entry && parsed.supervisor && parsed.view_only) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error parsing role permissions config:', e);
  }

  // Safe defaults seeding
  localStorage.setItem('amin_sh_permissions_config', JSON.stringify(DEFAULT_ROLE_CONFIGS));
  return DEFAULT_ROLE_CONFIGS;
}

// Saves custom configuration for all roles
export function saveRolesConfig(configs: Record<RoleCode, RoleConfig>) {
  localStorage.setItem('amin_sh_permissions_config', JSON.stringify(configs));
}

// Checks if the active user role has a specific permission
export function hasSystemPermission(permissionName: SystemPermission): boolean {
  try {
    const activeRole = (localStorage.getItem('amin_sh_active_role') as RoleCode) || 'owner';
    
    // Custom workspace logic: Custom isolated WhatsApp users have full access inside their own small space
    const currentUserId = localStorage.getItem('amin_sh_user_id') || '';
    const isCustom = currentUserId && !['admin', 'accountant', 'viewer'].includes(currentUserId);
    if (isCustom) {
      // Full power inside their own sandbox
      return true;
    }

    const configs = getRolesConfig();
    const roleConfig = configs[activeRole];
    if (roleConfig && roleConfig.permissions) {
      return !!roleConfig.permissions[permissionName];
    }
  } catch (e) {
    console.error('Failed to check permission:', e);
  }
  return false;
}

// Check if current month is locked
export function isMonthLocked(dateString: string): boolean {
  try {
    if (!dateString) return false;
    // Extract YYYY-MM
    const match = dateString.match(/^(\d{4}-\d{2})/);
    if (!match) return false;
    const targetMonth = match[1];

    const lockedStr = localStorage.getItem('amin_sh_locked_months') || '[]';
    const lockedList = JSON.parse(lockedStr);
    return Array.isArray(lockedList) ? lockedList.includes(targetMonth) : false;
  } catch {
    return false;
  }
}

// Check if user is the absolute Owner
export function isAbsoluteOwner(): boolean {
  try {
    const activeRole = localStorage.getItem('amin_sh_active_role') || 'owner';
    const currentUserId = localStorage.getItem('amin_sh_user_id') || '';
    const isCustom = currentUserId && !['admin', 'accountant', 'viewer'].includes(currentUserId);
    return activeRole === 'owner' || isCustom;
  } catch {
    return false;
  }
}
