import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';

export interface AuthenticatedRequest extends Request {
  user?: {
    username: string;
    role: string;
    fullName: string;
    activeBranchId: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'غير مصرح - الرجاء تزويد رمز التوثيق المناسب', null, 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return sendError(res, 'رمز توثيق غير صالح أو منتهي الصلاحية', null, 401);
    }

    req.user = {
      username: decoded.username,
      role: decoded.role,
      fullName: decoded.fullName,
      activeBranchId: decoded.activeBranchId || 'branch_01'
    };

    next();
  } catch (err: any) {
    return sendError(res, 'خطأ في معالجة التوثيق التلقائي', err?.message, 500);
  }
}
