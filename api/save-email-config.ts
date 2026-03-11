import type { VercelRequest, VercelResponse } from '@vercel/node';
import { encrypt } from '../utils/crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { userId, config } = req.body;
    if (!userId || !config) {
      return res.status(400).json({ error: "Missing userId or config" });
    }
    const encryptedPass = encrypt(config.smtp_pass);
    
    res.json({ 
      user_id: userId,
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      smtp_user: config.smtp_user,
      smtp_pass: encryptedPass,
      smtp_secure: config.smtp_secure
    });
  } catch (error) {
    console.error("Error in save-email-config:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
