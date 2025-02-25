export interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  userId: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  userId: string;
  sessionId: string;
}

export interface ChatHistory {
  messages: Message[];
} 