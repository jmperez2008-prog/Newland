import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { StorageService } from './services/storageService';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { CommercialDashboard } from './pages/CommercialDashboard';
import { LogOut, Globe } from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Current User session is still local for speed
    const user = StorageService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    StorageService.setCurrentUser(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
  };

  const getRoleLabel = (user: User) => {
    if (user.role === UserRole.SUPERADMIN) return 'Super Admin (Global)';
    if (user.role === UserRole.ADMIN) return `Admin: ${user.zone || 'Sin Zona'}`;
    return `Comercial: ${user.zone || 'Sin Zona'}`;
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="bg-white w-full md:w-64 border-r border-gray-200 flex flex-col h-auto md:h-screen sticky top-0">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col leading-none mb-4">
             <div className="flex items-center gap-2">
                 <div className="h-8 w-8 bg-[#FF7900] rounded-full flex items-center justify-center text-white font-bold text-lg">N</div>
                 <div>
                    <span className="block text-xl font-black text-[#FF7900] tracking-tight">Newland</span>
                    <span className="block text-sm font-bold text-gray-900 tracking-[0.2em] uppercase">Telecom</span>
                 </div>
             </div>
          </div>
          
          <p className="text-sm font-medium text-gray-900 mt-2 truncate">
            {currentUser.name}
          </p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${currentUser.role === UserRole.SUPERADMIN ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}`}>
            {currentUser.role === UserRole.SUPERADMIN && <Globe className="h-3 w-3 mr-1"/>}
            {getRoleLabel(currentUser)}
          </span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Menú Principal
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8">
        {currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERADMIN ? (
          <AdminDashboard currentUser={currentUser} />
        ) : (
          <CommercialDashboard currentUser={currentUser} />
        )}
      </main>
    </div>
  );
};

export default App;