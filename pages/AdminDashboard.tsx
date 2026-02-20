import React, { useState } from 'react';
import { Users, FileText, Settings, Calendar, Folder, MessageCircle } from 'lucide-react';
import { User, UserRole } from '../types';
import { AdminUsers } from './admin/AdminUsers';
import { AdminForms } from './admin/AdminForms';
import { AdminReports } from './admin/AdminReports';
import { AdminCalendar } from './admin/AdminCalendar';
import { AdminDocuments } from './admin/AdminDocuments';
import { ChatView } from './chat/ChatView';

type AdminTab = 'users' | 'forms' | 'reports' | 'calendar' | 'documents' | 'chat';

interface AdminDashboardProps {
  currentUser: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');

  const tabs = [
    { id: 'reports', label: 'Reportes', icon: FileText },
    { id: 'calendar', label: 'Agenda & Visitas', icon: Calendar },
    { id: 'chat', label: 'Chat Interno', icon: MessageCircle },
    { id: 'documents', label: 'Carpeta', icon: Folder },
    { id: 'users', label: 'Usuarios', icon: Users },
  ];

  // Only Superadmin can configure the global report structure
  if (currentUser.role === UserRole.SUPERADMIN) {
    tabs.push({ id: 'forms', label: 'Config. Formularios', icon: Settings });
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
            {currentUser.role === UserRole.SUPERADMIN ? 'Panel Super Admin' : `Panel Admin ${currentUser.zone}`}
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-full items-start">
        {/* Left Vertical Navigation */}
        <aside className="w-full md:w-64 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
          <nav className="flex flex-col p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors
                    ${isActive
                      ? 'bg-orange-50 text-[#FF7900]'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-[#FF7900]' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 w-full min-w-0">
          {activeTab === 'users' && <AdminUsers currentUser={currentUser} />}
          {activeTab === 'forms' && <AdminForms />}
          {activeTab === 'reports' && <AdminReports currentUser={currentUser} />}
          {activeTab === 'calendar' && <AdminCalendar currentUser={currentUser} />}
          {activeTab === 'documents' && <AdminDocuments />}
          {activeTab === 'chat' && <ChatView currentUser={currentUser} />}
        </div>
      </div>
    </div>
  );
};