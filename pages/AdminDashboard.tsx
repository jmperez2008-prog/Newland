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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
            {currentUser.role === UserRole.SUPERADMIN ? 'Panel Super Admin' : `Panel Admin ${currentUser.zone}`}
        </h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${activeTab === tab.id
                    ? 'border-[#FF7900] text-[#FF7900]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'users' && <AdminUsers currentUser={currentUser} />}
        {activeTab === 'forms' && <AdminForms />}
        {activeTab === 'reports' && <AdminReports currentUser={currentUser} />}
        {activeTab === 'calendar' && <AdminCalendar currentUser={currentUser} />}
        {activeTab === 'documents' && <AdminDocuments />}
        {activeTab === 'chat' && <ChatView currentUser={currentUser} />}
      </div>
    </div>
  );
};