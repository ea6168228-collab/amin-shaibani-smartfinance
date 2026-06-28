import express from 'express';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import hardenedApp from './server/app';

dotenv.config();

// Safe ES Module / CommonJS environment detection for filenames
const getFilename = () => {
  try {
    if (typeof __filename !== 'undefined') return __filename;
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return fileURLToPath(import.meta.url);
    }
  } catch (e) {}
  return '';
};

const _filename = getFilename();

const app = express();
app.use(express.json());

// Mount the Hardened Phase 10.5 Sub-Application
app.use(hardenedApp);

const PORT = 3000;

const CONFIG_PATH = path.join(process.cwd(), 'whatsapp_config.json');

interface WhatsAppConfig {
  WHATSAPP_INSTANCE_ID: string;
  WHATSAPP_API_TOKEN: string;
  WHATSAPP_CUSTOM_URL: string;
}

function getWhatsAppConfig(): WhatsAppConfig {
  let config: WhatsAppConfig = {
    WHATSAPP_INSTANCE_ID: '',
    WHATSAPP_API_TOKEN: '',
    WHATSAPP_CUSTOM_URL: ''
  };

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      config.WHATSAPP_INSTANCE_ID = (parsed.WHATSAPP_INSTANCE_ID || '').trim();
      config.WHATSAPP_API_TOKEN = (parsed.WHATSAPP_API_TOKEN || '').trim();
      config.WHATSAPP_CUSTOM_URL = (parsed.WHATSAPP_CUSTOM_URL || '').trim();
      return config;
    }
  } catch (error) {
    console.error('Error reading whatsapp_config.json:', error);
  }

  // Fallback to process.env and parse if not loaded
  config.WHATSAPP_API_TOKEN = (process.env.WHATSAPP_API_TOKEN || '').trim();
  config.WHATSAPP_CUSTOM_URL = (process.env.WHATSAPP_CUSTOM_URL || '').trim();

  const apiUrl = (process.env.WHATSAPP_API_URL || '').trim();
  if (apiUrl && apiUrl !== 'MY_APP_URL') {
    const instanceMatch = apiUrl.match(/(instance[a-zA-Z0-9]+)/i);
    if (instanceMatch) {
      config.WHATSAPP_INSTANCE_ID = instanceMatch[1];
    }
    if (!config.WHATSAPP_CUSTOM_URL) {
      try {
        const urlObj = new URL(apiUrl);
        config.WHATSAPP_CUSTOM_URL = `${urlObj.protocol}//${urlObj.hostname}`;
      } catch (err) {
        config.WHATSAPP_CUSTOM_URL = apiUrl;
      }
    }
  }

  if (!config.WHATSAPP_CUSTOM_URL) {
    config.WHATSAPP_CUSTOM_URL = 'https://api.ultramsg.com';
  }

  return config;
}

function saveWhatsAppConfig(config: WhatsAppConfig) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing whatsapp_config.json:', error);
    return false;
  }
}

// Get active WhatsApp configurations
app.get('/api/whatsapp/config', (req, res) => {
  try {
    const config = getWhatsAppConfig();
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to get config' });
  }
});

