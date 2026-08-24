/**
 * Evolution API Service
 * 
 * Sends OTP messages via WhatsApp using the Evolution API.
 * Evolution API is a self-hosted WhatsApp gateway that provides REST endpoints
 * for sending messages via WhatsApp Web (Baileys).
 * 
 * Required Environment Variables:
 *   EVOLUTION_API_URL      - Base URL of the Evolution API instance (e.g. https://evo.example.com)
 *   EVOLUTION_API_KEY      - Global API key for authentication
 *   EVOLUTION_INSTANCE     - Instance name configured in Evolution API
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'home-business';

/**
 * Normalizes phone number for WhatsApp delivery.
 * Strips leading '+' and ensures it's a clean numeric string.
 * E.g., '+967772546343' → '967772546343'
 */
const normalizeForWhatsApp = (phone) => {
  return phone.replace(/[^\d]/g, '');
};

/**
 * Sends OTP code via WhatsApp using Evolution API.
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +967772546343)
 * @param {string} otpCode - The OTP code to send
 * @returns {Promise<{success: boolean, message: string}>}
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
    // Fallback: still log OTP to console so dev/testing isn't blocked
    console.log(`\n=============================================`);
    console.log(`[EVOLUTION OTP FALLBACK] Code: ${otpCode} for Phone: ${phoneNumber}`);
    console.log(`=============================================\n`);
    return { success: false, message: `Evolution API error: ${error.message}` };
  }
};

/**
 * Checks the connection status of the Evolution API instance.
 * @returns {Promise<{connected: boolean, instance: string}>}
 */
const getInstanceStatus = async () => {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { connected: false, instance: EVOLUTION_INSTANCE, reason: 'Not configured' };
  }

  try {
    const url = `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`;
    const response = await fetch(url, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    const data = await response.json();
    
    return {
      connected: data?.instance?.state === 'open',
      instance: EVOLUTION_INSTANCE,
      state: data?.instance?.state || 'unknown'
    };
  } catch (error) {
    return { connected: false, instance: EVOLUTION_INSTANCE, reason: error.message };
  }
};

module.exports = {
  sendOTP,
  getInstanceStatus,
  normalizeForWhatsApp
};
