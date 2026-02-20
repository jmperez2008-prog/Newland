import React, { useState } from 'react';
import { User } from '../types';
import { PlusCircle, Calendar as CalendarIcon, History, Folder, MessageCircle } from 'lucide-react';
import { NewReport } from './commercial/NewReport';
import { Booking } from './commercial/Booking';
import { HistoryView } from './commercial/HistoryView';
import { CommercialDocuments } from './commercial/CommercialDocuments';
import { ChatView } from './chat/ChatView';

interface CommercialDashboardProps {
  currentUser: User;
}

type Tab = 'new' | 'booking' | 'history' | 'documents' | 'chat';

export const CommercialDashboard: React.FC<CommercialDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<Tab>('new');

  const tabs = [
    { id: 'new', label: 'Nuevo Reporte', icon: PlusCircle },
    { id: 'booking', label: 'Reservar Visita', icon: CalendarIcon },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'history', label: 'Mis Reportes', icon: History },
    { id: 'documents', label: 'Documentos', icon: Folder },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Panel Comercial</h2>
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
                  onClick={() => setActiveTab(tab.id as Tab)}
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
          {activeTab === 'new' && <NewReport currentUser={currentUser} onSuccess={() => setActiveTab('history')} />}
          {activeTab === 'booking' && <Booking currentUser={currentUser} />}
          {activeTab === 'history' && <HistoryView currentUser={currentUser} />}
          {activeTab === 'documents' && <CommercialDocuments />}
          {activeTab === 'chat' && <ChatView currentUser={currentUser} />}
        </div>
      </div>
    </div>
  );
};