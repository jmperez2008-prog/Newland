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
  SELECT = 'select',
  CHECK = 'check',
  CURRENCY = 'currency'
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
  isLostOperation?: boolean;
  lostOperationReason?: string;
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

// --- CHAT TYPES ---

export type ChatType = 'global' | 'zone' | 'direct';

export interface ChatChannel {
  id: string;
  name: string;
  type: ChatType;
  zone?: string; // Only for 'zone' type
  participantIds: string[]; // User IDs involved (for direct chats) or allowed
  createdBy: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

export enum RequestStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED'
}

export interface AppRequest {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorZone?: string;
  targetRole: UserRole;
  title: string;
  description: string;
  status: RequestStatus;
  response?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserGoal {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  goalLines: number;
  deadlineDate: string; // YYYY-MM-DD
}

export enum ClaimStatus {
  OPEN = 'OPEN',
  RESOLVED = 'RESOLVED'
}

export interface ClaimMessage {
  id: string;
  claimId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  attachments?: ClaimAttachment[];
}

export interface Claim {
  id: string;
  companyName: string;
  cif: string;
  problem: string;
  messages: ClaimMessage[];
  status: ClaimStatus;
  commercialId: string;
  adminId: string;
  zone: string;
  createdAt: number;
}

export interface ClaimAttachment {
  id: string;
  claimId: string;
  fileName: string;
  fileType: string;
  data: string; // Base64
  uploadedBy: string; // User ID
}
