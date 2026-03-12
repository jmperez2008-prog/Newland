import React from 'react';
import { User } from '../types';
import { NewReport } from './commercial/NewReport';
import { Booking } from './commercial/Booking';
import { HistoryView } from './commercial/HistoryView';
import { CommercialDocuments } from './commercial/CommercialDocuments';
import { ChatView } from './chat/ChatView';
import { RequestsView } from './requests/RequestsView';
import { CommercialGoals } from './commercial/CommercialGoals';
import { ClaimsView } from './ClaimsView';

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
          {activeTab === 'requests' && <RequestsView currentUser={currentUser} />}
          {activeTab === 'goals' && <CommercialGoals currentUser={currentUser} />}
          {activeTab === 'claims' && <ClaimsView currentUser={currentUser} />}
          {activeTab === 'mailpulse' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <iframe 
                src={`https://mailplus-gull.vercel.app/?replyTo=${encodeURIComponent(currentUser.email || '')}&email=${encodeURIComponent(currentUser.email || '')}&name=${encodeURIComponent(currentUser.name)}`}
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