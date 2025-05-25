export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatResponse {
  content: string;
  error?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  retryCount: number;
  canRetry: boolean;
  isRetrying: boolean;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeout?: number;
} 