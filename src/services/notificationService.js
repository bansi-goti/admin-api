const WebsiteSetting = require('../models/WebsiteSetting');

/**
 * Send Real SMTP Email using dynamic Admin Settings from Database
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!to || !to.includes('@')) return false;

  try {
    let smtpHost = process.env.SMTP_HOST || '';
    let smtpPort = process.env.SMTP_PORT || 587;
    let smtpUser = process.env.SMTP_USER || '';
    let smtpPass = process.env.SMTP_PASS || '';
    let smtpFromName = process.env.SMTP_FROM_NAME || 'Nayzora Jewellery';

    try {
      const settings = await WebsiteSetting.findOne();
      if (settings) {
        if (settings.smtpHost) smtpHost = settings.smtpHost;
        if (settings.smtpPort) smtpPort = settings.smtpPort;
        if (settings.smtpUser) smtpUser = settings.smtpUser;
        if (settings.smtpPass) smtpPass = settings.smtpPass;
        if (settings.smtpFromName) smtpFromName = settings.smtpFromName;
      }
    } catch (dbErr) {
      console.warn('Could not read WebsiteSetting for SMTP:', dbErr.message);
    }

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('[SMTP WARNING] Cannot send email because SMTP credentials are missing in Admin Settings!');
      return false;
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort) || 587,
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      requireTLS: Number(smtpPort) === 587 || smtpHost.includes('brevo') || smtpHost.includes('mailrcld'),
      tls: {
        rejectUnauthorized: false,
      },
    });

    let senderEmail = smtpUser;
    if (senderEmail.includes('@smtp-brevo.com')) {
      senderEmail = 'bansigoti2001@gmail.com';
    }

    await transporter.sendMail({
      from: `"${smtpFromName}" <${senderEmail}>`,
      to,
      subject,
      text: text || subject,
      html: html || `<p>${text || subject}</p>`,
    });

        return true;
  } catch (error) {
    console.error('❌ [EMAIL DISPATCH ERROR]:', error.message);
    return false;
  }
};

/**
 * Send Real WhatsApp Message using dynamic Admin Settings from Database
 */
const sendWhatsApp = async ({ phone, message }) => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) return false;

  const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

  try {
    let waApiUrl = process.env.WHATSAPP_API_URL || '';
    let waToken = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_API_KEY || '';
    let waInstanceId = process.env.WHATSAPP_INSTANCE_ID || '';
    let waSender = process.env.WHATSAPP_SENDER_NUMBER || '';

    try {
      const settings = await WebsiteSetting.findOne();
      if (settings) {
        if (settings.whatsappApiUrl) waApiUrl = settings.whatsappApiUrl;
        if (settings.whatsappApiKey) waToken = settings.whatsappApiKey;
        if (settings.whatsappInstanceId) waInstanceId = settings.whatsappInstanceId;
        if (settings.whatsappSenderNumber) waSender = settings.whatsappSenderNumber;
      }
    } catch (dbErr) {
      console.warn('Could not read WebsiteSetting for WhatsApp:', dbErr.message);
    }

    let apiSentSuccess = false;

    if (waApiUrl || (waInstanceId && waToken)) {
      const axios = require('axios');
      let targetUrl = waApiUrl;

      if (!targetUrl && waInstanceId && waToken) {
        targetUrl = `https://api.ultramsg.com/${waInstanceId}/messages/chat`;
      }

      if (targetUrl) {
                if (targetUrl.includes('ultramsg')) {
          await axios.post(targetUrl, new URLSearchParams({
            token: waToken,
            to: '+' + formattedPhone,
            body: message,
          }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          });
        } else {
          await axios.post(
            targetUrl,
            {
              messaging_product: 'whatsapp',
              to: formattedPhone,
              type: 'text',
              text: { body: message },
              token: waToken,
              instanceId: waInstanceId,
              sender: waSender,
            },
            {
              headers: {
                Authorization: `Bearer ${waToken}`,
                'Content-Type': 'application/json',
              },
            }
          );
        }
        apiSentSuccess = true;
      }
    } else {
          }

    return true;
  } catch (error) {
    console.error('❌ [WHATSAPP DISPATCH ERROR]:', error.response?.data || error.message);
    return false;
  }
};

