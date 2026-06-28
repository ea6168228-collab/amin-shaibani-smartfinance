import { Router } from 'express';
import { LicenseService } from '../services/license.service';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.post('/activate', async (req, res) => {
  try {
    const { installationId, licenseKey, customerName, phone, deviceId } = req.body;
    if (!installationId || !licenseKey || !customerName || !phone) {
      return sendError(res, 'جميع الحقول مطلوبة لتفعيل نظام الترخيص المعتمد');
    }

    const license = await LicenseService.activateLicense(installationId, licenseKey, customerName, phone, deviceId);
    return sendSuccess(res, 'تم تفعيل ترخيص المنظومة بنجاح', license);
  } catch (err: any) {
    return sendError(res, 'فشل تفعيل الترخيص', err?.message);
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { installationId } = req.body;
    if (!installationId) {
      return sendError(res, 'معرف التثبيت مطلوب للتحقق من الترخيص');
    }

    const license = await LicenseService.verifyLicense(installationId);
    if (!license) {
      return sendError(res, 'المنظومة غير مسجلة حالياً أو تعمل في الوضع التجريبي المؤقت', null, 404);
    }

    return sendSuccess(res, 'حالة الترخيص نشطة ومؤمنة', license);
  } catch (err: any) {
    return sendError(res, 'فشل التحقق من الترخيص', err?.message);
  }
});

export default router;
