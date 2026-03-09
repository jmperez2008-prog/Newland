import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, UserRole } from '../types';

interface NotificationContextType {
  notifications: string[];
  addNotification: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode, currentUser: User | null }> = ({ children, currentUser }) => {
  const [notifications, setNotifications] = useState<string[]>([]);

  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message]);
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 5000);
  };

  useEffect(() => {
    if (!currentUser) return;

    // Listen for new chat messages
    const chatChannel = supabase
      .channel('chat_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        // Need to check if the user is in the channel
        // For now, simple notification for any new message
        if (payload.new.user_id !== currentUser.id) {
          addNotification(`Nuevo mensaje en el chat: ${payload.new.content.substring(0, 20)}...`);
        }
      })
      .subscribe();

    // Listen for new claims
    const claimsChannel = supabase
      .channel('claims')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'claims' }, (payload) => {
        // Check if the claim is directed to the user
        if (payload.new.commercial_id === currentUser.id || 
            (currentUser.role !== UserRole.COMMERCIAL && payload.new.zone === currentUser.zone)) {
          addNotification(`Nueva reclamación recibida: ${payload.new.company_name}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(claimsChannel);
    };
  }, [currentUser]);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification }}>
      {children}
      {notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {notifications.map((n, i) => (
            <div key={i} className="bg-[#FF7900] text-white p-4 rounded-lg shadow-lg">
              {n}
            </div>
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
