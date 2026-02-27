import React from 'react';
import { User } from '../types';
import { NewReport } from './commercial/NewReport';
import { Booking } from './commercial/Booking';
import { HistoryView } from './commercial/HistoryView';
import { CommercialDocuments } from './commercial/CommercialDocuments';
import { ChatView } from './chat/ChatView';

interface CommercialDashboardProps {
  currentUser: User;
  activeTab: string;
  onSuccess?: () => void;
}

export const CommercialDashboard: React.FC<CommercialDashboardProps> = ({ currentUser, activeTab, onSuccess }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Panel Comercial</h2>
      </div>

      <div className="flex-1 w-full min-w-0">
          {activeTab === 'new' && <NewReport currentUser={currentUser} onSuccess={onSuccess || (() => {})} />}
          {activeTab === 'booking' && <Booking currentUser={currentUser} />}
          {activeTab === 'history' && <HistoryView currentUser={currentUser} />}
          {activeTab === 'documents' && <CommercialDocuments />}
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