/**
 * Send Automated Order Notification (Email & WhatsApp based on customer availability)
 * If customer has BOTH Email & Mobile -> Sends to BOTH!
 * If customer has ONLY Mobile -> Sends to WhatsApp.
 * If customer has ONLY Email -> Sends to Email.
 */
const sendOrderNotification = async ({ order, eventType }) => {
  if (!order) return;

  try {
    const customer = order.customer || {};
    const shipping = order.shippingAddress || {};

    const name = customer.name || shipping.name || 'Valued Customer';
    const email = (customer.email || shipping.email || '').trim();
    const rawPhone = (customer.phone || customer.mobile || shipping.phone || '').trim();
    const cleanPhone = rawPhone.replace(/\D/g, '');

    const hasEmail = Boolean(email && email.includes('@') && !email.includes('guest@nayzora.com'));
    const hasPhone = Boolean(cleanPhone && cleanPhone.length >= 10);

    const orderId = order.orderId || order._id;
    const totalAmount = order.totalAmount || order.amount || 0;
    const status = order.status || 'Processing';

            
    // Build Email HTML Template
    let emailSubject = '';
    let emailHtml = '';

    if (eventType === 'PLACED') {
      emailSubject = `Order Confirmed! Your Nayzora Order #${orderId}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #6d28d9; margin-top: 0;">✨ Nayzora Jewellery — Order Confirmation</h2>
          <p style="font-size: 15px; color: #334155;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">Thank you for shopping with us! Your order <strong>#${orderId}</strong> has been successfully placed and is currently being processed.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Order ID:</strong> #${orderId}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">${status}</span></p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Total Amount:</strong> ₹${totalAmount}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Payment Method:</strong> ${order.paymentMethod || 'Online'}</p>
          </div>

          <p style="font-size: 13px; color: #64748b;">We will notify you as soon as your items are packed and shipped.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">Thank you for choosing Nayzora Luxury Jewellery!</p>
        </div>
      `;
    } else {
      emailSubject = `Order Status Update: #${orderId} is now ${status}`;
      emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #6d28d9; margin-top: 0;">📦 Nayzora Order Status Update</h2>
          <p style="font-size: 15px; color: #334155;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">The status of your order <strong>#${orderId}</strong> has been updated to:</p>
          
          <div style="background: #f3e8ff; border: 1px solid #d8b4fe; padding: 18px; border-radius: 10px; margin: 16px 0; text-align: center;">
            <h3 style="color: #6d28d9; margin: 0; font-size: 20px; text-transform: uppercase;">${status}</h3>
          </div>

          <p style="font-size: 14px; color: #475569;"><strong>Order ID:</strong> #${orderId}<br/><strong>Total Amount:</strong> ₹${totalAmount}</p>
          <p style="font-size: 13px; color: #64748b;">Thank you for shopping with Nayzora!</p>
        </div>
      `;
    }

    // Build WhatsApp Message Text
    let whatsappMessage = '';
    if (eventType === 'PLACED') {
      whatsappMessage = `✨ *Nayzora Order Confirmation*\n\nHi *${name}*,\nYour order *${orderId}* for *₹${totalAmount}* has been placed successfully!\n\nStatus: *${status}*\nPayment Method: ${order.paymentMethod || 'Online'}\n\nThank you for choosing Nayzora Luxury Jewellery!`;
    } else {
      whatsappMessage = `📦 *Nayzora Order Update*\n\nHi *${name}*,\nYour order *${orderId}* status has been updated to: *${status}*!\n\nTotal Amount: ₹${totalAmount}\nThank you for shopping with Nayzora.`;
    }

    // DISPATCH LOGIC:
    // Both -> Send BOTH Email and WhatsApp
    // Email only -> Send Email
    // Phone only -> Send WhatsApp
    if (hasEmail) {
      sendEmail({ to: email, subject: emailSubject, html: emailHtml }).catch(e => console.warn(e));
    }

    if (hasPhone) {
      sendWhatsApp({ phone: cleanPhone, message: whatsappMessage }).catch(e => console.warn(e));
    }

  } catch (error) {
    console.error('Error in sendOrderNotification:', error.message);
  }
};

module.exports = {
  sendEmail,
  sendWhatsApp,
  sendOrderNotification,
};
