import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

const getTransporter = () => {
  if (!transporter && env.SMTP_HOST && env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const mailer = getTransporter();

  if (!mailer) {
    console.warn('Email not configured, skipping send');
    return { success: false, message: 'Email not configured' };
  }

  try {
    const info = await mailer.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });

    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

export const sendOrderConfirmation = async (order, user) => {
  const itemsList = order.items
    .map(
      item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.subtotal.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin: 0;">Order Confirmation</h1>
        <p style="color: #7f8c8d; margin: 5px 0 0 0;">Order #${order.orderNumber}</p>
      </div>
      
      <p>Hi ${user.name},</p>
      <p>Thank you for your order! We've received your order and will process it shortly.</p>
      
      <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Order Details</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsList}
        </tbody>
      </table>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="padding: 5px;">Subtotal:</td>
            <td style="padding: 5px; text-align: right;">₹${order.subtotal.toFixed(2)}</td>
          </tr>
          ${
            order.discount > 0
              ? `
          <tr>
            <td style="padding: 5px;">Discount:</td>
            <td style="padding: 5px; text-align: right; color: #27ae60;">-₹${order.discount.toFixed(2)}</td>
          </tr>
          `
              : ''
          }
          <tr>
            <td style="padding: 5px;">Tax:</td>
            <td style="padding: 5px; text-align: right;">₹${order.tax.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 5px;">Shipping:</td>
            <td style="padding: 5px; text-align: right;">₹${order.shipping.toFixed(2)}</td>
          </tr>
          <tr style="font-weight: bold; font-size: 1.1em; border-top: 2px solid #dee2e6;">
            <td style="padding: 10px 5px 5px 5px;">Total:</td>
            <td style="padding: 10px 5px 5px 5px; text-align: right;">₹${order.total.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <h3 style="color: #2c3e50; margin-top: 30px;">Shipping Address</h3>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
        <p style="margin: 5px 0;"><strong>${order.shippingAddress.fullName}</strong></p>
        <p style="margin: 5px 0;">${order.shippingAddress.addressLine1}</p>
        ${order.shippingAddress.addressLine2 ? `<p style="margin: 5px 0;">${order.shippingAddress.addressLine2}</p>` : ''}
        <p style="margin: 5px 0;">${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}</p>
        <p style="margin: 5px 0;">${order.shippingAddress.country}</p>
        <p style="margin: 5px 0;">Phone: ${order.shippingAddress.phone}</p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #7f8c8d;">
        <p>If you have any questions, please contact us at ${env.STORE_EMAIL}</p>
        <p style="margin: 5px 0;">&copy; ${new Date().getFullYear()} ${env.STORE_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html,
  });
};

export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin: 0;">Password Reset Request</h1>
      </div>
      
      <p>Hi ${user.name},</p>
      <p>You requested to reset your password. Click the button below to reset it:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="background: #f8f9fa; padding: 10px; border-radius: 5px; word-break: break-all;">${resetUrl}</p>
      
      <p><strong>This link will expire in 1 hour.</strong></p>
      
      <p>If you didn't request this, please ignore this email.</p>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center; color: #7f8c8d;">
        <p>&copy; ${new Date().getFullYear()} ${env.STORE_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Password Reset Request',
    html,
  });
};
