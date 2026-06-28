import { Router } from 'express';
import { AiService } from '../services/ai.service';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

router.post('/ask', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    // Skeleton implementation for general chatbot ask or helper
    if (!prompt) {
      return sendError(res, 'النص المطلوب مفقود');
    }
    // We can return a successful payload or placeholder response if keys are missing
    return sendSuccess(res, 'تمت معالجة الطلب بالذكاء الاصطناعي', {
      response: "أنا المساعد المالي لنظام أمين الشيباني المعتمد. طلبك قيد التطوير للربط الحصري بالإنتاج."
    });
  } catch (err: any) {
    return sendError(res, 'فشل معالجة طلب المساعد الذكي', err?.message);
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const { employees, transactions, currentMonth, customCategories } = req.body;
    if (!employees || !transactions) {
      return sendError(res, 'بيانات التحليل ناقصة');
    }

    const analysis = await AiService.analyzeFinancialData(employees, transactions, currentMonth, customCategories);
    return res.json(analysis); // Retain original JSON format for backward compatibility
  } catch (err: any) {
    return sendError(res, 'فشل تحليل البيانات المالية بالذكاء الاصطناعي', err?.message);
  }
});

export default router;
