import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

export function auditMiddleware(moduleName: string, actionName: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Intercept successful responses to write audit logs safely
    const originalSend = res.send;

    res.send = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const username = req.user?.username || 'مجهول';
        console.log(`[AUDIT LOG] User: ${username} | Module: ${moduleName} | Action: ${actionName} | Date: ${new Date().toISOString()}`);
        // Here you would normally write to a database or append to audit logs
      }
      return originalSend.call(this, body);
    };

    next();
  };
}
