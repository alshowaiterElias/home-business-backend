/**
 * Evolution API Service
 * 
 * Manages WhatsApp integration via Evolution API (Baileys REST gateway).
 */

const getCleanBaseUrl = () => {
  let url = (process.env.EVOLUTION_API_URL || '').trim();
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, '');
};

const EVOLUTION_API_KEY = (process.env.EVOLUTION_API_KEY || '').trim();
const EVOLUTION_INSTANCE = (process.env.EVOLUTION_INSTANCE || 'home-business').trim();

/**
 * Normalizes phone number for WhatsApp delivery.
 * Strips leading '+' and non-numeric characters.
 */
const normalizeForWhatsApp = (phone) => {
  return phone.replace(/[^\d]/g, '');
};

/**
 * Helper function to safely execute fetch and parse JSON or handle HTML error pages gracefully.
 * Includes automatic retry for Render free tier cold-starts (429 / 502 / 503 errors).
 */
const safeFetchJson = async (url, options = {}, retries = 1) => {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return { ok: response.ok, status: response.status, data };
    }

    // Handle HTML error pages (e.g. 429 Too Many Requests, 502 Bad Gateway) from Render edge
    if ((response.status === 429 || response.status === 502 || response.status === 503) && retries > 0) {
      console.warn(`[Evolution API] Received status ${response.status} from Render. Retrying in 2.5 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      return safeFetchJson(url, options, retries - 1);
    }

    const text = await response.text();
    console.error(`[Evolution API] Non-JSON HTML response (${response.status}) from ${url}:`, text.substring(0, 300));
    
    let userMsg = `خادم Evolution API يعود بالرمز ${response.status}.`;
    if (response.status === 429) {
      userMsg = 'تم تجاوز عدد الطلبات المسموح بها مؤقتاً (429 Too Many Requests) على خادم Render المجاني. يرجى الانتظار 30 ثانية والإعادة.';
    } else if (response.status === 502 || response.status === 503) {
      userMsg = 'خادم Evolution API قيد التشغيل/الاستيقاظ على Render (502/503). يرجى المحاولة بعد قليل.';
    }

    return {
      ok: false,
      status: response.status,
      data: { message: userMsg }
    };
  } catch (error) {
    if (retries > 0) {
      console.warn(`[Evolution API] Request failed (${error.message}). Retrying in 2.5 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      return safeFetchJson(url, options, retries - 1);
    }
    throw error;
  }
};

/**
 * Sends OTP code via WhatsApp using Evolution API.
 */
const sendOTP = async (phoneNumber, otpCode) => {
  const baseUrl = getCleanBaseUrl();
  if (!baseUrl || !EVOLUTION_API_KEY) {
    console.warn('⚠️ Evolution API not configured. OTP will only be logged to console.');
    console.log(`\n=============================================`);
    console.log(`[EVOLUTION OTP FALLBACK] Code: ${otpCode} for Phone: ${phoneNumber}`);
    console.log(`=============================================\n`);
    return { success: true, message: 'OTP logged to console (Evolution API not configured)' };
  }

  const waNumber = normalizeForWhatsApp(phoneNumber);
  const messageText = `🏠 *السوق المنزلي* — رمز التحقق\n\nرمز التحقق الخاص بك هو: *${otpCode}*\n\nصالح لمدة 15 دقيقة. لا تشاركه مع أحد.`;

  try {
    const url = `${baseUrl}/message/sendText/${EVOLUTION_INSTANCE}`;
    const result = await safeFetchJson(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: waNumber,
        text: messageText
      })
    });

    if (result.ok) {
      console.log(`[Evolution API] ✅ OTP sent successfully to ${phoneNumber}`);
      return { success: true, message: 'OTP sent via WhatsApp' };
    } else {
      console.error(`[Evolution API] ❌ Failed to send OTP:`, result.data);
      return { success: false, message: result.data?.message || 'Failed to send OTP via WhatsApp' };
    }
  } catch (error) {
    console.error(`[Evolution API] ❌ Request error:`, error.message);
    console.log(`\n=============================================`);
    console.log(`[EVOLUTION OTP FALLBACK] Code: ${otpCode} for Phone: ${phoneNumber}`);
    console.log(`=============================================\n`);
    return { success: false, message: `Evolution API error: ${error.message}` };
  }
};

/**
 * Sends a custom test message via WhatsApp.
 */
