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
        if (!msg || !msg.message || msg.key.fromMe) return;

        console.log('[WhatsApp Bot DEBUG] ---------------------------------------------');
        console.log('[WhatsApp Bot DEBUG] 📩 Incoming Message Event Detected!');
        console.log('[WhatsApp Bot DEBUG] Key:', JSON.stringify(msg.key));
        console.log('[WhatsApp Bot DEBUG] PushName:', msg.pushName);

        // Extract text message content
        const text = (
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          ''
        ).trim();

        console.log(`[WhatsApp Bot DEBUG] Text Content: "${text}"`);
        if (!text) return;

        // Find candidate JID with phone number (@s.whatsapp.net)
        let phoneJid = null;
        if (msg.key.remoteJid?.endsWith('@s.whatsapp.net')) {
          phoneJid = msg.key.remoteJid;
        } else if (msg.key.participant?.endsWith('@s.whatsapp.net')) {
          phoneJid = msg.key.participant;
        } else {
          console.log(`[WhatsApp Bot DEBUG] Note: Sender JID is ${msg.key.remoteJid} (LID or non-standard format).`);
        }

        // Extract 4-digit numeric code from message
        const match = text.match(/\b\d{4}\b/);
        if (!match) {
          console.log('[WhatsApp Bot DEBUG] ⚠️ No 4-digit code found in message.');
          return;
        }

        const extractedCode = match[0];
        console.log(`[WhatsApp Bot DEBUG] 🔍 Extracted OTP Code: ${extractedCode}`);

        // ═════════════════════════════════════════════════════════════════
        // STRICT SENDER MATCHING & PHONE MISMATCH DETECTION
        // ═════════════════════════════════════════════════════════════════
        const targetUser = await prisma.user.findFirst({
          where: { otpCode: extractedCode }
        });

        if (!targetUser) {
          console.log(`[WhatsApp Bot DEBUG] ⚠️ Code ${extractedCode} not found in DB or already verified.`);
          return;
        }

        const senderPhone = phoneJid ? '+' + phoneJid.split('@')[0] : `LID (${msg.key.remoteJid})`;

        if (phoneJid) {
          const cleanSender = phoneJid.split('@')[0].replace(/\D/g, '');
          const cleanTarget = targetUser.phoneNumber.replace(/\D/g, '');
          const isMatch = (cleanSender === cleanTarget || cleanSender.endsWith(cleanTarget) || cleanTarget.endsWith(cleanSender));

          if (!isMatch) {
            console.log(`[WhatsApp Bot DEBUG] 🚫 PHONE MISMATCH! Sender: ${senderPhone}, Registered: ${targetUser.phoneNumber}`);
            
            const errorMsg = `رقم الواتساب الذي أرسلت منه (${senderPhone}) لا يطابق الرقم الذي أدخلته في التطبيق (${targetUser.phoneNumber}).`;
            setVerificationError(targetUser.phoneNumber, errorMsg);

            try {
              const replyJid = msg.key.remoteJid;
              await sock.sendMessage(replyJid, {
                text: `⚠️ تنبيه من السوق المنزلي:\n\nرقم الواتساب الحالي (${senderPhone}) لا يطابق الرقم الذي أدخلته في التطبيق (${targetUser.phoneNumber}).\nيرجى التوثيق من الواتساب الخاص بالرقم المسجل.`
              });
            } catch (e) {
              console.error('[WhatsApp Bot DEBUG] Error sending mismatch reply:', e);
            }
            return;
          }
        } else {
          console.log(`[WhatsApp Bot DEBUG] Sender is using LID (${msg.key.remoteJid}), matching directly via code ${extractedCode} for registered user ${targetUser.phoneNumber}`);
        }

        if (targetUser.otpExpiresAt && targetUser.otpExpiresAt < new Date()) {
          console.log(`[WhatsApp Bot DEBUG] ⚠️ Expired code for ${targetUser.phoneNumber}`);
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
        console.log(`[WhatsApp Bot DEBUG] 🎉 SUCCESS! User ${targetUser.phoneNumber} verified via WhatsApp (Sender: ${senderPhone})!`);

        // Send confirmation reply back to user on WhatsApp
        try {
          const replyJid = msg.key.remoteJid;
          await sock.sendMessage(replyJid, {
            text: `✅ تم توثيق حسابك في السوق المنزلي بنجاح! يمكنك الآن العودة إلى التطبيق.`
          });
        } catch (e) {
          console.error('[WhatsApp Bot DEBUG] Error sending confirmation message:', e);
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
