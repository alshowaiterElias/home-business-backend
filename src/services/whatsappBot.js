const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const prisma = require('../config/db');

const QRCode = require('qrcode');

let sock = null;
let currentQRDataURL = null;
let isConnected = false;

// Memory store for real-time verification errors (e.g. phone number mismatch)
const verificationErrorsMap = new Map();

const setVerificationError = (phone, errorMsg) => {
  const clean = phone.replace(/\D/g, '');
  verificationErrorsMap.set(clean, errorMsg);
};

const getVerificationError = (phone) => {
  const clean = phone.replace(/\D/g, '');
  return verificationErrorsMap.get(clean) || null;
};

const clearVerificationError = (phone) => {
  const clean = phone.replace(/\D/g, '');
  verificationErrorsMap.delete(clean);
};

/**
 * Returns current QR code as DataURL (base64 PNG) or null if connected.
 */
const getQRDataURL = async () => {
  return currentQRDataURL;
};

/**
 * Returns whether WhatsApp bot is connected.
 */
const getBotStatus = () => {
  return { isConnected, hasQR: !!currentQRDataURL };
};

/**
 * Initializes the lightweight WhatsApp listener (Baileys socket).
 * Point 4: Pure Node.js WebSockets, consumes ~5-10MB RAM (no Puppeteer/Chrome).
 */
const initWhatsAppBot = async () => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // We render custom QR
      browser: ['Yemen Marketplace', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        try {
          currentQRDataURL = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
        } catch (e) {
          console.error('[WhatsApp Bot] Error generating QR DataURL:', e);
        }

        console.log('\n======================================================');
        console.log('[WhatsApp Bot] 🌐 QR Code ready!');
        console.log('[WhatsApp Bot] Open this URL in browser to scan: https://home-business-backend.onrender.com/qr');
        console.log('======================================================\n');
      }

      if (connection === 'close') {
        isConnected = false;
        const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
        console.log('[WhatsApp Bot] Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
        if (shouldReconnect) {
          setTimeout(initWhatsAppBot, 5000);
        }
      } else if (connection === 'open') {
        isConnected = true;
        currentQRDataURL = null;
        console.log('[WhatsApp Bot] ✅ Connected successfully to WhatsApp!');
      }
    });

    // Listen for incoming messages
    sock.ev.on('messages.upsert', async (m) => {
      try {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const jid = msg.key.remoteJid; // e.g. 967713729839@s.whatsapp.net
        if (!jid.endsWith('@s.whatsapp.net')) return;

        // Extract sender phone number
        const rawJidNumber = jid.split('@')[0]; // e.g. "967772546343"
        const formattedPhonePlus = '+' + rawJidNumber;
        const formattedPhoneNoPlus = rawJidNumber;

        // Extract text message content
        const text = (
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          ''
        ).trim();

        if (!text) return;

        console.log(`[WhatsApp Bot] 📩 Incoming message from ${formattedPhonePlus}: "${text}"`);

        // Extract 4-digit numeric code from message
        const match = text.match(/\b\d{4}\b/);
        if (!match) return;

        const extractedCode = match[0];

        // ═════════════════════════════════════════════════════════════════
        // STRICT SENDER MATCHING & PHONE MISMATCH DETECTION
        // ═════════════════════════════════════════════════════════════════
        // First: Find the target user in DB who requested this code
        const targetUser = await prisma.user.findFirst({
          where: { otpCode: extractedCode }
        });

        if (!targetUser) {
          console.log(`[WhatsApp Bot] ⚠️ Ignored code ${extractedCode} from ${formattedPhonePlus}: Code not found or expired.`);
          return;
        }

        // Check if sender phone matches target user's registered phone
        const cleanSender = formattedPhonePlus.replace(/\D/g, '');
        const cleanTarget = targetUser.phoneNumber.replace(/\D/g, '');
        const isMatch = (cleanSender === cleanTarget || cleanSender.endsWith(cleanTarget) || cleanTarget.endsWith(cleanSender));

        if (!isMatch) {
          console.log(`[WhatsApp Bot] 🚫 PHONE MISMATCH DETECTED! Sender: ${formattedPhonePlus}, Registered: ${targetUser.phoneNumber}`);
          
          const errorMsg = `رقم الواتساب الذي أرسلت منه (${formattedPhonePlus}) لا يطابق الرقم الذي أدخلته في التطبيق (${targetUser.phoneNumber}).`;
          setVerificationError(targetUser.phoneNumber, errorMsg);

          try {
            await sock.sendMessage(jid, {
              text: `⚠️ تنبيه من السوق المنزلي:\n\nرقم الواتساب الحالي (${formattedPhonePlus}) لا يطابق الرقم الذي أدخلته في التطبيق (${targetUser.phoneNumber}).\nيرجى التوثيق من الواتساب الخاص بالرقم المسجل.`
            });
          } catch (e) {
            console.error('[WhatsApp Bot] Error sending mismatch reply:', e);
          }
          return;
        }

        if (targetUser.otpExpiresAt && targetUser.otpExpiresAt < new Date()) {
          console.log(`[WhatsApp Bot] ⚠️ Expired code for ${targetUser.phoneNumber}`);
          setVerificationError(targetUser.phoneNumber, 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.');
          return;
        }

        // Successfully verified! Update DB
        await prisma.user.update({
          where: { id: targetUser.id },
          data: {
            isVerified: true,
            otpCode: null,
            otpExpiresAt: null
          }
        });

        clearVerificationError(targetUser.phoneNumber);
        console.log(`[WhatsApp Bot] 🎉 User ${targetUser.phoneNumber} verified successfully via WhatsApp!`);

        // Send confirmation reply back to user on WhatsApp
        try {
          await sock.sendMessage(jid, {
            text: '✅ تم تأكيد حسابك بنجاح في تطبيق السوق المنزلي! يمكنك العودة للتطبيق الآن.'
          });
        } catch (sendErr) {
          console.error('[WhatsApp Bot] Could not send confirmation reply:', sendErr.message);
        }

      } catch (err) {
        console.error('[WhatsApp Bot] Error processing message:', err);
      }
    });

  } catch (err) {
    console.error('[WhatsApp Bot] Failed to initialize:', err);
  }
};

module.exports = { 
  initWhatsAppBot, 
  getQRDataURL, 
  getBotStatus, 
  getVerificationError, 
  setVerificationError, 
  clearVerificationError 
};
