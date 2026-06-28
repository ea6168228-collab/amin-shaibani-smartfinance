export const ROLE_PERMISSIONS = {
  admin: [
    'dashboard',
    'corporate_finance',
    'employees',
    'associations',
    'customers',
    'reports',
    'settings',
    'ai_assistant',
    'invoices',
    'maintenance'
  ],
  accountant: [
    'dashboard',
    'corporate_finance',
    'employees',
    'associations',
    'customers',
    'reports',
    'invoices'
  ],
  viewer: [
    'dashboard',
    'reports'
  ]
} as const;
