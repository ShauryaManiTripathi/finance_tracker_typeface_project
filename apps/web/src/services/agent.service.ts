import api from '../lib/api';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface ChatResponse {
  response: string;
  history: ChatMessage[];
  functionCalls: number;
}

class AgentService {
  async chat(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    const response = await api.post('/agent/chat', {
      message,
      history
    });
    return response.data.data;
  }
}

export const agentService = new AgentService();
export default agentService;
