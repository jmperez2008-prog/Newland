import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { Button } from './Button';
import { Input } from './Input';

interface EmailConfigProps {
  currentUser: User;
}

export const EmailConfig: React.FC<EmailConfigProps> = ({ currentUser }) => {
  const [config, setConfig] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data, error } = await supabase
      .from('user_email_configs')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    if (data) {
      setConfig({
        smtp_host: data.smtp_host,
        smtp_port: data.smtp_port,
        smtp_user: data.smtp_user,
        smtp_pass: '********', // Don't show the real password
        smtp_secure: data.smtp_secure
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    // Encrypt via backend
    const response = await fetch('/api/save-email-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, config })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', errorText);
      alert('Error al guardar: ' + errorText);
      setSaving(false);
      return;
    }

    const encryptedConfig = await response.json();

    const { error } = await supabase
      .from('user_email_configs')
      .upsert(encryptedConfig);

    if (error) {
      console.error('Error saving config:', error);
      alert('Error al guardar la configuración en la base de datos.');
    } else {
      alert('Configuración guardada correctamente.');
      loadConfig();
    }
    setSaving(false);
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
      <h2 className="text-lg font-bold">Configuración de Correo SMTP</h2>
      <Input label="Servidor SMTP" value={config.smtp_host} onChange={(e) => setConfig({...config, smtp_host: e.target.value})} />
      <Input label="Puerto" type="number" value={config.smtp_port} onChange={(e) => setConfig({...config, smtp_port: parseInt(e.target.value)})} />
      <Input label="Usuario" value={config.smtp_user} onChange={(e) => setConfig({...config, smtp_user: e.target.value})} />
      <Input label="Contraseña" type="password" value={config.smtp_pass} onChange={(e) => setConfig({...config, smtp_pass: e.target.value})} />
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={config.smtp_secure} onChange={(e) => setConfig({...config, smtp_secure: e.target.checked})} />
        Usar conexión segura (SSL/TLS)
      </label>
      <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Configuración'}</Button>
    </div>
  );
};
