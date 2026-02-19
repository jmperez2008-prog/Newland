export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  COMMERCIAL = 'COMMERCIAL'
}

export interface User {
  id: string;
  username: string;
  password?: string; // Only used for initial setup/check
  name: string;
  role: UserRole;
  zone?: string; // Optional for Superadmin (global), required for others
  phone?: string;
  email?: string;
}

export enum QuestionType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select'
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // For select type (comma separated in UI)
  required: boolean;
}

export interface ReportAnswer {
  questionId: string;
  value: string | number;
}

export interface Report {
  id: string;
  userId: string; // The commercial who submitted it
  userName: string;
  timestamp: number;
  answers: ReportAnswer[];
  aiSummary?: string; // Optional AI insight
}

export interface Appointment {
  id: string;
  userId: string;
  userName: string;
  date: string; // ISO Date string YYYY-MM-DD
  timeSlot: string; // e.g., "09:00", "10:00"
  notes: string;
}

export interface SharedDocument {
  id: string;
  name: string;
  type: string; // MIME type
  size: number; // Bytes
  uploadedAt: number;
  data: string; // Base64 Data URI
}

export const TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", 
  "13:00", "15:00", "16:00", "17:00"
];