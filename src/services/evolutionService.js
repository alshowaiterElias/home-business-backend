/**
 * Evolution API Service
 * 
 * Manages WhatsApp integration via Evolution API (Baileys REST gateway).
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'home-business';

/**
 * Normalizes phone number for WhatsApp delivery.
 * Strips leading '+' and non-numeric characters.
 */
const normalizeForWhatsApp = (phone) => {
  return phone.replace(/[^\d]/g, '');
};

/**
 * Sends OTP code via WhatsApp using Evolution API.
 */
const sendOTP = async (phoneNumber, otpCode) => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    console.warn('⚠️ Evolution API not configured. OTP will only be logged to console.');
    console.log(`\n=============================================`);
    console.log(`[EVOLUTION OTP FALLBACK] Code: ${otpCode} for Phone: ${phoneNumber}`);
    console.log(`=============================================\n`);
    return { success: true, message: 'OTP logged to console (Evolution API not configured)' };
  }

  const waNumber = normalizeForWhatsApp(phoneNumber);
  const messageText = `🏠 *السوق المنزلي* — رمز التحقق\n\nرمز التحقق الخاص بك هو: *${otpCode}*\n\nصالح لمدة 15 دقيقة. لا تشاركه مع أحد.`;

  try {
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;

    const response = await fetch(url, {
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

    const data = await response.json();

    if (response.ok) {
      console.log(`[Evolution API] ✅ OTP sent successfully to ${phoneNumber}`);
      return { success: true, message: 'OTP sent via WhatsApp' };
    } else {
      console.error(`[Evolution API] ❌ Failed to send OTP:`, data);
      return { success: false, message: data?.message || 'Failed to send OTP via WhatsApp' };
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
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('EVOLUTION_API_URL or EVOLUTION_API_KEY is not configured in backend environment.');
  }

  const waNumber = normalizeForWhatsApp(phoneNumber);
  const messageText = customText || `🏠 *السوق المنزلي*\n\nرسالة تجريبية لاختبار ربط الواتساب بنجاح! ✅`;

  const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`;

  const response = await fetch(url, {
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

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to send WhatsApp test message');
  }

  return data;
};

/**
 * Checks instance connection status.
 */
const getInstanceStatus = async () => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return {
      configured: false,
      connected: false,
      instance: EVOLUTION_INSTANCE,
      state: 'not_configured',
      apiUrl: EVOLUTION_API_URL || null
    };
  }

  try {
    const url = `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`;
    const response = await fetch(url, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });

    const data = await response.json();

    return {
      configured: true,
      connected: data?.instance?.state === 'open',
      instance: EVOLUTION_INSTANCE,
      state: data?.instance?.state || 'close',
      apiUrl: EVOLUTION_API_URL,
      data: data?.instance || {}
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      instance: EVOLUTION_INSTANCE,
      state: 'error',
      apiUrl: EVOLUTION_API_URL,
      error: error.message
    };
  }
};

/**
 * Fetches QR Code (base64 image) for scanning.
 */
const getQRCode = async () => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API is not configured.');
  }

  const url = `${EVOLUTION_API_URL}/instance/connect/${EVOLUTION_INSTANCE}`;
  const response = await fetch(url, {
    headers: { 'apikey': EVOLUTION_API_KEY }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Failed to fetch QR Code');
  }

  return {
    base64: data?.base64 || null,
    code: data?.code || null,
    pairingCode: data?.pairingCode || null,
    count: data?.count || 0
  };
};

/**
 * Fetches 8-character Pairing Code for a given phone number.
 */
const getPairingCode = async (phoneNumber) => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API is not configured.');
  }

  const cleanPhone = normalizeForWhatsApp(phoneNumber);
  const url = `${EVOLUTION_API_URL}/instance/connect/${EVOLUTION_INSTANCE}?number=${cleanPhone}`;
  const response = await fetch(url, {
    headers: { 'apikey': EVOLUTION_API_KEY }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Failed to fetch Pairing Code');
  }

  return {
    pairingCode: data?.pairingCode || null,
    code: data?.code || null
  };
};

/**
 * Creates a new instance.
 */
const createInstance = async (qrcode = true) => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API is not configured.');
  }

  const url = `${EVOLUTION_API_URL}/instance/create`;
  const response = await fetch(url, {
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

  const data = await response.json();
  if (!response.ok && response.status !== 403) {
    throw new Error(data?.message || 'Failed to create instance');
  }

  return data;
};

/**
 * Deletes / disconnects an existing instance.
 */
const deleteInstance = async () => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    throw new Error('Evolution API is not configured.');
  }

  const url = `${EVOLUTION_API_URL}/instance/delete/${EVOLUTION_INSTANCE}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'apikey': EVOLUTION_API_KEY }
  });

  const data = await response.json();
  return data;
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
