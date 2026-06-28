import { Response } from 'express';

export function sendSuccess(res: Response, message: string, data: any = {}, status: number = 200) {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

export function sendError(res: Response, message: string, details: string | null = null, status: number = 400) {
  return res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  });
}
