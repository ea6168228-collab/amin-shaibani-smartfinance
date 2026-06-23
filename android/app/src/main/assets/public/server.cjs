var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_url = require("url");
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_meta = {};
import_dotenv.default.config();
var getFilename = () => {
  try {
    if (typeof __filename !== "undefined") return __filename;
    if (typeof import_meta !== "undefined" && import_meta.url) {
      return (0, import_url.fileURLToPath)(import_meta.url);
    }
  } catch (e) {
  }
  return "";
};
var _filename = getFilename();
var app = (0, import_express.default)();
app.use(import_express.default.json());
var PORT = 3e3;
var CONFIG_PATH = import_path.default.join(process.cwd(), "whatsapp_config.json");
function getWhatsAppConfig() {
  let config = {
    WHATSAPP_INSTANCE_ID: "",
    WHATSAPP_API_TOKEN: "",
    WHATSAPP_CUSTOM_URL: ""
  };
  try {
    if (import_fs.default.existsSync(CONFIG_PATH)) {
      const data = import_fs.default.readFileSync(CONFIG_PATH, "utf8");
      const parsed = JSON.parse(data);
      config.WHATSAPP_INSTANCE_ID = (parsed.WHATSAPP_INSTANCE_ID || "").trim();
      config.WHATSAPP_API_TOKEN = (parsed.WHATSAPP_API_TOKEN || "").trim();
      config.WHATSAPP_CUSTOM_URL = (parsed.WHATSAPP_CUSTOM_URL || "").trim();
      return config;
    }
  } catch (error) {
    console.error("Error reading whatsapp_config.json:", error);
  }
  config.WHATSAPP_API_TOKEN = (process.env.WHATSAPP_API_TOKEN || "").trim();
  config.WHATSAPP_CUSTOM_URL = (process.env.WHATSAPP_CUSTOM_URL || "").trim();
  const apiUrl = (process.env.WHATSAPP_API_URL || "").trim();
  if (apiUrl && apiUrl !== "MY_APP_URL") {
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
    config.WHATSAPP_CUSTOM_URL = "https://api.ultramsg.com";
  }
  return config;
}
function saveWhatsAppConfig(config) {
  try {
    import_fs.default.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing whatsapp_config.json:", error);
    return false;
  }
}
app.get("/api/whatsapp/config", (req, res) => {
  try {
    const config = getWhatsAppConfig();
    return res.json({ success: true, config });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to get config" });
  }
});
app.post("/api/whatsapp/config", (req, res) => {
  try {
    const { WHATSAPP_INSTANCE_ID, WHATSAPP_API_TOKEN, WHATSAPP_CUSTOM_URL } = req.body;
    const config = {
      WHATSAPP_INSTANCE_ID: (WHATSAPP_INSTANCE_ID || "").trim(),
      WHATSAPP_API_TOKEN: (WHATSAPP_API_TOKEN || "").trim(),
      WHATSAPP_CUSTOM_URL: (WHATSAPP_CUSTOM_URL || "").trim()
    };
    const success = saveWhatsAppConfig(config);
    if (success) {
      return res.json({ success: true, message: "\u062A\u0645 \u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0628\u0646\u062C\u0627\u062D \u0641\u064A \u0645\u0644\u0641 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645." });
    } else {
      return res.status(500).json({ success: false, error: "\u0641\u0634\u0644 \u0641\u064A \u062D\u0641\u0638 \u0645\u0644\u0641 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0641\u064A \u0645\u0644\u0642\u0645 \u0627\u0644\u0646\u0638\u0627\u0645." });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Failed to update config" });
  }
});
app.post("/api/whatsapp/test-connection", async (req, res) => {
  try {
    const { WHATSAPP_INSTANCE_ID, WHATSAPP_API_TOKEN, WHATSAPP_CUSTOM_URL } = req.body;
    const instanceId = (WHATSAPP_INSTANCE_ID || "").trim();
    const apiToken = (WHATSAPP_API_TOKEN || "").trim();
    let customUrl = (WHATSAPP_CUSTOM_URL || "").trim();
    if (!customUrl) {
      customUrl = "https://api.ultramsg.com";
    }
    const startsWithHttps = customUrl.toLowerCase().startsWith("https://");
    if (!startsWithHttps) {
      return res.status(400).json({
        success: false,
        error: `\u0641\u0634\u0644 \u062A\u0634\u062E\u064A\u0635 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A: \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u062F\u062E\u0644 \u0644\u0627 \u064A\u0628\u062F\u0623 \u0628\u0640 https:// (\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629: "${customUrl}"). \u0631\u0645\u0632 \u0622\u0645\u0646 (HTTPS) \u0645\u0637\u0644\u0648\u0628 \u0644\u062D\u0645\u0627\u064A\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644.`
      });
    }
    const isUltraMsg = customUrl.toLowerCase().includes("ultramsg") || !customUrl && instanceId;
    if (isUltraMsg && (!instanceId || instanceId.toLowerCase() === "instancexxxx")) {
      return res.status(400).json({
        success: false,
        error: '\u0641\u0634\u0644 \u062A\u0634\u062E\u064A\u0635 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A: \u064A\u062C\u0628 \u062A\u0632\u0648\u064A\u062F \u0645\u0639\u0631\u0641 \u0646\u0633\u062E\u0629 (Instance ID) \u0635\u062D\u064A\u062D \u0644\u0628\u0648\u0627\u0628\u0629 UltraMsg \u0648\u0644\u0627 \u064A\u0635\u062D \u062A\u0631\u0643 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629 "instanceXXXX".'
      });
    }
    if (!apiToken || apiToken.toLowerCase() === "your_whatsapp_token_here") {
      return res.status(400).json({
        success: false,
        error: "\u0641\u0634\u0644 \u062A\u0634\u062E\u064A\u0635 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A: \u0631\u0645\u0632 \u0627\u0644\u062A\u0648\u062B\u064A\u0642 (API Token) \u0641\u0627\u0631\u063A \u0623\u0648 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0627\u0641\u062A\u0631\u0627\u0636\u064A\u0629."
      });
    }
    let testPingUrl = customUrl;
    if (isUltraMsg && instanceId) {
      const base = customUrl.endsWith("/") ? customUrl.slice(0, -1) : customUrl;
      const cleanBase = base.includes("/instance") ? base.split("/instance")[0] : base;
      testPingUrl = `${cleanBase}/${instanceId}/instance/status?token=${apiToken}`;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1e4);
    try {
      const pingRes = await fetch(testPingUrl, {
        method: isUltraMsg ? "GET" : "POST",
        headers: { "Content-Type": "application/json", "Connection": "close" },
        signal: controller.signal,
        ...isUltraMsg ? {} : { body: JSON.stringify({ ping: true }) }
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
                error: json.error || `\u062D\u0627\u0644\u0629 \u0627\u0644\u0646\u0633\u062E\u0629 \u0645\u0646 \u0627\u0644\u0645\u0632\u0648\u062F: ${json.status || "\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644"}. \u062A\u0623\u0643\u062F \u0645\u0646 \u0625\u0642\u0631\u0627\u0646 \u0631\u0645\u0632 QR \u0648\u062C\u0627\u0647\u0632\u064A\u0629 \u0627\u0644\u0646\u0633\u062E\u0629.`
              });
            }
          } catch (e) {
          }
        }
        return res.json({
          success: true,
          message: "\u2713 \u062A\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u062E\u062F\u0645\u0629 WhatsApp \u0628\u0646\u062C\u0627\u062D."
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `\u0631\u0641\u0636 \u0633\u064A\u0631\u0641\u0631 \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0627\u062A\u0635\u0627\u0644. \u0643\u0648\u062F \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629: ${pingRes.status} | \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0631\u062F: ${resValText.slice(0, 150)}`
        });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === "AbortError";
      const errorDetails = isTimeout ? "\u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0645\u0644\u0642\u0645 \u0644\u0644\u0631\u0628\u0637 (10 \u062B\u0648\u0627\u0646\u064D)" : err.message;
      return res.status(400).json({
        success: false,
        error: `\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644: ${errorDetails}. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0635\u062D\u0629 \u0627\u0644\u0631\u0627\u0628\u0637 \u0648\u0627\u0644\u0634\u0628\u0643\u0629.`
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Server error during test" });
  }
});
app.post("/api/whatsapp/send-test", async (req, res) => {
  try {
    const { WHATSAPP_INSTANCE_ID, WHATSAPP_API_TOKEN, WHATSAPP_CUSTOM_URL, toPhone } = req.body;
    if (!toPhone) {
      return res.status(400).json({ success: false, error: "\u064A\u062C\u0628 \u0643\u062A\u0627\u0628\u0629 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641 \u0644\u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0625\u0644\u064A\u0647." });
    }
    const cleanPhone = toPhone.trim().replace(/\s/g, "");
    const normalizedPhone = normalizePhone(cleanPhone);
    const instanceId = (WHATSAPP_INSTANCE_ID || "").trim();
    const apiToken = (WHATSAPP_API_TOKEN || "").trim();
    let customUrl = (WHATSAPP_CUSTOM_URL || "").trim();
    if (!customUrl) {
      customUrl = "https://api.ultramsg.com";
    }
    const isUltraMsg = customUrl.toLowerCase().includes("ultramsg") || !customUrl && instanceId;
    const testMessageBody = `\u0631\u0633\u0627\u0644\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0646\u0627\u062C\u062D\u0629 \u0645\u0646 \u0646\u0638\u0627\u0645 \u0627\u0644\u0634\u064A\u0628\u0627\u0646\u064A \u0644\u0644\u062D\u0644\u0648\u0644 \u0627\u0644\u062A\u0642\u0646\u064A\u0629 \u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0648\u0627\u0644\u0627\u062A\u0635\u0627\u0644.`;
    let sendingUrl = customUrl;
    if (isUltraMsg && instanceId && !customUrl.includes("messages/chat")) {
      const base = customUrl.endsWith("/") ? customUrl.slice(0, -1) : customUrl;
      sendingUrl = `${base}/${instanceId}/messages/chat`;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1e4);
    const commonHeaders = {
      "Content-Type": "application/json",
      "Connection": "close"
    };
    try {
      let testResponse;
      if (isUltraMsg) {
        testResponse = await fetch(sendingUrl, {
          method: "POST",
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
          method: "POST",
          signal: controller.signal,
          headers: {
            ...commonHeaders,
            ...apiToken ? { "Authorization": `Bearer ${apiToken}`, "Token": apiToken } : {}
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
        try {
          const json = JSON.parse(responseText);
          if (json.sent === "false" || json.success === false) {
            isActuallySent = false;
          }
        } catch (e) {
        }
        if (isActuallySent) {
          return res.json({ success: true, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0628\u0646\u062C\u0627\u062D \u0644\u0644\u0631\u0642\u0645!" });
        } else {
          return res.status(400).json({ success: false, error: `\u0627\u0633\u062A\u062C\u0627\u0628 \u0627\u0644\u0633\u064A\u0631\u0641\u0631 \u0628\u0646\u062C\u0627\u062D \u0648\u0644\u0643\u0646 \u062A\u0639\u0630\u0631 \u062A\u0633\u0644\u064A\u0645 \u0627\u0644\u0631\u0633\u0627\u0644\u0629 (\u0645\u062B\u0644\u0627\u064B \u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u0639\u0637\u0644 \u0623\u0648 \u0627\u0644\u0631\u0642\u0645 \u063A\u064A\u0631 \u0645\u0633\u062C\u0644). \u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0631\u062C\u0639\u0629: ${responseText}` });
        }
      } else {
        return res.status(400).json({ success: false, error: `\u0631\u0641\u0636 \u062E\u0627\u062F\u0645 \u0627\u0644\u0645\u0632\u0648\u062F \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629. \u0643\u0648\u062F \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629: ${testResponse.status} | \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0631\u062F: ${responseText.slice(0, 200)}` });
      }
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === "AbortError";
      const errorDetails = isTimeout ? "\u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0645\u0644\u0642\u0645 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u0628\u0640 10 \u062B\u0648\u0627\u0646\u064D" : err.message;
      return res.status(400).json({ success: false, error: `\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0625\u0631\u0633\u0627\u0644: ${errorDetails}` });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Server error during test message send" });
  }
});
var activeOtps = /* @__PURE__ */ new Map();
function normalizePhone(phoneStr) {
  let digits = phoneStr.replace(/[\s\-\(\)]/g, "").trim();
  if (digits.startsWith("0")) {
    digits = "+967" + digits.slice(1);
  } else if (digits.startsWith("7") && digits.length === 9) {
    digits = "+967" + digits;
  } else if (digits.startsWith("967") && digits.length === 12) {
    digits = "+" + digits;
  }
  return digits;
}
app.post("/api/otp/send", async (req, res) => {
  const { phone, name } = req.body;
  if (!phone || !name) {
    return res.status(400).json({ success: false, error: "\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062A\u0641 \u0648\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628\u0627\u0646 \u0644\u0625\u062C\u0631\u0627\u0621 \u0627\u0644\u062A\u062D\u0642\u0642." });
  }
  const cleanPhone = normalizePhone(phone);
  const yemeniPhoneRegex = /^\+967[0-9]{9}$/;
  if (!cleanPhone || !yemeniPhoneRegex.test(cleanPhone)) {
    return res.status(200).json({
      success: false,
      whatsappFailed: true,
      error: "\u064A\u0631\u062C\u0649 \u0625\u062F\u062E\u0627\u0644 \u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0635\u062D\u064A\u062D \u0628\u0627\u0644\u0635\u064A\u063A\u0629 \u0627\u0644\u064A\u0645\u0646\u064A\u0629 (\u0645\u062B\u0627\u0644: 777123456 \u0623\u0648 0777123456 \u0623\u0648 +967777123456)."
    });
  }
  const otpCode = Math.floor(1e5 + Math.random() * 9e5).toString();
  const expiresAt = Date.now() + 5 * 60 * 1e3;
  const createdAt = Date.now();
  const record = {
    phone: cleanPhone,
    code: otpCode,
    createdAt,
    expiresAt,
    attempts: 0,
    status: "unused",
    name
  };
  activeOtps.set(cleanPhone, record);
  const config = getWhatsAppConfig();
  const apiToken = (process.env.WHATSAPP_API_TOKEN || config.WHATSAPP_API_TOKEN || "").trim();
  let apiUrl = (process.env.WHATSAPP_API_URL || "").trim();
  if (!apiUrl || apiUrl === "https://api.ultramsg.com/instanceXXXX/messages/chat") {
    if (config.WHATSAPP_CUSTOM_URL && config.WHATSAPP_INSTANCE_ID) {
      const base = config.WHATSAPP_CUSTOM_URL.endsWith("/") ? config.WHATSAPP_CUSTOM_URL.slice(0, -1) : config.WHATSAPP_CUSTOM_URL;
      apiUrl = `${base}/${config.WHATSAPP_INSTANCE_ID}/messages/chat`;
    } else if (config.WHATSAPP_CUSTOM_URL && config.WHATSAPP_CUSTOM_URL.includes("/messages/chat")) {
      apiUrl = config.WHATSAPP_CUSTOM_URL;
    } else {
      apiUrl = "https://api.ultramsg.com/instanceXXXX/messages/chat";
    }
  }
  const isMissingUrl = !apiUrl || apiUrl === "" || apiUrl.includes("instanceXXXX");
  const isMissingToken = !apiToken || apiToken === "" || apiToken === "your_whatsapp_token_here";
  if (isMissingUrl || isMissingToken) {
    const errorText = isMissingUrl ? "\u0631\u0627\u0628\u0637 \u0627\u0644\u0640 API \u0627\u0644\u062E\u0627\u0635 \u0628\u0640 UltraMsg \u063A\u064A\u0631 \u0645\u0643\u0648\u0651\u0646 \u0623\u0648 \u0645\u063A\u0644\u0648\u0637." : "\u0631\u0645\u0632 \u0627\u0644\u062A\u0648\u062B\u064A\u0642 \u0627\u0644\u062E\u0627\u0635 \u0628\u0627\u0644\u0640 API \u0627\u0644\u062E\u0627\u0635 \u0628\u0640 UltraMsg \u0641\u0627\u0631\u063A \u0623\u0648 \u063A\u064A\u0631 \u0645\u0643\u0648\u0651\u0646.";
    console.error(`\u{1F6A8} Configuration Validation Failure: ${errorText}`);
    return res.status(200).json({
      success: false,
      whatsappFailed: true,
      code: otpCode,
      error: errorText,
      diagnosticReport: errorText
    });
  }
  console.log(`
================= DEBUG OTP FLOW =================`);
  console.log(`\u{1F4F1} \u0627\u0644\u0631\u0642\u0645 \u0628\u0639\u062F \u0627\u0644\u062A\u0646\u0633\u064A\u0642: ${cleanPhone}`);
  console.log(`\u23F0 \u0648\u0642\u062A \u0625\u0646\u0634\u0627\u0621 OTP: ${new Date(createdAt).toISOString()}`);
  console.log(`\u{1F4E1} \u0648\u0642\u062A \u0627\u0644\u0625\u0631\u0633\u0627\u0644: ${(/* @__PURE__ */ new Date()).toISOString()}`);
  console.log(`\u{1F517} \u0631\u0627\u0628\u0637 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645: ${apiUrl}`);
  console.log(`==================================================
`);
  try {
    const requestBody = {
      token: apiToken,
      to: cleanPhone,
      body: `\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643 \u0641\u064A \u0646\u0638\u0627\u0645 \u0623\u0645\u064A\u0646 \u0627\u0644\u0634\u064A\u0628\u0627\u0646\u064A \u0627\u0644\u0630\u0643\u064A \u0647\u0648: ${otpCode}
\u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0631\u0645\u0632 5 \u062F\u0642\u0627\u0626\u0642. \u0644\u0627 \u062A\u0634\u0627\u0631\u0643 \u0647\u0630\u0627 \u0627\u0644\u0631\u0645\u0632 \u0645\u0639 \u0623\u064A \u0634\u062E\u0635.`
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12e3);
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Connection": "close"
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody)
    });
    clearTimeout(timeoutId);
    const responseText = await response.text();
    console.log(`
================= DEBUG OTP RESPONSE =================`);
    console.log(`\u{1F6A6} \u0643\u0648\u062F \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629: ${response.status}`);
    console.log(`\u{1F4C4} \u0646\u0635 \u0627\u0644\u0627\u0633\u062A\u062C\u0627\u0628\u0629: ${responseText}`);
    console.log(`======================================================
`);
    let isSentOk = response.ok;
    let errorMessage = "\u0641\u0634\u0644 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628\u060C \u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u062A\u0635\u0627\u0644 UltraMsg \u0623\u0648 \u0625\u0639\u062F\u0627\u062F\u0627\u062A API";
    try {
      const json = JSON.parse(responseText);
      if (json.error || json.message) {
        isSentOk = false;
        errorMessage = json.error || json.message || errorMessage;
      } else if (json.status === "blocked") {
        isSentOk = false;
        errorMessage = "\u0627\u0644\u062D\u0633\u0627\u0628 \u0645\u062D\u0638\u0648\u0631 \u0641\u064A \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u0645\u0632\u0648\u062F (Instance Blocked)";
      } else if (json.sent === "false" || json.success === false) {
        isSentOk = false;
        errorMessage = json.message || errorMessage;
      }
    } catch (e) {
      if (!response.ok) {
        isSentOk = false;
      }
    }
    if (isSentOk) {
      console.log(`\u2728 OTP sent successfully to ${cleanPhone}`);
      return res.status(200).json({
        success: true,
        message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0639\u0628\u0631 \u0648\u0627\u062A\u0633\u0627\u0628 \u0628\u0646\u062C\u0627\u062D",
        code: otpCode
      });
    } else {
      console.error(`\u{1F6A8} OTP sending failed: ${errorMessage}`);
      return res.status(200).json({
        success: false,
        whatsappFailed: true,
        code: otpCode,
        error: errorMessage
      });
    }
  } catch (error) {
    const excMsg = error.name === "AbortError" ? "\u0627\u0646\u062A\u0647\u062A \u0645\u0647\u0644\u0629 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u0628\u0640 12 \u062B\u0627\u0646\u064A\u0629 (Network Timeout)" : error.message;
    console.error(`
========= DIAGNOSTIC REPORT (EXCEPTION DURING SEND) =========
${excMsg}
`);
    return res.status(200).json({
      success: false,
      whatsappFailed: true,
      code: otpCode,
      error: excMsg
    });
  }
});
app.post("/api/otp/verify", (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) {
    return res.status(450).json({ success: false, error: "\u0627\u0644\u0631\u0642\u0645 \u0648\u0627\u0644\u0631\u0645\u0632 \u0645\u0637\u0644\u0648\u0628\u0627\u0646 \u0644\u0644\u062A\u062D\u0642\u0642." });
  }
  const cleanPhone = normalizePhone(phone);
  const activeOtp = activeOtps.get(cleanPhone);
  if (!activeOtp) {
    return res.status(400).json({ success: false, error: "\u0644\u0645 \u064A\u062A\u0645 \u0637\u0644\u0628 \u0631\u0645\u0632 \u062A\u062D\u0642\u0642 \u0644\u0647\u0630\u0627 \u0627\u0644\u0631\u0642\u0645 \u0623\u0648 \u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u062A\u0647." });
  }
  if (Date.now() > activeOtp.expiresAt) {
    activeOtps.delete(cleanPhone);
    return res.status(400).json({ success: false, error: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642\u060C \u0623\u0639\u062F \u0627\u0644\u0625\u0631\u0633\u0627\u0644" });
  }
  if (activeOtp.code === code.trim()) {
    activeOtp.status = "used";
    activeOtps.delete(cleanPhone);
    return res.json({ success: true, message: "\u062A\u0645 \u0627\u0644\u062A\u062D\u0642\u0642 \u0628\u0646\u062C\u0627\u062D." });
  } else {
    activeOtp.attempts = (activeOtp.attempts || 0) + 1;
    activeOtps.set(cleanPhone, activeOtp);
    console.log(`\u274C Incorrect OTP entered for ${cleanPhone}. Attempts: ${activeOtp.attempts}`);
    return res.status(400).json({
      success: false,
      error: "\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D",
      attempts: activeOtp.attempts
    });
  }
});
var getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("\u26A0\uFE0F Warning: GEMINI_API_KEY environment variable is not defined. Using local analysis fallback.");
    return null;
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
app.post("/api/ai/analyze", async (req, res) => {
  const { employees, transactions, currentMonth, customCategories } = req.body;
  if (!employees || !transactions) {
    return res.status(400).json({ error: "\u0645\u0637\u0644\u0648\u0628 \u0625\u0631\u0633\u0627\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646 \u0648\u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0644\u0644\u062A\u062D\u0644\u064A\u0644." });
  }
  const ai = getAiClient();
  if (!ai) {
    console.log("Using local calculation rules for fallback analytical response.");
    const activeEmployeesCount = employees.filter((e) => !e.isArchived).length;
    let totalDebit = 0;
    let totalCredit = 0;
    const errors = [];
    const anomalies = [];
    const recurringAlerts = [];
    transactions.forEach((tx) => {
      totalDebit += tx.debit || 0;
      totalCredit += tx.credit || 0;
      if (tx.debit > 2e3 && tx.type === "advance") {
        anomalies.push(`\u0627\u0644\u0645\u0648\u0638\u0641 \u0630\u0648 \u0627\u0644\u0631\u0642\u0645 ${tx.employeeId} \u0642\u0627\u0645 \u0628\u0633\u062D\u0628 \u0633\u0644\u0641\u0629 \u0645\u0631\u062A\u0641\u0639\u0629 \u0628\u0642\u064A\u0645\u0629 ${tx.debit} \u064A\u0645\u0646\u064A/\u062F\u0648\u0644\u0627\u0631 \u0641\u064A ${tx.date} - \u064A\u064F\u0641\u0636\u0644 \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0645\u0644\u0627\u0621\u0629 \u0627\u0644\u0645\u0627\u0644\u064A\u0629.`);
      }
      if (tx.credit === 0 && tx.debit === 0) {
        errors.push(`\u062A\u0646\u0628\u064A\u0647 \u0645\u062D\u0627\u0633\u0628\u064A: \u0627\u0644\u062D\u0631\u0643\u0629 \u0631\u0642\u0645 ${tx.id} \u0628\u064A\u0627\u0646\u0647\u0627 "${tx.statement}" \u062A\u0641\u062A\u0642\u0631 \u0644\u0644\u0642\u064A\u0645 \u0627\u0644\u0645\u0627\u0644\u064A\u0629 \u0627\u0644\u0645\u062F\u064A\u0646 \u0623\u0648 \u0627\u0644\u062F\u0627\u0626\u0646.`);
      }
    });
    const seenTx = /* @__PURE__ */ new Map();
    transactions.forEach((tx) => {
      const key = `${tx.employeeId}_${tx.date}_${tx.type}`;
      if (seenTx.has(key) && tx.type === "thursday_advance") {
        recurringAlerts.push(`\u062A\u0646\u0628\u064A\u0647: \u062D\u0631\u0643\u0629 \u0633\u0644\u0641\u0629 \u062E\u0645\u064A\u0633 \u0645\u0643\u0631\u0631\u0629 \u0641\u064A \u0646\u0641\u0633 \u0627\u0644\u062A\u0627\u0631\u064A\u062E \u0644\u0644\u0645\u0648\u0638\u0641 \u0630\u0648 \u0627\u0644\u0645\u0639\u0631\u0641 ${tx.employeeId}`);
      }
      seenTx.set(key, tx.id);
    });
    const fallbackResult = {
      expenseSummary: `\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0648\u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u064A\u0638\u0647\u0631 \u062A\u062F\u0641\u0642 \u0645\u0627\u0644\u064A \u0645\u0646\u0636\u063A\u0637 \u0628\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0642\u064A\u0645\u062A\u0647\u0627 ${totalDebit} \u062F\u0627\u0626\u0646 \u0645\u0642\u0627\u0628\u0644 \u0627\u0633\u062A\u062D\u0642\u0627\u0642 ${totalCredit} \u0645\u062F\u064A\u0646. \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646 \u0627\u0644\u0646\u0634\u0637\u064A\u0646 \u0647\u0648 ${activeEmployeesCount} \u0645\u0648\u0638\u0641.`,
      discrepancies: errors.length > 0 ? errors : ["\u0644\u0627 \u064A\u0648\u062C\u062F \u0623\u062E\u0637\u0627\u0621 \u0643\u062A\u0627\u0628\u064A\u0629 \u0623\u0648 \u062D\u0633\u0627\u0628\u064A\u0629 \u0648\u0627\u0636\u062D\u0629 \u0641\u064A \u0645\u064A\u0632\u0627\u0646 \u0627\u0644\u0639\u0645\u0644\u064A\u0627\u062A \u0627\u0644\u062D\u0627\u0644\u064A."],
      recursiveDeductions: recurringAlerts.length > 0 ? recurringAlerts : ["\u0634\u0643\u0644 \u0627\u0644\u062E\u0635\u0648\u0645\u0627\u062A \u0648\u0627\u0644\u0633\u0644\u0641 \u0645\u062A\u0632\u0646 \u0648\u064A\u0646\u062F\u0631\u062C \u062A\u062D\u062A \u0633\u0644\u0641 \u0627\u0644\u062E\u0645\u064A\u0633 \u0627\u0644\u0645\u062D\u062F\u062F\u0629 \u0633\u0644\u0641\u0627\u064B."],
      anomalies: anomalies.length > 0 ? anomalies : ["\u0644\u0645 \u062A\u064F\u0643\u062A\u0634\u0641 \u0639\u0645\u0644\u064A\u0627\u062A \u0634\u0627\u0630\u0629 \u0623\u0648 \u0633\u062D\u0648\u0628\u0627\u062A \u0645\u0641\u0627\u062C\u0626\u0629 \u062A\u062A\u062C\u0627\u0648\u0632 \u062D\u062F\u0648\u062F \u0627\u0644\u0623\u0645\u0627\u0646 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A \u0627\u0644\u0645\u0628\u0631\u0645\u062C\u0629."],
      monthlySummaryMarkdown: `### \u{1F4CA} \u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0630\u0643\u064A \u0627\u0644\u062A\u0644\u0642\u0627\u0626\u064A \u0644\u0642\u0633\u0645 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A (\u0646\u0638\u0627\u0645 \u0623\u0645\u064A\u0646 \u0627\u0644\u0634\u064A\u0628\u0627\u0646\u064A \u0627\u0644\u0645\u0633\u0627\u0639\u062F)
- **\u062A\u0642\u062F\u064A\u0631 \u0627\u0644\u0633\u064A\u0648\u0644\u0629**: \u064A\u062A\u0645\u064A\u0632 \u062A\u062F\u0641\u0642 \u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0628\u0627\u0644\u0627\u0633\u062A\u0642\u0631\u0627\u0631\u060C \u0628\u0644\u063A\u062A \u0646\u0633\u0628\u0629 \u0627\u0644\u0627\u0633\u062A\u0631\u062F\u0627\u062F\u0627\u062A \u0644\u0644\u0639\u0647\u062F \u0646\u0633\u0628\u0629 \u0645\u0645\u062A\u0627\u0632\u0629.
- **\u062A\u0648\u0635\u064A\u0627\u062A \u0627\u0644\u0625\u062F\u0627\u0631\u0629**: \u064A\u064F\u0641\u0636\u0651\u0644 \u0648\u0636\u0639 \u0633\u0642\u0641 \u0645\u062D\u062F\u062F \u0644\u0633\u0644\u0641 \u0627\u0644\u062E\u0645\u064A\u0633 \u0644\u0644\u062D\u062F \u0645\u0646 \u0627\u0644\u0633\u062D\u0628 \u0627\u0644\u0639\u0634\u0648\u0627\u0626\u064A \u0627\u0644\u0645\u062A\u0643\u0631\u0631 \u0648\u0636\u0645\u0627\u0646 \u062A\u0631\u062D\u064A\u0644 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0635\u0627\u0641\u064A \u062F\u0648\u0646 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u0631\u0627\u062A\u0628 \u0627\u0644\u0643\u0644\u064A.
- **\u062A\u0646\u0628\u064A\u0647 \u0627\u0644\u0623\u0646\u0634\u0637\u0629**: \u064A\u0631\u062C\u0649 \u062A\u0641\u0639\u064A\u0644 \u062F\u0648\u0631 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0644\u062A\u0623\u0643\u064A\u062F \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u0645\u0644\u0627\u0628\u0633 \u0627\u0644\u0639\u064A\u062F \u0642\u0628\u0644 \u0627\u0644\u062A\u062E\u0635\u064A\u0635 \u0627\u0644\u0646\u0647\u0627\u0626\u064A.`
    };
    return res.json(fallbackResult);
  }
  try {
    const prompt = `
\u0623\u0646\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F \u0627\u0644\u0645\u0627\u0644\u064A \u0648\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A \u0627\u0644\u0630\u0643\u064A \u0644\u0646\u0638\u0627\u0645 "\u0623\u0645\u064A\u0646 \u0627\u0644\u0634\u064A\u0628\u0627\u0646\u064A \u0627\u0644\u0630\u0643\u064A \u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0648\u0627\u0644\u0633\u0644\u0641 \u0648\u0627\u0644\u0633\u062D\u0648\u0628\u0627\u062A".
\u0642\u0645 \u0628\u0645\u0631\u0627\u062C\u0639\u0629 \u0648\u062A\u062D\u0644\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0627\u062F\u0629 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u0644\u0644\u0645\u0624\u0633\u0633\u0629 \u0644\u062A\u0642\u062F\u064A\u0645 \u062A\u062D\u0644\u064A\u0644\u0627\u062A \u0630\u0643\u064A\u0629 \u0648\u0645\u0642\u062A\u0631\u062D\u0627\u062A \u062F\u0642\u064A\u0642\u0629 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629.

\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646:
${JSON.stringify(employees, null, 2)}

\u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0633\u062C\u0644 \u0627\u0644\u0645\u0627\u0644\u064A \u0648\u0627\u0644\u0642\u064A\u0648\u062F:
${JSON.stringify(transactions, null, 2)}

\u0627\u0644\u0648\u0642\u062A \u0627\u0644\u062D\u0627\u0644\u064A \u0644\u0644\u062A\u0642\u0631\u064A\u0631: ${currentMonth || "\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u062D\u0627\u0644\u064A"}
\u0627\u0644\u0641\u0626\u0627\u062A \u0648\u0627\u0644\u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u0645\u062F\u0639\u0648\u0645\u0629: ${JSON.stringify(customCategories || [])}

\u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0627\u0644\u0641\u0635\u062D\u0649 \u0648\u0628\u0634\u0643\u0644 \u0631\u0633\u0645\u064A \u062F\u0642\u064A\u0642\u060C \u0648\u0627\u0644\u062A\u0631\u0643\u064A\u0632 \u0639\u0644\u0649 \u0645\u0643\u0627\u0645\u0646 \u0627\u0644\u062E\u0644\u0644 \u0623\u0648 \u0627\u0644\u0646\u0642\u0627\u0637 \u0627\u0644\u0625\u064A\u062C\u0627\u0628\u064A\u0629.
\u064A\u062C\u0628 \u0623\u0646 \u062A\u0631\u062C\u0639 \u0627\u0644\u0646\u062A\u064A\u062C\u0629 \u0643\u0635\u064A\u063A\u0629 JSON \u062A\u0637\u0627\u0628\u0642 \u0627\u0644\u0628\u0646\u064A\u0629 \u0627\u0644\u0647\u064A\u0643\u0644\u064A\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629 \u062A\u0645\u0627\u0645\u0627\u064B \u0648\u0628\u062F\u0648\u0646 \u0623\u064A \u0646\u0635\u0648\u0635 \u0645\u0642\u062A\u0628\u0633\u0629 \u062E\u0627\u0631\u062C \u0627\u0644\u0642\u0627\u0644\u0628:
{
  "expenseSummary": "\u0645\u0644\u062E\u0635 \u062A\u062D\u0644\u064A\u0644\u064A \u0644\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0648\u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0648\u0627\u0644\u062A\u062F\u0641\u0642 \u0627\u0644\u0646\u0642\u062F\u064A \u0628\u0646\u062B\u0631 \u0645\u0627\u0644\u064A \u0628\u0644\u064A\u063A",
  "discrepancies": ["\u0645\u0635\u0641\u0648\u0641\u0629 \u0645\u0646 \u0627\u0644\u0623\u062E\u0637\u0627\u0621 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0629 \u0623\u0648 \u0627\u0644\u062A\u0646\u0627\u0642\u0636\u0627\u062A \u0627\u0644\u0645\u0643\u062A\u0634\u0641\u0629\u060C \u0645\u062B\u0644 \u0627\u0644\u0645\u0648\u0638\u0641\u064A\u0646 \u0627\u0644\u0630\u064A\u0646 \u062A\u0632\u064A\u062F \u0633\u0644\u0641\u0647\u0645 \u0639\u0646 \u0631\u0648\u0627\u062A\u0628\u0647\u0645 \u0623\u0648 \u062D\u0631\u0643\u0627\u062A \u0628\u0644\u0627 \u0642\u064A\u0645\u0629"],
  "recursiveDeductions": ["\u0645\u0635\u0641\u0648\u0641\u0629 \u0645\u0646 \u0627\u0644\u062E\u0635\u0648\u0645\u0627\u062A \u0623\u0648 \u0627\u0644\u0623\u0642\u0633\u0627\u0637 \u0623\u0648 \u0627\u0644\u0633\u0644\u0641 \u0627\u0644\u0645\u062A\u0643\u0631\u0631\u0629 \u0627\u0644\u0645\u0643\u062A\u0634\u0641\u0629 \u0648\u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A \u0644\u062A\u0623\u0643\u064A\u062F\u0647\u0627 \u0648\u062A\u062B\u0628\u064A\u062A\u0647\u0627"],
  "anomalies": ["\u0639\u0645\u0644\u064A\u0627\u062A \u063A\u064A\u0631 \u0637\u0628\u064A\u0639\u064A\u0629 \u0623\u0648 \u0633\u062D\u0648\u0628\u0627\u062A \u0646\u0642\u062F\u064A\u0629 \u0636\u062E\u0645\u0629 \u0623\u0648 \u062D\u0631\u0643\u0627\u062A \u0641\u064A \u062A\u0648\u0627\u0631\u064A\u062E \u063A\u0631\u064A\u0628\u0629 \u062A\u062B\u064A\u0631 \u0627\u0644\u0627\u0646\u062A\u0628\u0627\u0647"],
  "monthlySummaryMarkdown": "\u0645\u0644\u062E\u0635 \u0645\u0627\u0644\u064A \u0634\u0647\u0631\u064A \u0634\u0627\u0645\u0644 \u0648\u0645\u0645\u064A\u0632 \u0628\u0635\u064A\u063A\u0629 \u062A\u0646\u0633\u064A\u0642 \u062F\u0648\u062A \u0645\u0627\u0631\u0643\u062F\u0627\u0648\u0646 Markdown \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062C\u062F\u0627\u0648\u0644 \u0648\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0648\u062A\u0648\u062C\u064A\u0647\u0627\u062A \u062A\u0646\u0638\u064A\u0645\u064A\u0629 \u0644\u0644\u0645\u062D\u0627\u0633\u0628"
}
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            expenseSummary: {
              type: import_genai.Type.STRING,
              description: "\u0645\u0644\u062E\u0635 \u062A\u062D\u0644\u064A\u0644\u064A \u0644\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0648\u0627\u0644\u0631\u0648\u0627\u062A\u0628 \u0648\u0627\u0644\u062A\u062F\u0641\u0642 \u0627\u0644\u0646\u0642\u062F\u064A \u0628\u0646\u062B\u0631 \u0645\u0627\u0644\u064A \u0628\u0644\u064A\u063A \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629"
            },
            discrepancies: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "\u0645\u0635\u0641\u0648\u0641\u0629 \u0645\u0646 \u0627\u0644\u0623\u062E\u0637\u0627\u0621 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0629 \u0623\u0648 \u0627\u0644\u062A\u0646\u0627\u0642\u0636\u0627\u062A \u0627\u0644\u0645\u0643\u062A\u0634\u0641\u0629 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629"
            },
            recursiveDeductions: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "\u0645\u0635\u0641\u0648\u0641\u0629 \u0645\u0646 \u0627\u0644\u062E\u0635\u0648\u0645\u0627\u062A \u0623\u0648 \u0627\u0644\u0623\u0642\u0633\u0627\u0637 \u0623\u0648 \u0627\u0644\u0633\u0644\u0641 \u0627\u0644\u0645\u062A\u0643\u0631\u0631\u0629 \u0627\u0644\u0645\u0643\u062A\u0634\u0641\u0629 \u0648\u0627\u0642\u062A\u0631\u0627\u062D\u0627\u062A \u0644\u062A\u0623\u0643\u064A\u062F\u0647\u0627 \u0648\u062A\u062B\u0628\u064A\u062A\u0647\u0627 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629"
            },
            anomalies: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "\u0639\u0645\u0644\u064A\u0627\u062A \u063A\u064A\u0631 \u0637\u0628\u064A\u0639\u064A\u0629 \u0623\u0648 \u0633\u062D\u0648\u0628\u0627\u062A \u0646\u0642\u062F\u064A\u0629 \u0636\u062E\u0645\u0629 \u0623\u0648 \u062D\u0631\u0643\u0627\u062A \u0641\u064A \u062A\u0648\u0627\u0631\u064A\u062E \u063A\u0631\u064A\u0628\u0629 \u062A\u062B\u064A\u0631 \u0627\u0644\u0627\u0646\u062A\u0628\u0627\u0647 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629"
            },
            monthlySummaryMarkdown: {
              type: import_genai.Type.STRING,
              description: "\u0645\u0644\u062E\u0635 \u0645\u0627\u0644\u064A \u0634\u0647\u0631\u064A \u0634\u0627\u0645\u0644 \u0648\u0645\u0645\u064A\u0632 \u0628\u0635\u064A\u063A\u0629 \u062A\u0646\u0633\u064A\u0642 \u062F\u0648\u062A \u0645\u0627\u0631\u0643\u062F\u0627\u0648\u0646 Markdown \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u062C\u062F\u0627\u0648\u0644 \u0648\u062A\u0646\u0628\u064A\u0647\u0627\u062A \u0648\u062A\u0648\u062C\u064A\u0647\u0627\u062A \u062A\u0646\u0638\u064A\u0645\u064A\u0629 \u0644\u0644\u0645\u062D\u0627\u0633\u0628 \u0628\u0627\u0644\u0644\u063A\u0629 \u0627\u0644\u0639\u0631\u0628\u064A\u0629"
            }
          },
          required: ["expenseSummary", "discrepancies", "recursiveDeductions", "anomalies", "monthlySummaryMarkdown"]
        }
      }
    });
    const textOutput = response.text || "";
    const cleanJsonString = textOutput.trim();
    const resultObj = JSON.parse(cleanJsonString);
    res.json(resultObj);
  } catch (error) {
    console.error("Error with Gemini API call:", error);
    res.status(500).json({
      error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062A\u062D\u0644\u064A\u0644 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.",
      details: error?.message || String(error)
    });
  }
});
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production" || _filename.endsWith(".cjs") || _filename.endsWith(".js") || !import_fs.default.existsSync(import_path.default.join(process.cwd(), "server.ts"));
  const distPath = import_path.default.join(process.cwd(), "dist");
  const indexExists = import_fs.default.existsSync(import_path.default.join(distPath, "index.html"));
  if (isProduction && indexExists) {
    console.log("\u{1F4E6} Serving production static folder: " + distPath);
    app.use(import_express.default.static(distPath));
    app.get("/diagnostics", async (req, res) => {
      let rootSelfCheck = "Not Checked";
      let apiCheck = "Not Checked";
      let fetchError = "";
      try {
        const rootRes = await fetch(`http://127.0.0.1:${PORT}/`, { headers: { "Connection": "close" } });
        rootSelfCheck = rootRes.ok ? `EXCELLENT (HTTP ${rootRes.status})` : `FAILED (HTTP ${rootRes.status})`;
      } catch (err) {
        rootSelfCheck = `ERROR (UNABLE TO CONNECT)`;
        fetchError = err.message || String(err);
      }
      try {
        const apiRes = await fetch(`http://127.0.0.1:${PORT}/api/whatsapp/config`, { headers: { "Connection": "close" } });
        apiCheck = apiRes.ok ? `EXCELLENT (HTTP ${apiRes.status})` : `FAILED (HTTP ${apiRes.status})`;
      } catch (err) {
        apiCheck = `ERROR (UNABLE TO CONNECT)`;
      }
      const nodeEnv = process.env.NODE_ENV || "Not Defined (Fallback Active)";
      const geminiKeyStatus = process.env.GEMINI_API_KEY ? "CONFIGURED (Active)" : "NOT CONFIGURED (Using local analysis)";
      const executionFile = _filename;
      const cwd = process.cwd();
      const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>\u0627\u0644\u062A\u0634\u062E\u064A\u0635 \u0627\u0644\u0630\u0643\u064A \u0644\u0644\u0646\u0638\u0627\u0645</title>
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
            <div class="logo">\u0623\u0645\u064A\u0646 \u0627\u0644\u0634\u064A\u0628\u0627\u0646\u064A</div>
            <h1>\u062A\u0634\u062E\u064A\u0635 \u0648\u0646\u0634\u0631 \u0627\u0644\u0646\u0638\u0627\u0645 \u0627\u0644\u0630\u0643\u064A</h1>
            <p class="subtitle">\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0641\u062D\u0635 \u0627\u0644\u0622\u0644\u064A \u0627\u0644\u0645\u0633\u062A\u0642\u0644 \u0644\u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u0646\u0634\u0631 \u0648\u062A\u0648\u062C\u064A\u0647 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A</p>
          </div>

          <div class="status-card">
            <div class="status-title">
              <span>\u0627\u062E\u062A\u0628\u0627\u0631 \u0645\u0633\u0627\u0631 \u0627\u0644\u062E\u062F\u0645\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A (/)</span>
              <span class="badge ${rootSelfCheck.includes("EXCELLENT") ? "badge-success" : "badge-danger"}">
                ${rootSelfCheck}
              </span>
            </div>
            <p class="subtitle" style="margin: 0;">\u064A\u062A\u062D\u0642\u0642 \u0647\u0630\u0627 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0645\u0646 \u0642\u062F\u0631\u0629 \u062E\u0627\u062F\u0645 \u0627\u0644\u0648\u064A\u0628 \u0639\u0644\u0649 \u062A\u0633\u0644\u064A\u0645 \u0648\u062A\u062D\u0645\u064A\u0644 \u0627\u0644\u0635\u0641\u062D\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0628\u0646\u062C\u0627\u062D \u062F\u0648\u0646 \u0623\u064A 404.</p>
          </div>

          <div class="status-card">
            <div class="status-title">
              <span>\u0627\u062E\u062A\u0628\u0627\u0631 \u062E\u062F\u0645\u0627\u062A \u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u0640 API \u0648\u0627\u0644\u062A\u062D\u0642\u0642</span>
              <span class="badge ${apiCheck.includes("EXCELLENT") ? "badge-success" : "badge-danger"}">
                ${apiCheck}
              </span>
            </div>
            <p class="subtitle" style="margin: 0;">\u064A\u062A\u062D\u0642\u0642 \u0647\u0630\u0627 \u0627\u0644\u0627\u062E\u062A\u0628\u0627\u0631 \u0645\u0646 \u0631\u0628\u0637 \u0627\u0644\u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u0623\u0645\u0627\u0645\u064A\u0629 \u0628\u0627\u0644\u062E\u0644\u0641\u064A\u0629 \u0648\u062C\u0627\u0647\u0632\u064A\u0629 \u0642\u0648\u0627\u0639\u062F \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062D\u0644\u064A\u0629 \u0648\u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0646\u0638\u0648\u0645\u0629.</p>
          </div>

          <div class="status-card">
            <div class="status-title">
              <span>\u062A\u0648\u0627\u062C\u062F \u0645\u0644\u0641\u0627\u062A \u0627\u0644\u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u0623\u0645\u0627\u0645\u064A\u0629 (Build Assets)</span>
              <span class="badge ${indexExists ? "badge-success" : "badge-danger"}">
                ${indexExists ? "\u0645\u062A\u0648\u0641\u0631 \u0648\u062C\u0627\u0647\u0632 (INDEX.HTML)" : "\u063A\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 (\u064A\u0631\u062C\u0649 \u0628\u0646\u0627\u0621 \u0627\u0644\u062A\u0637\u0628\u064A\u0642)"}
              </span>
            </div>
            <p class="subtitle" style="margin: 0;">\u0645\u0633\u0627\u0631 \u0627\u0644\u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u062D\u0642\u064A\u0642\u064A: ${distPath}/index.html</p>
          </div>

          <div class="grid">
            <div class="metric">
              <div class="metric-label">\u0628\u064A\u0626\u0629 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u0639\u0642\u062F\u064A\u0629</div>
              <div class="metric-value">${nodeEnv}</div>
            </div>
            <div class="metric">
              <div class="metric-label">\u062D\u0627\u0644\u0629 \u0630\u0643\u0627\u0621 \u0627\u0644\u0645\u0646\u0633\u0642 (Gemini API)</div>
              <div class="metric-value">${geminiKeyStatus}</div>
            </div>
            <div class="metric">
              <div class="metric-label">\u0645\u0644\u0641 \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0627\u0644\u062D\u0627\u0644\u064A</div>
              <div class="metric-value">${executionFile}</div>
            </div>
            <div class="metric">
              <div class="metric-label">\u0645\u0633\u0627\u0631 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u062D\u0627\u0644\u064A (CWD)</div>
              <div class="metric-value">${cwd}</div>
            </div>
          </div>

          ${fetchError ? `<div style="margin-top: 1rem; color: #fca5a5; font-size: 0.75rem; background: rgba(220, 38, 38, 0.1); padding: 0.75rem; border-radius: 0.5rem; border: 1px dashed rgba(220, 38, 38, 0.3);">\u0641\u0634\u0644 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0627\u0644\u062E\u0627\u0631\u062C\u064A: ${fetchError}</div>` : ""}

          <a href="/" class="btn">\u0627\u0644\u0627\u0646\u062A\u0642\u0627\u0644 \u0644\u0644\u0648\u0627\u062C\u0647\u0629 \u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629 \u0644\u0646\u0638\u0627\u0645 \u0623\u0645\u064A\u0646 \u0627\u0644\u0634\u064A\u0628\u0627\u0646\u064A</a>
        </div>
      </body>
      </html>
      `;
      res.send(html);
    });
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  } else {
    console.log("\u{1F6E0}\uFE0F Registering Vite Dev Server middleware for dynamic HMR...");
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} Fully compliant full-stack server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
