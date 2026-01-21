import { api } from '@/lib/axios';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  conversation_id: string;
  refresh_needed?: boolean;
}

export const sendMessage = async (message: string, conversationId?: string, history: ChatMessage[] = []): Promise<ChatResponse> => {
  const { data } = await api.post<ChatResponse>('/ai/chat', {
    message,
    conversation_id: conversationId,
    history
  });
  return data;
};