// Update WhatsApp configurations
app.post('/api/whatsapp/config', (req, res) => {
  try {
    const { WHATSAPP_INSTANCE_ID, WHATSAPP_API_TOKEN, WHATSAPP_CUSTOM_URL } = req.body;
    const config = {
      WHATSAPP_INSTANCE_ID: (WHATSAPP_INSTANCE_ID || '').trim(),
      WHATSAPP_API_TOKEN: (WHATSAPP_API_TOKEN || '').trim(),
      WHATSAPP_CUSTOM_URL: (WHATSAPP_CUSTOM_URL || '').trim()
    };
    const success = saveWhatsAppConfig(config);
    if (success) {
      return res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح في ملف إعدادات النظام.' });
    } else {
      return res.status(500).json({ success: false, error: 'فشل في حفظ ملف الإعدادات في ملقم النظام.' });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update config' });
  }
});

// Test connection on the fly
app.post('/api/whatsapp/test-connection', async (req, res) => {
  try {
    const { WHATSAPP_INSTANCE_ID, WHATSAPP_API_TOKEN, WHATSAPP_CUSTOM_URL } = req.body;
    
    // Use inputs from request body to test values directly as entered without forcing save first!
    const instanceId = (WHATSAPP_INSTANCE_ID || '').trim();
    const apiToken = (WHATSAPP_API_TOKEN || '').trim();
    let customUrl = (WHATSAPP_CUSTOM_URL || '').trim();

    if (!customUrl) {
      customUrl = 'https://api.ultramsg.com';
    }

    // Pre-validate input
    const startsWithHttps = customUrl.toLowerCase().startsWith('https://');
    if (!startsWithHttps) {
      return res.status(400).json({ 
        success: false, 
        error: `فشل تشخيص الإعدادات: الرابط المدخل لا يبدأ بـ https:// (القيمة الحالية: "${customUrl}"). رمز آمن (HTTPS) مطلوب لحماية الاتصال.` 
      });
    }

    const isUltraMsg = customUrl.toLowerCase().includes('ultramsg') || (!customUrl && instanceId);
    
    if (isUltraMsg && (!instanceId || instanceId.toLowerCase() === 'instancexxxx')) {
      return res.status(400).json({ 
        success: false, 
        error: 'فشل تشخيص الإعدادات: يجب تزويد معرف نسخة (Instance ID) صحيح لبوابة UltraMsg ولا يصح ترك القيمة الافتراضية "instanceXXXX".' 
      });
    }

    if (!apiToken || apiToken.toLowerCase() === 'your_whatsapp_token_here') {
      return res.status(400).json({ 
        success: false, 
        error: 'فشل تشخيص الإعدادات: رمز التوثيق (API Token) فارغ أو يحتوي على القيمة الافتراضية.' 
      });
    }

    // Build the ping test URL
    let testPingUrl = customUrl;
    if (isUltraMsg && instanceId) {
      const base = customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
      const cleanBase = base.includes('/instance') ? base.split('/instance')[0] : base;
      testPingUrl = `${cleanBase}/${instanceId}/instance/status?token=${apiToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const pingRes = await fetch(testPingUrl, {
        method: isUltraMsg ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Connection': 'close' },
        signal: controller.signal,
        ...(isUltraMsg ? {} : { body: JSON.stringify({ ping: true }) })
      });

      clearTimeout(timeoutId);
      const resValText = await pingRes.text();

      if (pingRes.ok) {
        if (isUltraMsg) {
          try {
            const json = JSON.parse(resValText);
            if (json.error || json.status === "blocked" || json.status === "disconnected") {
              return res.status(400).json({
                success: false,
                error: json.error || `حالة النسخة من المزود: ${json.status || 'فشل الاتصال'}. تأكد من إقران رمز QR وجاهزية النسخة.`
              });
            }
          } catch (e) {
            // Body not JSON or parsing failed, but HTTP was ok, so count as connected
          }
        }
        
        return res.json({ 
          success: true, 
          message: '✓ تم الاتصال بخدمة WhatsApp بنجاح.' 
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          error: `رفض سيرفر البوابة الاتصال. كود الاستجابة: ${pingRes.status} | تفاصيل الرد: ${resValText.slice(0, 150)}` 
        });
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      const errorDetails = isTimeout ? 'انتهت مهلة الملقم للربط (10 ثوانٍ)' : err.message;
      return res.status(400).json({ 
        success: false, 
        error: `فشل الاتصال: ${errorDetails}. يرجى التحقق من صحة الرابط والشبكة.` 
      });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error during test' });
  }
});

// Send custom test message
app.post('/api/whatsapp/send-test', async (req, res) => {
  try {
    const { WHATSAPP_INSTANCE_ID, WHATSAPP_API_TOKEN, WHATSAPP_CUSTOM_URL, toPhone } = req.body;

    if (!toPhone) {
      return res.status(400).json({ success: false, error: 'يجب كتابة رقم الهاتف المستهدف لإرسال رسالة الاختبار إليه.' });
    }

    const cleanPhone = toPhone.trim().replace(/\s/g, '');
    const normalizedPhone = normalizePhone(cleanPhone);

    const instanceId = (WHATSAPP_INSTANCE_ID || '').trim();
    const apiToken = (WHATSAPP_API_TOKEN || '').trim();
    let customUrl = (WHATSAPP_CUSTOM_URL || '').trim();

    if (!customUrl) {
      customUrl = 'https://api.ultramsg.com';
    }

    const isUltraMsg = customUrl.toLowerCase().includes('ultramsg') || (!customUrl && instanceId);
    
    // Format the complete message body
    const testMessageBody = `رسالة تجريبية ناجحة من نظام الشيباني للحلول التقنية لإعدادات البوابة والاتصال.`;

    // Build the sending URL
    let sendingUrl = customUrl;
    if (isUltraMsg && instanceId && !customUrl.includes('messages/chat')) {
      const base = customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
      sendingUrl = `${base}/${instanceId}/messages/chat`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const commonHeaders = {
      'Content-Type': 'application/json',
      'Connection': 'close'
    };

    try {
      let testResponse: any;
      if (isUltraMsg) {
        testResponse = await fetch(sendingUrl, {
          method: 'POST',
          headers: commonHeaders,
          signal: controller.signal,
          body: JSON.stringify({
            token: apiToken,
            to: normalizedPhone,
            body: testMessageBody
          })
        });
      } else {
        testResponse = await fetch(sendingUrl, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            ...commonHeaders,
            ...(apiToken ? { 'Authorization': `Bearer ${apiToken}`, 'Token': apiToken } : {})
          },
          body: JSON.stringify({
            token: apiToken,
            to: normalizedPhone,
            phone: normalizedPhone,
            body: testMessageBody,
            message: testMessageBody
          })
        });
      }

      clearTimeout(timeoutId);
      const responseText = await testResponse.text();

      if (testResponse.ok) {
        let isActuallySent = true;
        let mappedError = '';
        try {
          const json = JSON.parse(responseText);
          if (json.sent === "false" || json.success === false || json.error) {
            isActuallySent = false;
            const rawError = json.error || json.message || '';
            if (rawError.includes('Stopped due to non-payment') || rawError.includes('subscription') || rawError.includes('non-payment')) {
              mappedError = 'حساب بوابة الواتساب (UltraMsg) متوقف حالياً لعدم السداد أو انتهاء الاشتراك. يرجى تجديد الاشتراك لتفعيل الإرسال التلقائي للرسائل.';
            } else {
              mappedError = rawError;
            }
          }
        } catch (e) {}

        if (isActuallySent) {
          return res.json({ success: true, message: 'تم إرسال رسالة الاختبار بنجاح للرقم!' });
        } else {
          const detail = mappedError || `تعذر تسليم الرسالة. التفاصيل المرجعة: ${responseText}`;
          return res.status(400).json({ success: false, error: detail });
        }
      } else {
        let mappedError = '';
        if (responseText.includes('Stopped due to non-payment') || responseText.includes('subscription') || responseText.includes('non-payment')) {
          mappedError = 'حساب بوابة الواتساب (UltraMsg) متوقف حالياً لعدم السداد أو انتهاء الاشتراك. يرجى تجديد الاشتراك لتفعيل الإرسال التلقائي للرسائل.';
        } else {
          mappedError = `رفض خادم المزود إرسال الرسالة. كود الاستجابة: ${testResponse.status} | تفاصيل الرد: ${responseText.slice(0, 200)}`;
        }
        return res.status(400).json({ success: false, error: mappedError });
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === 'AbortError';
      const errorDetails = isTimeout ? 'انتهت مهلة الملقم المحددة بـ 10 ثوانٍ' : err.message;
      return res.status(400).json({ success: false, error: `حدث خطأ أثناء الإرسال: ${errorDetails}` });
    }
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Server error during test message send' });
  }
});

// Secure In-Memory storage for OTPs with timestamps (5-minute expiry)
interface OtpRecord {
  phone: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  status: 'unused' | 'used';
  name: string;
}
const activeOtps = new Map<string, OtpRecord>();

/**
 * Intelligent phone number normalization for WhatsApp gateways.
 * Formats Yemeni and international numbers to standard digits-only format with country prefix.
 */
function normalizePhone(phoneStr: string): string {
  let digits = phoneStr.replace(/[\s\-\(\)]/g, '').trim();
  if (digits.startsWith('0')) {
    digits = '+967' + digits.slice(1);
  } else if (digits.startsWith('7') && digits.length === 9) {
    digits = '+967' + digits;
  } else if (digits.startsWith('967') && digits.length === 12) {
    digits = '+' + digits;
  }
  return digits;
}

// API Endpoint to send OTP through real WhatsApp API (UltraMsg specific endpoint/payload)
app.post('/api/otp/send', async (req, res) => {
  const { phone, name } = req.body;

  if (!phone || !name) {
    return res.status(400).json({ success: false, error: 'رقم الهاتف والاسم مطلوبان لإجراء التحقق.' });
  }

  // Formatting and validation
  const cleanPhone = normalizePhone(phone);
  const yemeniPhoneRegex = /^\+967[0-9]{9}$/;
  if (!cleanPhone || !yemeniPhoneRegex.test(cleanPhone)) {
    return res.status(200).json({
      success: false,
      whatsappFailed: true,
      error: 'يرجى إدخال رقم هاتف صحيح بالصيغة اليمنية (مثال: 777123456 أو 0777123456 أو +967777123456).'
    });
  }

  // Create OTP Record
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  const createdAt = Date.now();
  const record: OtpRecord = {
    phone: cleanPhone,
    code: otpCode,
    createdAt,
    expiresAt,
    attempts: 0,
    status: 'unused',
    name
  };
  activeOtps.set(cleanPhone, record);

  // Retrieve UltraMsg configuration
  const config = getWhatsAppConfig();
  const apiToken = (process.env.WHATSAPP_API_TOKEN || config.WHATSAPP_API_TOKEN || '').trim();
  let apiUrl = (process.env.WHATSAPP_API_URL || '').trim();

  // If apiUrl env variable is empty or placeholder, build it dynamically from fallback config
  if (!apiUrl || apiUrl === 'https://api.ultramsg.com/instanceXXXX/messages/chat') {
    if (config.WHATSAPP_CUSTOM_URL && config.WHATSAPP_INSTANCE_ID) {
      const base = config.WHATSAPP_CUSTOM_URL.endsWith('/') ? config.WHATSAPP_CUSTOM_URL.slice(0, -1) : config.WHATSAPP_CUSTOM_URL;
      apiUrl = `${base}/${config.WHATSAPP_INSTANCE_ID}/messages/chat`;
    } else if (config.WHATSAPP_CUSTOM_URL && config.WHATSAPP_CUSTOM_URL.includes('/messages/chat')) {
      apiUrl = config.WHATSAPP_CUSTOM_URL;
    } else {
      apiUrl = 'https://api.ultramsg.com/instanceXXXX/messages/chat';
    }
  }

  // Pre-dispatch validations
  const isMissingUrl = !apiUrl || apiUrl === '' || apiUrl.includes('instanceXXXX');
  const isMissingToken = !apiToken || apiToken === '' || apiToken === 'your_whatsapp_token_here';

  if (isMissingUrl || isMissingToken) {
    const errorText = isMissingUrl 
      ? 'رابط الـ API الخاص بـ UltraMsg غير مكوّن أو مغلوط.' 
      : 'رمز التوثيق الخاص بالـ API الخاص بـ UltraMsg فارغ أو غير مكوّن.';
    
    console.error(`🚨 Configuration Validation Failure: ${errorText}`);
    return res.status(200).json({
      success: false,
      whatsappFailed: true,
      code: otpCode,
      error: errorText,
      diagnosticReport: errorText
    });
  }

  // Debug log at start
  console.log(`\n================= DEBUG OTP FLOW =================`);
  console.log(`📱 الرقم بعد التنسيق: ${cleanPhone}`);
  console.log(`⏰ وقت إنشاء OTP: ${new Date(createdAt).toISOString()}`);
  console.log(`📡 وقت الإرسال: ${new Date().toISOString()}`);
  console.log(`🔗 رابط الإرسال المستخدم: ${apiUrl}`);
  console.log(`==================================================\n`);

  try {
    const requestBody = {
      token: apiToken,
      to: cleanPhone,
      body: `رمز التحقق الخاص بك في نظام أمين الشيباني الذكي هو: ${otpCode}\nصلاحية الرمز 5 دقائق. لا تشارك هذا الرمز مع أي شخص.`
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'close'
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody)
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log(`\n================= DEBUG OTP RESPONSE =================`);
    console.log(`🚦 كود الاستجابة: ${response.status}`);
    console.log(`📄 نص الاستجابة: ${responseText}`);
    console.log(`======================================================\n`);

    let isSentOk = response.ok;
    let errorMessage = 'فشل إرسال رمز التحقق عبر واتساب، تحقق من اتصال UltraMsg أو إعدادات API';

    try {
      const json = JSON.parse(responseText);
      if (json.error || json.message) {
        isSentOk = false;
        const rawError = json.error || json.message || errorMessage;
        if (rawError.includes('Stopped due to non-payment') || rawError.includes('subscription') || rawError.includes('non-payment')) {
          errorMessage = 'حساب بوابة الواتساب (UltraMsg) متوقف حالياً لعدم السداد أو انتهاء الاشتراك. يرجى تجديد الاشتراك لتفعيل الإرسال التلقائي للرسائل.';
        } else {
          errorMessage = rawError;
        }
      } else if (json.status === "blocked") {
        isSentOk = false;
        errorMessage = "الحساب محظور في بوابة المزود (Instance Blocked)";
      } else if (json.sent === "false" || json.success === false) {
        isSentOk = false;
        errorMessage = json.message || errorMessage;
      }
    } catch (e) {
      if (!response.ok) {
        isSentOk = false;
        if (responseText.includes('Stopped due to non-payment') || responseText.includes('subscription') || responseText.includes('non-payment')) {
          errorMessage = 'حساب بوابة الواتساب (UltraMsg) متوقف حالياً لعدم السداد أو انتهاء الاشتراك. يرجى تجديد الاشتراك لتفعيل الإرسال التلقائي للرسائل.';
        }
      }
    }

    if (isSentOk) {
      console.log(`✨ OTP sent successfully to ${cleanPhone}`);
      return res.status(200).json({
        success: true,
        message: 'تم إرسال رمز التحقق عبر واتساب بنجاح',
        code: otpCode
      });
    } else {
      console.error(`🚨 OTP sending failed: ${errorMessage}`);
      return res.status(200).json({
        success: false,
        whatsappFailed: true,
        code: otpCode,
        error: errorMessage
      });
    }

  } catch (error: any) {
    const excMsg = error.name === 'AbortError' ? 'انتهت مهلة المزامنة المحددة بـ 12 ثانية (Network Timeout)' : error.message;
    console.error(`\n========= DIAGNOSTIC REPORT (EXCEPTION DURING SEND) =========\n${excMsg}\n`);
    return res.status(200).json({
      success: false,
      whatsappFailed: true,
      code: otpCode,
      error: excMsg
    });
  }
});

// API Endpoint to securely verify OTP on backend
app.post('/api/otp/verify', (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(450).json({ success: false, error: 'الرقم والرمز مطلوبان للتحقق.' });
  }

  const cleanPhone = normalizePhone(phone);
  const activeOtp = activeOtps.get(cleanPhone);

  if (!activeOtp) {
    return res.status(400).json({ success: false, error: 'لم يتم طلب رمز تحقق لهذا الرقم أو انتهت صلاحيته.' });
  }

  // Check Expiry (5 minutes)
  if (Date.now() > activeOtp.expiresAt) {
    activeOtps.delete(cleanPhone);
    return res.status(400).json({ success: false, error: 'انتهت صلاحية رمز التحقق، أعد الإرسال' });
  }

  // Match the code
  if (activeOtp.code === code.trim()) {
    activeOtp.status = 'used';
    activeOtps.delete(cleanPhone); // Single-use OTP token consumption
    return res.json({ success: true, message: 'تم التحقق بنجاح.' });
  } else {
    // Increment Attempts
    activeOtp.attempts = (activeOtp.attempts || 0) + 1;
    activeOtps.set(cleanPhone, activeOtp);
    
    console.log(`❌ Incorrect OTP entered for ${cleanPhone}. Attempts: ${activeOtp.attempts}`);
    return res.status(400).json({ 
      success: false, 
      error: 'رمز التحقق غير صحيح',
      attempts: activeOtp.attempts
    });
  }
});

// Initialize Google GenAI client lazily (only if API key is present)
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ Warning: GEMINI_API_KEY environment variable is not defined. Using local analysis fallback.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API Endpoint for AI Assistance / Intelligent Accountant Analysis
app.post('/api/ai/analyze', async (req, res) => {
  const { employees, transactions, currentMonth, customCategories } = req.body;

  if (!employees || !transactions) {
    return res.status(400).json({ error: 'مطلوب إرسال بيانات الموظفين والعمليات للتحليل.' });
  }

  const ai = getAiClient();

  if (!ai) {
    // Elegant local dashboard analysis calculation fallback if Gemini API is not specified
    console.log("Using local calculation rules for fallback analytical response.");
    
    // Quick calculations
    const activeEmployeesCount = employees.filter((e: any) => !e.isArchived).length;
    let totalDebit = 0;
    let totalCredit = 0;
    const errors: string[] = [];
    const anomalies: string[] = [];
    const recurringAlerts: string[] = [];

    transactions.forEach((tx: any) => {
      totalDebit += tx.debit || 0;
      totalCredit += tx.credit || 0;
      
      // Look for custom anomalies
      if (tx.debit > 2000 && tx.type === 'advance') {
        anomalies.push(`الموظف ذو الرقم ${tx.employeeId} قام بسحب سلفة مرتفعة بقيمة ${tx.debit} يمني/دولار في ${tx.date} - يُفضل مراجعة الملاءة المالية.`);
      }
      if (tx.credit === 0 && tx.debit === 0) {
        errors.push(`تنبيه محاسبي: الحركة رقم ${tx.id} بيانها "${tx.statement}" تفتقر للقيم المالية المدين أو الدائن.`);
      }
    });

    // Check for duplicate advances for same employee on same day
    const seenTx = new Map<string, string>();
    transactions.forEach((tx: any) => {
      const key = `${tx.employeeId}_${tx.date}_${tx.type}`;
      if (seenTx.has(key) && tx.type === 'thursday_advance') {
        recurringAlerts.push(`تنبيه: حركة سلفة خميس مكررة في نفس التاريخ للموظف ذو المعرف ${tx.employeeId}`);
      }
      seenTx.set(key, tx.id);
    });

    const fallbackResult = {
      expenseSummary: `إجمالي المبيعات والرواتب يظهر تدفق مالي منضغط بمصروفات إجمالية قيمتها ${totalDebit} دائن مقابل استحقاق ${totalCredit} مدين. إجمالي الموظفين النشطين هو ${activeEmployeesCount} موظف.`,
      discrepancies: errors.length > 0 ? errors : ["لا يوجد أخطاء كتابية أو حسابية واضحة في ميزان العمليات الحالي."],
      recursiveDeductions: recurringAlerts.length > 0 ? recurringAlerts : ["شكل الخصومات والسلف متزن ويندرج تحت سلف الخميس المحددة سلفاً."],
      anomalies: anomalies.length > 0 ? anomalies : ["لم تُكتشف عمليات شاذة أو سحوبات مفاجئة تتجاوز حدود الأمان المحاسبي المبرمجة."],
      monthlySummaryMarkdown: `### 📊 ملخص التحليل الذكي التلقائي لقسم الحسابات (نظام أمين الشيباني المساعد)
- **تقدير السيولة**: يتميز تدفق الرواتب بالاستقرار، بلغت نسبة الاستردادات للعهد نسبة ممتازة.
- **توصيات الإدارة**: يُفضّل وضع سقف محدد لسلف الخميس للحد من السحب العشوائي المتكرر وضمان ترحيل الرصيد الصافي دون تجاوز الراتب الكلي.
- **تنبيه الأنشطة**: يرجى تفعيل دور الإشعارات لتأكيد تفاصيل استحقاق ملابس العيد قبل التخصيص النهائي.`
    };

    return res.json(fallbackResult);
  }

  try {
    // Generate intelligent results using Gemini Flash 3.5
    const prompt = `
أنت المساعد المالي والذكاء المحاسبي الذكي لنظام "أمين الشيباني الذكي لإدارة الرواتب والسلف والسحوبات".
قم بمراجعة وتحليل بيانات المادة المحاسبية التالية للمؤسسة لتقديم تحليلات ذكية ومقترحات دقيقة باللغة العربية.

بيانات الموظفين:
${JSON.stringify(employees, null, 2)}

بيانات حركات السجل المالي والقيود:
${JSON.stringify(transactions, null, 2)}

الوقت الحالي للتقرير: ${currentMonth || 'الشهر الحالي'}
الفئات والأنواع المدعومة: ${JSON.stringify(customCategories || [])}

المطلوب التحليل باللغة العربية الفصحى وبشكل رسمي دقيق، والتركيز على مكامن الخلل أو النقاط الإيجابية.
يجب أن ترجع النتيجة كصيغة JSON تطابق البنية الهيكلية التالية تماماً وبدون أي نصوص مقتبسة خارج القالب:
{
  "expenseSummary": "ملخص تحليلي للمصروفات والرواتب والتدفق النقدي بنثر مالي بليغ",
  "discrepancies": ["مصفوفة من الأخطاء المحاسبية أو التناقضات المكتشفة، مثل الموظفين الذين تزيد سلفهم عن رواتبهم أو حركات بلا قيمة"],
  "recursiveDeductions": ["مصفوفة من الخصومات أو الأقساط أو السلف المتكررة المكتشفة واقتراحات لتأكيدها وتثبيتها"],
  "anomalies": ["عمليات غير طبيعية أو سحوبات نقدية ضخمة أو حركات في تواريخ غريبة تثير الانتباه"],
  "monthlySummaryMarkdown": "ملخص مالي شهري شامل ومميز بصيغة تنسيق دوت ماركداون Markdown يحتوي على جداول وتنبيهات وتوجيهات تنظيمية للمحاسب"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            expenseSummary: {
              type: Type.STRING,
              description: "ملخص تحليلي للمصروفات والرواتب والتدفق النقدي بنثر مالي بليغ باللغة العربية"
            },
            discrepancies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "مصفوفة من الأخطاء المحاسبية أو التناقضات المكتشفة باللغة العربية"
            },
            recursiveDeductions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "مصفوفة من الخصومات أو الأقساط أو السلف المتكررة المكتشفة واقتراحات لتأكيدها وتثبيتها باللغة العربية"
            },
            anomalies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "عمليات غير طبيعية أو سحوبات نقدية ضخمة أو حركات في تواريخ غريبة تثير الانتباه باللغة العربية"
            },
            monthlySummaryMarkdown: {
              type: Type.STRING,
              description: "ملخص مالي شهري شامل ومميز بصيغة تنسيق دوت ماركداون Markdown يحتوي على جداول وتنبيهات وتوجيهات تنظيمية للمحاسب باللغة العربية"
            }
          },
          required: ["expenseSummary", "discrepancies", "recursiveDeductions", "anomalies", "monthlySummaryMarkdown"]
        }
      },
    });

    const textOutput = response.text || '';
    const cleanJsonString = textOutput.trim();
    const resultObj = JSON.parse(cleanJsonString);
    res.json(resultObj);
  } catch (error: any) {
    console.error('Error with Gemini API call:', error);
    res.status(500).json({
      error: 'حدث خطأ أثناء معالجة التحليل بالذكاء الاصطناعي.',
      details: error?.message || String(error)
    });
  }
});

