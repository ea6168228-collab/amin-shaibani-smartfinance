import { signToken } from '../utils/jwt';

export class AuthService {
  static async authenticateUser(username: string, role: string, activeBranchId: string) {
    // Standard verification mock or database call
    const payload = {
      username,
      fullName: username === 'admin' ? 'أمين الشيباني المالك' : 'محاسب النظام المعتمد',
      role: role || 'viewer',
      activeBranchId: activeBranchId || 'branch_01',
      permissions: role === 'admin' ? ['all'] : ['read', 'write']
    };

    const token = signToken(payload);
    const tokenExpires = new Date(Date.now() + 3600 * 24 * 1000).toISOString(); // 24 hours expiry

    return {
      token,
      tokenExpires,
      user: payload
    };
  }
}
