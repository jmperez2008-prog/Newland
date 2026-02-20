import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { StorageService } from './services/storageService';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { CommercialDashboard } from './pages/CommercialDashboard';
import { 
  LogOut, Globe, Users, FileText, Settings, Calendar, Folder, 
  MessageCircle, PlusCircle, History 
} from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    // Current User session is still local for speed
    const user = StorageService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setDefaultTab(user);
    }
    setLoading(false);
  }, []);

  const setDefaultTab = (user: User) => {
      if (user.role === UserRole.COMMERCIAL) {
          setActiveTab('new');
      } else {
          setActiveTab('reports');
      }
  };

  const handleLogin = (user: User) => {
    StorageService.setCurrentUser(user);
    setCurrentUser(user);
    setDefaultTab(user);
  };

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
    setActiveTab('');
  };

  const getRoleLabel = (user: User) => {
    if (user.role === UserRole.SUPERADMIN) return 'Super Admin (Global)';
    if (user.role === UserRole.ADMIN) return `Admin: ${user.zone || 'Sin Zona'}`;
    return `Comercial: ${user.zone || 'Sin Zona'}`;
  };

  const getMenuItems = (user: User) => {
      if (user.role === UserRole.COMMERCIAL) {
          return [
            { id: 'new', label: 'Nuevo Reporte', icon: PlusCircle },
            { id: 'booking', label: 'Reservar Visita', icon: Calendar },
            { id: 'chat', label: 'Chat', icon: MessageCircle },
            { id: 'history', label: 'Mis Reportes', icon: History },
            { id: 'documents', label: 'Documentos', icon: Folder },
          ];
      }
      
      // Admin & Superadmin
      const items = [
        { id: 'reports', label: 'Reportes', icon: FileText },
        { id: 'calendar', label: 'Agenda & Visitas', icon: Calendar },
        { id: 'chat', label: 'Chat Interno', icon: MessageCircle },
        { id: 'documents', label: 'Carpeta', icon: Folder },
        { id: 'users', label: 'Usuarios', icon: Users },
      ];

      if (user.role === UserRole.SUPERADMIN) {
        items.push({ id: 'forms', label: 'Config. Formularios', icon: Settings });
      }

      return items;
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const menuItems = getMenuItems(currentUser);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <aside className="bg-white w-full md:w-64 border-r border-gray-200 flex flex-col h-auto md:h-screen sticky top-0 flex-shrink-0 z-10">
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
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive 
                    ? 'bg-orange-50 text-[#FF7900]' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-[#FF7900]' : 'text-gray-400'}`} />
                {item.label}
              </button>
            );
          })}
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

      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 bg-gray-50">
        {currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.SUPERADMIN ? (
          <AdminDashboard currentUser={currentUser} activeTab={activeTab} />
        ) : (
          <CommercialDashboard currentUser={currentUser} activeTab={activeTab} onSuccess={() => setActiveTab('history')} />
        )}
      </main>
    </div>
  );
};

export default App;