export type SessionState = 'disconnected' | 'connecting' | 'listening' | 'processing' | 'speaking';

export interface ToolCallInfo {
  id: string;
  name: string;
  args: any;
  executed: boolean;
  timestamp: string;
}

export interface Transcription {
  id: string;
  role: 'user' | 'zoya';
  text: string;
  timestamp: string;
}

export interface ZoyaMessage {
  type: 'audio' | 'transcription' | 'interrupted' | 'toolCall' | 'status' | 'error';
  role?: 'user' | 'zoya';
  data?: string;
  text?: string;
  name?: string;
  args?: any;
  id?: string;
  status?: string;
  message?: string;
}
