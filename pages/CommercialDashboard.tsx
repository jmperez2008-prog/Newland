import React, { useState } from 'react';
import { User } from '../types';
import { PlusCircle, Calendar as CalendarIcon, History, Folder } from 'lucide-react';
import { NewReport } from './commercial/NewReport';
import { Booking } from './commercial/Booking';
import { HistoryView } from './commercial/HistoryView';
import { CommercialDocuments } from './commercial/CommercialDocuments';

interface CommercialDashboardProps {
  currentUser: User;
}

type Tab = 'new' | 'booking' | 'history' | 'documents';

export const CommercialDashboard: React.FC<CommercialDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<Tab>('new');

  const tabs = [
    { id: 'new', label: 'Nuevo Reporte', icon: PlusCircle },
    { id: 'booking', label: 'Reservar Visita', icon: CalendarIcon },
    { id: 'history', label: 'Mis Reportes', icon: History },
    { id: 'documents', label: 'Documentos', icon: Folder },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Panel Comercial</h2>
      </div>

       {/* Tabs */}
       <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
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

      <div className="mt-6">
        {activeTab === 'new' && <NewReport currentUser={currentUser} onSuccess={() => setActiveTab('history')} />}
        {activeTab === 'booking' && <Booking currentUser={currentUser} />}
        {activeTab === 'history' && <HistoryView currentUser={currentUser} />}
        {activeTab === 'documents' && <CommercialDocuments />}
      </div>
    </div>
  );
};