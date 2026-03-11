import { Claim, ClaimAttachment, ClaimMessage } from '../types';
import { supabase } from './supabase';

export const EmailService = {
  sendClaimNotification: async (claim: Claim, message: string, type: 'message' | 'file') => {
    // 1. Get all interested users (commercial + admin)
    const { data: users, error } = await supabase
      .from('app_users')
      .select('*')
      .in('id', [claim.commercialId, claim.adminId]);
      
    if (error || !users) return;

    // 2. Get email configs for these users
    const { data: configs } = await supabase
      .from('user_email_configs')
      .select('*')
      .in('user_id', [claim.commercialId, claim.adminId]);

    if (!configs) return;

    // 3. Send email to each user
    for (const user of users) {
      const config = configs.find(c => c.user_id === user.id);
      if (!config || !user.email) continue;

      const subject = type === 'message' ? `Nueva respuesta en reclamación: ${claim.companyName}` : `Nuevo archivo en reclamación: ${claim.companyName}`;
      const html = `
        <h1>Reclamación: ${claim.companyName}</h1>
        <p>Se ha añadido un nuevo ${type === 'message' ? 'mensaje' : 'archivo'}.</p>
        <h2>Cronología:</h2>
        <ul>
          ${claim.messages.map(m => `<li><strong>${m.userName}:</strong> ${m.content}</li>`).join('')}
        </ul>
      `;

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject,
          html,
          smtpConfig: {
            host: config.smtp_host,
            port: config.smtp_port,
            user: config.smtp_user,
            pass: config.smtp_pass,
            secure: config.smtp_secure
          }
        })
      });
    }
  }
};
