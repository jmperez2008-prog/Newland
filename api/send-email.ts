import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { decrypt } from '../utils/crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { to, subject, html, smtpConfig } = req.body;
    
    if (!smtpConfig || !smtpConfig.pass) {
      return res.status(400).json({ error: "Missing SMTP configuration" });
    }

    // Decrypt password
    const decryptedPass = decrypt(smtpConfig.pass);
    
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: decryptedPass,
      },
    });

    await transporter.sendMail({
      from: smtpConfig.user,
      to,
      subject,
      html,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, error: "Failed to send email" });
  }
}
