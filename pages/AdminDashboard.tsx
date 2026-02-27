import React from 'react';
import { User, UserRole } from '../types';
import { AdminUsers } from './admin/AdminUsers';
import { AdminForms } from './admin/AdminForms';
import { AdminReports } from './admin/AdminReports';
import { AdminCalendar } from './admin/AdminCalendar';
import { AdminDocuments } from './admin/AdminDocuments';
import { ChatView } from './chat/ChatView';

interface AdminDashboardProps {
  currentUser: User;
  activeTab: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, activeTab }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
            {currentUser.role === UserRole.SUPERADMIN ? 'Panel Super Admin' : `Panel Admin ${currentUser.zone}`}
        </h2>
      </div>

      <div className="flex-1 w-full min-w-0">
          {activeTab === 'users' && <AdminUsers currentUser={currentUser} />}
          {activeTab === 'forms' && <AdminForms />}
          {activeTab === 'reports' && <AdminReports currentUser={currentUser} />}
          {activeTab === 'calendar' && <AdminCalendar currentUser={currentUser} />}
          {activeTab === 'documents' && <AdminDocuments />}
          {activeTab === 'chat' && <ChatView currentUser={currentUser} />}
          {activeTab === 'mailpulse' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <iframe 
                src="https://ais-pre-vjih3hnnzgiztae4bizdvz-23091955519.europe-west1.run.app" 
                width="100%" 
                height="800px" 
                style={{ border: 'none' }}
                title="MailPulse App"
              />
            </div>
          )}
      </div>
    </div>
  );
};