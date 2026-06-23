import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Globe, 
  Server, 
  Wifi, 
  WifiOff, 
  Send, 
  Eye, 
  EyeOff, 
  Save, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Smartphone 
} from 'lucide-react';

interface WhatsAppSettingsViewProps {
  isReadOnly?: boolean;
}

export default function WhatsAppSettingsView({ isReadOnly = false }: WhatsAppSettingsViewProps) {
  const [instanceId, setInstanceId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  // Feedback states
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [sendMessageStatus, setSendMessageStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const [testPhoneNumber, setTestPhoneNumber] = useState('');

  // Loaded config (stored value indicators)
  const [savedConfig, setSavedConfig] = useState<{ WHATSAPP_INSTANCE_ID: string, WHATSAPP_API_TOKEN: string, WHATSAPP_CUSTOM_URL: string } | null>(null);

  // Fetch saved settings on mount
  useEffect(() => {
    fetchSavedConfig();
  }, []);

  const fetchSavedConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/whatsapp/config');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.config) {
          setInstanceId(data.config.WHATSAPP_INSTANCE_ID || '');
          setApiToken(data.config.WHATSAPP_API_TOKEN || '');
          setCustomUrl(data.config.WHATSAPP_CUSTOM_URL || '');
          setSavedConfig(data.config);
        }
      }
    } catch (error) {
      console.error('Failed to load WhatsApp config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert('⚠️ عذراً، لا يمكن حفظ الإعدادات أثناء وضع القراءة فقط.');
      return;
    }
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const response = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          WHATSAPP_INSTANCE_ID: instanceId,
          WHATSAPP_API_TOKEN: apiToken,
          WHATSAPP_CUSTOM_URL: customUrl
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSaveStatus({ type: 'success', message: data.message || 'تم حفظ الإعدادات بنجاح!' });
        setSavedConfig({
          WHATSAPP_INSTANCE_ID: instanceId,
          WHATSAPP_API_TOKEN: apiToken,
          WHATSAPP_CUSTOM_URL: customUrl
        });
      } else {
        setSaveStatus({ type: 'error', message: data.error || 'فشل حفظ الإعدادات.' });
      }
    } catch (error: any) {
      setSaveStatus({ type: 'error', message: error.message || 'فشل العثور على خط اتصال بالسيرفر.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (isReadOnly) {
      alert('⚠️ عذراً، لا يمكن اختبار الاتصال أثناء وضع القراءة فقط.');
      return;
    }
    setIsTesting(true);
    setTestStatus(null);
    try {
      const response = await fetch('/api/whatsapp/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          WHATSAPP_INSTANCE_ID: instanceId,
          WHATSAPP_API_TOKEN: apiToken,
          WHATSAPP_CUSTOM_URL: customUrl
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTestStatus({ type: 'success', message: '✓ تم الاتصال بخدمة WhatsApp بنجاح.' });
      } else {
        setTestStatus({ type: 'error', message: data.error || '✗ فشل الاتصال.' });
      }
    } catch (error: any) {
      setTestStatus({ type: 'error', message: `✗ فشل الاتصال: ${error.message || 'خطأ في معالجة الطلب.'}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert('⚠️ عذراً، لا يمكن إرسال رسائل اختبار أثناء وضع القراءة فقط.');
      return;
    }
    if (!testPhoneNumber.trim()) {
      setSendMessageStatus({ type: 'error', message: 'يرجى إدخال رقم الهاتف أولاً.' });
      return;
    }
    setIsSendingTest(true);
    setSendMessageStatus(null);
    try {
      const response = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          WHATSAPP_INSTANCE_ID: instanceId,
          WHATSAPP_API_TOKEN: apiToken,
          WHATSAPP_CUSTOM_URL: customUrl,
          toPhone: testPhoneNumber
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSendMessageStatus({ type: 'success', message: data.message || '✓ تم إرسال رسالة الاختبار بنجاح!' });
        setTestPhoneNumber('');
      } else {
        setSendMessageStatus({ type: 'error', message: data.error || 'فشل إرسال رسالة الاختبار.' });
      }
    } catch (error: any) {
      setSendMessageStatus({ type: 'error', message: `خطأ أثناء معالجة الإرسال: ${error.message}` });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div id="whatsapp-settings-view" className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm text-right">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">أدوات وبوابة اتصال WhatsApp API</h2>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
          إعداد حقول الربط وحفظها لتمكين توجيه التنبيهات والأكواد المؤقتة OTP تلقائياً عند إجراء العمليات الحساسة.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <span className="text-xs text-slate-400 font-medium">جاري تحميل إعدادات السيرفر الحالية...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Settings Form Panel (Take 2 cols on tablet/desktop) */}
          <div className="md:col-span-2 space-y-6">
            <form onSubmit={handleSaveSettings} className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl shadow-sm p-6 space-y-5 text-right">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-end gap-2 border-b border-slate-50 dark:border-zinc-800 pb-3">
                <span>تعديل مفاتيح الربط البرمجية</span>
                <Server size={18} className="text-indigo-600" />
              </h3>

              {/* WHATSAPP_INSTANCE_ID */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  معرّف النسخة (WHATSAPP_INSTANCE_ID)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={instanceId}
                    onChange={(e) => setInstanceId(e.target.value)}
                    placeholder="مثال: instance7123"
                    disabled={isReadOnly || isSaving}
                    className="w-full text-right bg-slate-50 focus:bg-white dark:bg-zinc-800/50 dark:focus:bg-zinc-800 border border-slate-100 focus:border-indigo-500 dark:border-zinc-800 focus:outline-none rounded-xl py-2 px-3.5 text-xs text-slate-800 dark:text-zinc-200 shadow-inner disabled:opacity-50"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500">من لوحة تحكم التوكن في UltraMsg أو المزود الخاص بك.</p>
              </div>

              {/* WHATSAPP_API_TOKEN */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  رمز التوثيق (WHATSAPP_API_TOKEN)
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showToken ? "text" : "password"}
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="أدخل الرمز السري للتوثيق..."
                    disabled={isReadOnly || isSaving}
                    className="w-full text-right bg-slate-50 focus:bg-white dark:bg-zinc-800/50 dark:focus:bg-zinc-800 border border-slate-100 focus:border-indigo-500 dark:border-zinc-800 focus:outline-none rounded-xl py-2 pl-10 pr-3.5 text-xs text-slate-800 dark:text-zinc-200 shadow-inner disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute left-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    title={showToken ? "إخفاء التفاصيل" : "عرض الرمز"}
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500">حقل مشفر لحماية الرموز الأمنية الموثوقة للمزود.</p>
              </div>

              {/* WHATSAPP_CUSTOM_URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  رابط ملقم الـ API الكامل (WHATSAPP_CUSTOM_URL)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://api.ultramsg.com"
                    disabled={isReadOnly || isSaving}
                    className="w-full text-left bg-slate-50 focus:bg-white dark:bg-zinc-800/50 dark:focus:bg-zinc-800 border border-slate-100 focus:border-indigo-500 dark:border-zinc-800 focus:outline-none rounded-xl py-2 px-3.5 text-xs text-slate-800 dark:text-zinc-200 shadow-inner disabled:opacity-50"
                    dir="ltr"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 text-right">رابط التوصيل الكامل المشفر. يجب أن يبدأ بـ HTTPS لتأمين تشفير البيانات.</p>
              </div>

              {/* Alert Feedback of Savings */}
              {saveStatus && (
                <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs text-right justify-end ${
                  saveStatus.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400' 
                    : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-400'
                }`}>
                  <div className="flex-1">
                    <p className="font-semibold">{saveStatus.message}</p>
                  </div>
                  {saveStatus.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving || isReadOnly}
                  className="flex-1 py-2.5 px-4 rounded-xl text-white text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span>جاري الحفظ...</span>
                      <Loader2 className="animate-spin" size={14} />
                    </>
                  ) : (
                    <>
                      <span>{isReadOnly ? 'وضع القراءة فقط مفعل' : 'حفظ الإعدادات'}</span>
                      <Save size={14} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || isReadOnly}
                  className="py-2.5 px-4 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <span>جاري الفحص...</span>
                      <Loader2 className="animate-spin" size={14} />
                    </>
                  ) : (
                    <>
                      <span>اختبار الاتصال</span>
                      <Wifi size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Test connection results diagnostics box if active */}
            {testStatus && (
              <div className={`p-4 rounded-2xl border text-right space-y-1.5 shadow-sm text-xs ${
                testStatus.type === 'success'
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-400 animate-fadeIn'
                  : 'bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900/20 text-red-800 dark:text-red-400 animate-fadeIn'
              }`}>
                <div className="flex justify-between items-center flex-row-reverse pb-1 border-b border-black/5 dark:border-white/5">
                  <span className="font-bold flex items-center gap-1">
                    <span>تشخيص اتصال الشبكة وبث الإشارة</span>
                    {testStatus.type === 'success' ? <Wifi className="text-emerald-600" size={14} /> : <WifiOff className="text-red-500" size={14} />}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${testStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>
                    {testStatus.type === 'success' ? 'متصل' : 'فشل الاتصال'}
                  </span>
                </div>
                <div className="pt-1 select-all font-mono whitespace-pre-wrap leading-relaxed text-[11px]">
                  {testStatus.message}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar column cards */}
          <div className="space-y-6">
            {/* Live Testing Form Side Panel */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-2xl p-5 shadow-sm text-right space-y-4">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-end gap-2 border-b border-slate-50 dark:border-zinc-800 pb-2.5">
                <span>إرسال رسالة اختبار</span>
                <Send size={15} className="text-indigo-600" />
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                اكتب رقم هاتفك المستهدف بالترميز الدولي لاختبار القدرة على إرسال الإشعارات المباشرة إلى هاتفك الحقيقي.
              </p>

              <form onSubmit={handleSendTestMessage} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-slate-500">رقم هاتف المستلم</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={testPhoneNumber}
                      onChange={(e) => setTestPhoneNumber(e.target.value)}
                      placeholder={isReadOnly ? "القراءة فقط نشط" : "967770000000"}
                      disabled={isReadOnly}
                      className="w-full text-left bg-slate-50 focus:bg-white dark:bg-zinc-800/50 dark:focus:bg-zinc-800 border border-slate-100 focus:border-indigo-500 dark:border-zinc-800 focus:outline-none rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-zinc-200 disabled:opacity-55"
                      dir="ltr"
                    />
                  </div>
                </div>

                {sendMessageStatus && (
                  <div className={`p-2.5 rounded-xl border text-[11px] ${
                    sendMessageStatus.type === 'success' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400' 
                      : 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-400'
                  }`}>
                    {sendMessageStatus.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingTest || isReadOnly}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition font-bold text-xs text-slate-700 dark:text-zinc-300 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <>
                      <span>جاري الإرسال...</span>
                      <Loader2 className="animate-spin text-slate-500" size={13} />
                    </>
                  ) : (
                    <>
                      <span>إرسال رسالة تجريبية</span>
                      <Smartphone size={13} />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Current saved configs box */}
            <div className="bg-slate-50 dark:bg-zinc-900/20 border border-slate-100 dark:border-zinc-800/40 rounded-2xl p-5 text-right space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-zinc-300">القيم النشطة حالياً في الذاكرة</h4>
              <div className="space-y-2 text-[11px] divide-y divide-dashed divide-slate-100 dark:divide-zinc-800/60">
                <div className="pt-2 flex justify-between gap-2 items-center flex-row-reverse">
                  <span className="text-slate-400">معرّف النسخة:</span>
                  <span className="font-mono text-slate-600 dark:text-zinc-400 break-all">{savedConfig?.WHATSAPP_INSTANCE_ID || <em className="text-amber-500">غير متوفر</em>}</span>
                </div>
                <div className="pt-2 flex justify-between gap-2 items-center flex-row-reverse">
                  <span className="text-slate-400">رمز التوثيق:</span>
                  <span className="font-mono text-slate-600 dark:text-zinc-400 break-all">
                    {savedConfig?.WHATSAPP_API_TOKEN ? '•••••••' : <em className="text-amber-500">غير متوفر</em>}
                  </span>
                </div>
                <div className="pt-2 flex justify-between gap-2 items-center flex-row-reverse">
                  <span className="text-slate-400">رابط الـ API:</span>
                  <span className="font-mono text-slate-600 dark:text-zinc-400 break-all leading-normal" dir="ltr">
                    {savedConfig?.WHATSAPP_CUSTOM_URL || <em className="text-amber-500">غير متوفر</em>}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
