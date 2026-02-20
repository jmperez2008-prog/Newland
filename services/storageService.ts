import { User, Question, Report, Appointment, UserRole, QuestionType, SharedDocument, ChatChannel, ChatMessage, ChatType } from '../types';
import { supabase } from './supabase';

// Helper to map DB columns (snake_case) to Types (camelCase) if needed, 
// though we tried to keep them consistent in the types, SQL uses snake_case often.
// For this demo, we assume the DB columns match the JSON structure or we map manually.

export const StorageService = {
  // Users
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('app_users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    return data as User[];
  },
  
  saveUser: async (user: User) => {
    const { error } = await supabase.from('app_users').upsert(user);
    if (error) console.error('Error saving user:', error);
  },
  
  deleteUser: async (id: string) => {
    const { error } = await supabase.from('app_users').delete().eq('id', id);
    if (error) console.error('Error deleting user:', error);
  },

  // Questions
  getQuestions: async (): Promise<Question[]> => {
    const { data, error } = await supabase.from('questions').select('*');
    if (error) {
      console.error('Error fetching questions:', error);
      return [];
    }
    return data as Question[];
  },
  
  saveQuestions: async (questions: Question[]) => {
    // Strategy: Delete all and re-insert to maintain order and structure easily
    // In a prod app, you'd upsert individually.
    const { error: delError } = await supabase.from('questions').delete().neq('id', '0');
    if (!delError) {
        const { error } = await supabase.from('questions').insert(questions);
        if (error) console.error('Error saving questions:', error);
    }
  },

  // Reports
  getReports: async (): Promise<Report[]> => {
    const { data, error } = await supabase.from('reports').select('*');
    if (error) {
      console.error('Error fetching reports:', error);
      return [];
    }
    // Map snake_case from DB if necessary, but assuming direct mapping for now
    return data.map((r: any) => ({
        ...r,
        userName: r.user_name,
        userId: r.user_id,
        // timestamp comes as string/number from DB, ensure number
        timestamp: Number(r.timestamp)
    })) as Report[];
  },
  
  addReport: async (report: Report) => {
    const dbReport = {
        id: report.id,
        user_id: report.userId,
        user_name: report.userName,
        timestamp: report.timestamp,
        answers: report.answers,
        ai_summary: report.aiSummary
    };
    const { error } = await supabase.from('reports').insert(dbReport);
    if (error) console.error('Error adding report:', error);
  },

  updateReport: async (report: Report) => {
      const dbReport = {
          user_id: report.userId,
          user_name: report.userName,
          timestamp: report.timestamp,
          answers: report.answers,
          ai_summary: report.aiSummary
      };
      // We only update the fields, ID is used to match
      const { error } = await supabase.from('reports').update(dbReport).eq('id', report.id);
      if (error) console.error('Error updating report:', error);
  },

  // Appointments
  getAppointments: async (): Promise<Appointment[]> => {
    const { data, error } = await supabase.from('appointments').select('*');
    if (error) return [];
    return data.map((a: any) => ({
        ...a,
        userId: a.user_id,
        userName: a.user_name,
        timeSlot: a.time_slot
    })) as Appointment[];
  },
  
  addAppointment: async (apt: Appointment) => {
    const dbApt = {
        id: apt.id,
        user_id: apt.userId,
        user_name: apt.userName,
        date: apt.date,
        time_slot: apt.timeSlot,
        notes: apt.notes
    };
    const { error } = await supabase.from('appointments').insert(dbApt);
    if (error) console.error('Error adding appointment:', error);
  },
  
  deleteAppointment: async (id: string) => {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) console.error('Error deleting appointment:', error);
  },

  // Documents
  getDocuments: async (): Promise<SharedDocument[]> => {
    const { data, error } = await supabase.from('documents').select('*');
    if (error) return [];
    return data.map((d: any) => ({
        ...d,
        uploadedAt: Number(d.uploaded_at)
    })) as SharedDocument[];
  },
  
  addDocument: async (doc: SharedDocument) => {
    const dbDoc = {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: doc.size,
        uploaded_at: doc.uploadedAt,
        data: doc.data
    };
    const { error } = await supabase.from('documents').insert(dbDoc);
    if (error) {
        console.error('Error uploading doc:', error);
        throw new Error(error.message);
    }
  },
  
  deleteDocument: async (id: string) => {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) console.error('Error deleting doc:', error);
  },

  // --- CHAT SYSTEM ---

  getChannels: async (user: User): Promise<ChatChannel[]> => {
      const { data, error } = await supabase.from('chat_channels').select('*');
      if (error) return [];

      const allChannels = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          zone: c.zone,
          participantIds: c.participant_ids || [],
          createdBy: c.created_by,
          createdAt: Number(c.created_at)
      })) as ChatChannel[];

      // Filter Logic
      return allChannels.filter(ch => {
          if (ch.type === 'global') return true; // Everyone sees global
          if (ch.type === 'zone') {
              // Visible if user is SuperAdmin (all zones) OR if user matches the zone
              if (user.role === UserRole.SUPERADMIN) return true;
              return ch.zone === user.zone;
          }
          if (ch.type === 'direct') {
              // Visible only if user is in participant list
              return ch.participantIds.includes(user.id);
          }
          return false;
      });
  },

  createChannel: async (channel: ChatChannel) => {
      const dbChannel = {
          id: channel.id,
          name: channel.name,
          type: channel.type,
          zone: channel.zone,
          participant_ids: channel.participantIds,
          created_by: channel.createdBy,
          created_at: channel.createdAt
      };
      const { error } = await supabase.from('chat_channels').insert(dbChannel);
      if (error) console.error('Error creating channel:', error);
  },

  getMessages: async (channelId: string): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('timestamp', { ascending: true }); // Oldest first
      
      if (error) return [];

      return data.map((m: any) => ({
          id: m.id,
          channelId: m.channel_id,
          userId: m.user_id,
          userName: m.user_name,
          content: m.content,
          timestamp: Number(m.timestamp)
      })) as ChatMessage[];
  },

  sendMessage: async (msg: ChatMessage) => {
      const dbMsg = {
          id: msg.id,
          channel_id: msg.channelId,
          user_id: msg.userId,
          user_name: msg.userName,
          content: msg.content,
          timestamp: msg.timestamp
      };
      const { error } = await supabase.from('chat_messages').insert(dbMsg);
      if (error) console.error('Error sending message:', error);
  },

  // Auth Session (Local Persistence for Session, DB for Validation)
  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem('cr_current_user');
    return stored ? JSON.parse(stored) : null;
  },
  
  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem('cr_current_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cr_current_user');
    }
  }
};