const sendTestMessage = async (phoneNumber, customText) => {
  const baseUrl = getCleanBaseUrl();
  if (!baseUrl || !EVOLUTION_API_KEY) {
    throw new Error('EVOLUTION_API_URL or EVOLUTION_API_KEY is not configured in backend environment.');
  }

  const waNumber = normalizeForWhatsApp(phoneNumber);
  const messageText = customText || `🏠 *السوق المنزلي*\n\nرسالة تجريبية لاختبار ربط الواتساب بنجاح! ✅`;

  const url = `${baseUrl}/message/sendText/${EVOLUTION_INSTANCE}`;
  const result = await safeFetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      number: waNumber,
      text: messageText
    })
  });

  if (!result.ok) {
    throw new Error(result.data?.message || 'Failed to send WhatsApp test message');
  }

  return result.data;
};

/**
 * Checks instance connection status.
 */
const getInstanceStatus = async () => {
  const baseUrl = getCleanBaseUrl();
  if (!baseUrl || !EVOLUTION_API_KEY) {
    return {
      configured: false,
      connected: false,
      instance: EVOLUTION_INSTANCE,
      state: 'not_configured',
      apiUrl: baseUrl || null
    };
  }

  try {
    const url = `${baseUrl}/instance/connectionState/${EVOLUTION_INSTANCE}`;
    const result = await safeFetchJson(url, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });

    return {
      configured: true,
      connected: result.data?.instance?.state === 'open',
      instance: EVOLUTION_INSTANCE,
      state: result.data?.instance?.state || 'close',
      apiUrl: baseUrl,
      data: result.data?.instance || {}
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      instance: EVOLUTION_INSTANCE,
      state: 'error',
      apiUrl: baseUrl,
      error: error.message
    };
  }
};

/**
 * Fetches QR Code (base64 image) for scanning.
 */
const getQRCode = async () => {
  const baseUrl = getCleanBaseUrl();
  if (!baseUrl || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API is not configured.');
  }

  const url = `${baseUrl}/instance/connect/${EVOLUTION_INSTANCE}`;
  const result = await safeFetchJson(url, {
    headers: { 'apikey': EVOLUTION_API_KEY }
  });

  if (!result.ok) {
    throw new Error(result.data?.message || 'Failed to fetch QR Code');
  }

  return {
    base64: result.data?.base64 || null,
    code: result.data?.code || null,
    pairingCode: result.data?.pairingCode || null,
    count: result.data?.count || 0
  };
};

/**
 * Fetches 8-character Pairing Code for a given phone number.
 */
const getPairingCode = async (phoneNumber) => {
  const baseUrl = getCleanBaseUrl();
  if (!baseUrl || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API is not configured.');
  }

  const cleanPhone = normalizeForWhatsApp(phoneNumber);
  const url = `${baseUrl}/instance/connect/${EVOLUTION_INSTANCE}?number=${cleanPhone}`;
  const result = await safeFetchJson(url, {
    headers: { 'apikey': EVOLUTION_API_KEY }
  });

  if (!result.ok) {
    throw new Error(result.data?.message || 'Failed to fetch Pairing Code');
  }

  return {
    pairingCode: result.data?.pairingCode || null,
    code: result.data?.code || null
  };
};

/**
 * Creates a new instance.
 */
const createInstance = async (qrcode = true) => {
  const baseUrl = getCleanBaseUrl();
  if (!baseUrl || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API is not configured.');
  }

  const url = `${baseUrl}/instance/create`;
  const result = await safeFetchJson(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      instanceName: EVOLUTION_INSTANCE,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: Boolean(qrcode)
    })
  });

  if (!result.ok && result.status !== 403) {
    throw new Error(result.data?.message || 'Failed to create instance');
  }

  return result.data;
};

/**
 * Deletes / disconnects an existing instance.
 */
const deleteInstance = async () => {
  const baseUrl = getCleanBaseUrl();
  if (!baseUrl || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API is not configured.');
  }

  const url = `${baseUrl}/instance/delete/${EVOLUTION_INSTANCE}`;
  const result = await safeFetchJson(url, {
    method: 'DELETE',
    headers: { 'apikey': EVOLUTION_API_KEY }
  });

  return result.data;
};

module.exports = {
  sendOTP,
  sendTestMessage,
  getInstanceStatus,
  getQRCode,
  getPairingCode,
  createInstance,
  deleteInstance,
  normalizeForWhatsApp
};