// API Endpoint to download complete project directory compiled into a high-compression ZIP file
app.get('/api/backup/project-zip', (req, res) => {
  try {
    const zip = new AdmZip();
    const rootDir = process.cwd();
    
    // Add critical folders & files selectively to minimize size and exclude node_modules, build outputs, .git, etc.
    const foldersToInclude = ['src', 'public', 'assets', 'android', 'server'];
    const filesToInclude = [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'vite.config.ts',
      'capacitor.config.json',
      'capacitor.config.ts',
      'codemagic.yaml',
      'index.html',
      'server.ts',
      'whatsapp_config.json',
      '.env.example',
      '.gitignore',
      'metadata.json'
    ];
    
    // Add folders
    for (const folder of foldersToInclude) {
      const folderPath = path.join(rootDir, folder);
      if (fs.existsSync(folderPath)) {
        if (folder === 'android') {
          // Add selectively to avoid adding huge compile/caching folders (.gradle, build, etc.)
          const addFolderRecursively = (localPath: string, zipPath: string) => {
            const items = fs.readdirSync(localPath);
            for (const item of items) {
              if (item === 'build' || item === '.gradle' || item === 'node_modules' || item === '.DS_Store' || item === '.idea') {
                continue;
              }
              const fullItemPath = path.join(localPath, item);
              const stat = fs.statSync(fullItemPath);
              if (stat.isDirectory()) {
                addFolderRecursively(fullItemPath, path.join(zipPath, item));
              } else {
                zip.addLocalFile(fullItemPath, zipPath);
              }
            }
          };
          addFolderRecursively(folderPath, folder);
        } else {
          zip.addLocalFolder(folderPath, folder);
        }
      }
    }
    
    // Add root files
    for (const file of filesToInclude) {
      const filePath = path.join(rootDir, file);
      if (fs.existsSync(filePath)) {
        zip.addLocalFile(filePath);
      }
    }
    
    const zipBuffer = zip.toBuffer();
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const fileName = `AminSmartFinance_${year}-${month}-${day}_${hours}-${minutes}_Project.zip`;
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', zipBuffer.length);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error('Error generating project ZIP:', err);
    res.status(500).json({ error: 'Failed to generate project backup ZIP', details: err?.message || String(err) });
  }
});

