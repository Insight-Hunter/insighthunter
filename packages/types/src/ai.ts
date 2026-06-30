import type { ISODate, UUID } from './common.js';

export interface AiConversation {
  id: UUID;
  organizationId: UUID;
  userId: UUID;
  title: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AiMessage {
  id: UUID;
  conversationId: UUID;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  createdAt: ISODate;
}
