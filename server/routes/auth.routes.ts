import { Router } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, role, activeBranchId } = req.body;
    if (!username) {
      return sendError(res, 'اسم المستخدم مطلوب لتسجيل الدخول');
    }

    const authResult = await AuthService.authenticateUser(username, role, activeBranchId);
    return sendSuccess(res, 'تم تسجيل الدخول بنجاح وتوليد الجلسة الآمنة', authResult);
  } catch (err: any) {
    return sendError(res, 'فشل تسجيل الدخول', err?.message);
  }
});

export default router;
