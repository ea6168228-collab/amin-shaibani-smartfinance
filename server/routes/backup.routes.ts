import { Router } from 'express';
import { BackupService } from '../services/backup.service';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.post('/sign', async (req, res) => {
  try {
    const { backupPayload } = req.body;
    if (!backupPayload) {
      return sendError(res, 'بيانات النسخ الاحتياطي مفقودة');
    }

    const signed = await BackupService.signBackup(backupPayload);
    return sendSuccess(res, 'تم توقيع ملف النسخة الاحتياطية وتأمين سلامتها', { signed });
  } catch (err: any) {
    return sendError(res, 'فشل توقيع النسخة الاحتياطية', err?.message);
  }
});

router.post('/restore', async (req, res) => {
  try {
    const { backupJsonStr } = req.body;
    if (!backupJsonStr) {
      return sendError(res, 'ملف النسخة الاحتياطية مفقود');
    }

    const verified = await BackupService.verifyAndRestoreBackup(backupJsonStr);
    if (!verified) {
      return sendError(res, 'فشل التحقق من توقيع النسخة الاحتياطية أو الملف تالف ومعدّل!');
    }

    return sendSuccess(res, 'تم التحقق من سلامة النسخة الاحتياطية وهي جاهزة للاستعادة كلياً', { backup: verified });
  } catch (err: any) {
    return sendError(res, 'فشل استعادة النسخة الاحتياطية', err?.message);
  }
});

export default router;
