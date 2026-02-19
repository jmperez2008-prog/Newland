import React, { useState } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storageService';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { RefreshCw } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setError('');

    try {
        const users = await StorageService.getUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            onLogin(user);
        } else {
            setError('Usuario o contraseña incorrectos');
        }
    } catch (err) {
        setError('Error de conexión con la base de datos.');
    } finally {
        setLoggingIn(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reiniciar sesión local?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
             <div className="flex flex-col items-center">
                 <div className="h-12 w-12 bg-[#FF7900] rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2">N</div>
                 <div className="text-center leading-none">
                    <span className="block text-3xl font-black text-[#FF7900] tracking-tight">Newland</span>
                    <span className="block text-sm font-bold text-gray-900 tracking-[0.3em] uppercase mt-1">Telecom</span>
                 </div>
             </div>
        </div>
        <h2 className="mt-6 text-center text-xl font-bold text-gray-900">
          Acceso al Portal
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-[#FF7900]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input 
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
            
            <Input 
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              required
            />

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div>
              <Button type="submit" className="w-full" isLoading={loggingIn}>
                Entrar
              </Button>
            </div>
          </form>
          
          <div className="mt-6">
             <div className="relative">
                <div className="absolute inset-0 flex items-center">
                   <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                   <span className="px-2 bg-white text-gray-500">Nota Importante</span>
                </div>
             </div>
             <div className="mt-2 text-xs text-center text-gray-500">
                Asegúrate de configurar la tabla <code>app_users</code> en Supabase con un usuario inicial.
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};