import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { sendError } from '../utils/response';

export function roleMiddleware(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return sendError(res, 'غير مصرح - الرجاء تزويد رمز التوثيق المناسب', null, 401);
      }

      const userRole = (req.user.role || '').toLowerCase().trim();
      const isAllowed = allowedRoles.map(r => r.toLowerCase().trim()).includes(userRole);

      if (!isAllowed) {
        return sendError(res, 'خطأ صلاحية - ليس لديك إذن كافٍ لتنفيذ هذه العملية', null, 403);
      }

      next();
    } catch (err: any) {
      return sendError(res, 'خطأ صلاحية غير متوقع', err?.message, 500);
    }
  };
}
