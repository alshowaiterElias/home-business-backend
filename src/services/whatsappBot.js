const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const prisma = require('../config/db');

let sock = null;

/**
 * Initializes the lightweight WhatsApp listener (Baileys socket).
 * Point 4: Pure Node.js WebSockets, consumes ~5-10MB RAM (no Puppeteer/Chrome).
 */
const initWhatsAppBot = async () => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // We log custom QR
      browser: ['Yemen Marketplace', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        console.log('\n======================================================');
        console.log('[WhatsApp Bot] Scan this QR code with your Business WhatsApp:');
        qrcode.generate(qr, { small: true });
        console.log('======================================================\n');
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
        console.log('[WhatsApp Bot] Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
        if (shouldReconnect) {
          setTimeout(initWhatsAppBot, 5000);
        }
      } else if (connection === 'open') {
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
        // POINT 5: STRICT CONSISTENCY CHECK
        // Flexible query matching either +967... or 967... or 07...
        // ═════════════════════════════════════════════════════════════════
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { phoneNumber: formattedPhonePlus },
              { phoneNumber: formattedPhoneNoPlus },
              { phoneNumber: formattedPhonePlus.replace('+967', '0') },
              { phoneNumber: formattedPhonePlus.replace('+967', '') },
            ]
          }
        });

        if (!user) {
          console.log(`[WhatsApp Bot] ⚠️ Ignored code ${extractedCode} from ${formattedPhonePlus}: User not found in DB`);
          return;
        }

        if (!user.otpCode || user.otpCode !== extractedCode) {
          console.log(`[WhatsApp Bot] ⚠️ Code mismatch for ${user.phoneNumber}: Received "${extractedCode}", DB expected "${user.otpCode}"`);
          return;
        }

        if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
          console.log(`[WhatsApp Bot] ⚠️ Expired code for ${user.phoneNumber}`);
          return;
        }

        // Successfully verified! Update DB
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isVerified: true,
            otpCode: null,
            otpExpiresAt: null
          }
        });

        console.log(`[WhatsApp Bot] 🎉 User ${user.phoneNumber} verified successfully via WhatsApp!`);

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

module.exports = { initWhatsAppBot };
