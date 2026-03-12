import { Claim, ClaimAttachment, ClaimMessage, UserRole } from '../types';
import { supabase } from './supabase';

export const EmailService = {
  sendClaimNotification: async (claim: Claim, message: string, type: 'message' | 'file') => {
    // 1. Get all interested users (commercial + admin + superadmin)
    const { data: users, error } = await supabase
      .from('app_users')
      .select('*');
      
    if (error || !users) return;

    const recipients = users.filter(u => 
      u.id === claim.commercialId || 
      (u.role === UserRole.ADMIN && u.zone === claim.zone) || 
      u.role === UserRole.SUPERADMIN
    );

    const recipientIds = recipients.map(u => u.id);

    // 2. Get email configs for these users
    const { data: configs } = await supabase
      .from('user_email_configs')
      .select('*')
      .in('user_id', recipientIds);

    if (!configs || configs.length === 0) {
      console.warn('No email configurations found for any recipients.');
      return;
    }

    // 3. Send email to each user
    for (const user of recipients) {
      const config = configs.find(c => c.user_id === user.id);
      if (!config) {
        console.log(`Skipping email to ${user.email} (no SMTP config found)`);
        continue;
      }
      if (!user.email) {
        console.log(`Skipping email to user ${user.id} (no email address)`);
        continue;
      }

      const subject = type === 'message' ? `Actualización en reclamación: ${claim.companyName}` : `Nuevo archivo en reclamación: ${claim.companyName}`;
      const html = `
        <h1>Reclamación: ${claim.companyName}</h1>
        <p><strong>Actualización:</strong> ${message}</p>
        <h2>Cronología de mensajes:</h2>
        <ul>
          ${claim.messages.map(m => `<li><strong>${m.userName} (${new Date(m.timestamp).toLocaleString('es-ES')}):</strong> ${m.content}</li>`).join('')}
        </ul>
      `;

      try {
        const response = await fetch('/api/send-email', {
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
        
        if (!response.ok) {
          console.error(`Failed to send email to ${user.email}:`, await response.text());
        } else {
          console.log(`Email sent successfully to ${user.email}`);
        }
      } catch (err) {
        console.error(`Error sending email to ${user.email}:`, err);
      }
    }
  }
};