// Configure Vite middleware or serve static assets based on Environment
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' || 
                       _filename.endsWith('.cjs') || 
                       _filename.endsWith('.js') ||
                       !fs.existsSync(path.join(process.cwd(), 'server.ts'));

  const distPath = path.join(process.cwd(), 'dist');
  const indexExists = fs.existsSync(path.join(distPath, 'index.html'));

  if (isProduction && indexExists) {
    console.log('📦 Serving production static folder: ' + distPath);
    app.use(express.static(distPath));

    // Serve HTML diagnostics report under '/diagnostics' for self-checking
    app.get('/diagnostics', async (req, res) => {
      let rootSelfCheck = 'Not Checked';
      let apiCheck = 'Not Checked';
      let fetchError = '';

      try {
        const rootRes = await fetch(`http://127.0.0.1:${PORT}/`, { headers: { 'Connection': 'close' } });
        rootSelfCheck = rootRes.ok ? `EXCELLENT (HTTP ${rootRes.status})` : `FAILED (HTTP ${rootRes.status})`;
      } catch (err: any) {
        rootSelfCheck = `ERROR (UNABLE TO CONNECT)`;
        fetchError = err.message || String(err);
      }

      try {
        const apiRes = await fetch(`http://127.0.0.1:${PORT}/api/whatsapp/config`, { headers: { 'Connection': 'close' } });
        apiCheck = apiRes.ok ? `EXCELLENT (HTTP ${apiRes.status})` : `FAILED (HTTP ${apiRes.status})`;
      } catch (err: any) {
        apiCheck = `ERROR (UNABLE TO CONNECT)`;
      }

      const nodeEnv = process.env.NODE_ENV || 'Not Defined (Fallback Active)';
      const geminiKeyStatus = process.env.GEMINI_API_KEY ? 'CONFIGURED (Active)' : 'NOT CONFIGURED (Using local analysis)';
      const executionFile = _filename;
      const cwd = process.cwd();

      const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>التشخيص الذكي للنظام</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background-color: #0f172a;
            color: #f1f5f9;
            margin: 0;
            padding: 2rem 1rem;
            direction: rtl;
            text-align: right;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: #1e293b;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
            border: 1px solid #334155;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #334155;
            padding-bottom: 1.5rem;
            margin-bottom: 1.5rem;
          }
          .logo {
            background: #4f46e5;
            color: white;
            padding: 0.5rem 1rem;
            font-weight: 800;
            border-radius: 0.5rem;
            display: inline-block;
            margin-bottom: 1rem;
          }
          h1 { margin: 0; font-size: 1.75rem; color: #ffffff; }
          .subtitle { color: #94a3b8; font-size: 0.875rem; margin-top: 0.5rem; }
          .status-card {
            background: #0f172a;
            border-radius: 0.75rem;
            padding: 1.25rem;
            margin-bottom: 1rem;
            border: 1px solid #1e293b;
          }
          .status-title {
            font-weight: 700;
            margin-bottom: 0.75rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .badge { font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: 800; }
          .badge-success { background-color: #059669; color: #ecfdf5; }
          .badge-danger { background-color: #dc2626; color: #fef2f2; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
          .metric { background: #1e293b; padding: 1rem; border-radius: 0.5rem; border: 1px solid #334155; }
          .metric-label { font-size: 0.8125rem; color: #94a3b8; }
          .metric-value { font-size: 0.875rem; font-weight: bold; margin-top: 0.25rem; color: #ffffff; word-break: break-all; }
          .btn {
            display: block;
            width: 100%;
            text-align: center;
            background: #4f46e5;
            color: white;
            padding: 0.75rem;
            border: none;
            border-radius: 0.5rem;
            font-weight: 700;
            cursor: pointer;
            text-decoration: none;
            margin-top: 1.5rem;
            font-size: 0.9375rem;
            box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4);
          }
          .btn:hover { background: #4338ca; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">أمين الشيباني</div>
            <h1>تشخيص ونشر النظام الذكي</h1>
            <p class="subtitle">تقرير الفحص الآلي المستقل لعملية النشر وتوجيه المسارات</p>
          </div>

          <div class="status-card">
            <div class="status-title">
              <span>اختبار مسار الخدمة الرئيسي (/)</span>
              <span class="badge ${rootSelfCheck.includes('EXCELLENT') ? 'badge-success' : 'badge-danger'}">
                ${rootSelfCheck}
              </span>
            </div>
            <p class="subtitle" style="margin: 0;">يتحقق هذا الاختبار من قدرة خادم الويب على تسليم وتحميل الصفحة الرئيسية بنجاح دون أي 404.</p>
          </div>

          <div class="status-card">
            <div class="status-title">
              <span>اختبار خدمات واجهة الـ API والتحقق</span>
              <span class="badge ${apiCheck.includes('EXCELLENT') ? 'badge-success' : 'badge-danger'}">
                ${apiCheck}
              </span>
            </div>
            <p class="subtitle" style="margin: 0;">يتحقق هذا الاختبار من ربط الواجهة الأمامية بالخلفية وجاهزية قواعد البيانات المحلية وإعدادات المنظومة.</p>
          </div>

          <div class="status-card">
            <div class="status-title">
              <span>تواجد ملفات الواجهة الأمامية (Build Assets)</span>
              <span class="badge ${indexExists ? 'badge-success' : 'badge-danger'}">
                ${indexExists ? 'متوفر وجاهز (INDEX.HTML)' : 'غير متوفر (يرجى بناء التطبيق)'}
              </span>
            </div>
            <p class="subtitle" style="margin: 0;">مسار الواجهة الحقيقي: ${distPath}/index.html</p>
          </div>

          <div class="grid">
            <div class="metric">
              <div class="metric-label">بيئة التشغيل العقدية</div>
              <div class="metric-value">${nodeEnv}</div>
            </div>
            <div class="metric">
              <div class="metric-label">حالة ذكاء المنسق (Gemini API)</div>
              <div class="metric-value">${geminiKeyStatus}</div>
            </div>
            <div class="metric">
              <div class="metric-label">ملف التشغيل الحالي</div>
              <div class="metric-value">${executionFile}</div>
            </div>
            <div class="metric">
              <div class="metric-label">مسار العمل الحالي (CWD)</div>
              <div class="metric-value">${cwd}</div>
            </div>
          </div>

          ${fetchError ? `<div style="margin-top: 1rem; color: #fca5a5; font-size: 0.75rem; background: rgba(220, 38, 38, 0.1); padding: 0.75rem; border-radius: 0.5rem; border: 1px dashed rgba(220, 38, 38, 0.3);">فشل الاتصال الخارجي: ${fetchError}</div>` : ''}

          <a href="/" class="btn">الانتقال للواجهة الرئيسية لنظام أمين الشيباني</a>
        </div>
      </body>
      </html>
      `;
      res.send(html);
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('🛠️ Registering Vite Dev Server middleware for dynamic HMR...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // Mount Vite dev middleware
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Fully compliant full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
