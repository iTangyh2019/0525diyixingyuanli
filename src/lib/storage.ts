import { Message } from '@/types';

const STORAGE_KEY = 'first-principle-chat-history';
const MAX_MESSAGES = 100; // 限制最多存储100条消息
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB 限制

export interface StoredChatData {
  messages: Message[];
  timestamp: number;
  version: string;
}

// 获取存储使用情况
function getStorageUsage(): number {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? new Blob([data]).size : 0;
  } catch {
    return 0;
  }
}

// 清理旧数据，保留最新的消息
function cleanupOldMessages(messages: Message[]): Message[] {
  if (messages.length <= MAX_MESSAGES) {
    return messages;
  }
  
  // 保留最新的消息，但确保对话完整性（保留用户-助手对）
  const cleanedMessages: Message[] = [];
  for (let i = messages.length - 1; i >= 0 && cleanedMessages.length < MAX_MESSAGES; i--) {
    cleanedMessages.unshift(messages[i]);
    
    // 如果添加了助手消息，确保有对应的用户消息
    if (messages[i].role === 'assistant' && i > 0 && messages[i-1].role === 'user') {
      if (cleanedMessages.length < MAX_MESSAGES) {
        cleanedMessages.unshift(messages[i-1]);
        i--; // 跳过已添加的用户消息
      }
    }
  }
  
  return cleanedMessages;
}

// 保存对话历史
export function saveChatHistory(messages: Message[]): boolean {
  try {
    // 清理过多的消息
    const cleanedMessages = cleanupOldMessages(messages);
    
    const data: StoredChatData = {
      messages: cleanedMessages,
      timestamp: Date.now(),
      version: '1.0'
    };
    
    const serializedData = JSON.stringify(data);
    
    // 检查存储大小
    if (new Blob([serializedData]).size > MAX_STORAGE_SIZE) {
      console.warn('Chat history too large, removing oldest messages');
      // 如果还是太大，进一步减少消息数量
      const reducedMessages = cleanupOldMessages(cleanedMessages.slice(-50));
      const reducedData = { ...data, messages: reducedMessages };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reducedData));
    } else {
      localStorage.setItem(STORAGE_KEY, serializedData);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to save chat history:', error);
    
    // 如果存储失败，尝试清理存储空间
    try {
      localStorage.removeItem(STORAGE_KEY);
      const minimalData: StoredChatData = {
        messages: messages.slice(-10), // 只保留最后10条消息
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalData));
      return true;
    } catch {
      return false;
    }
  }
}

// 加载对话历史
export function loadChatHistory(): Message[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    
    const parsed: StoredChatData = JSON.parse(data);
    
    // 验证数据格式
    if (!parsed.messages || !Array.isArray(parsed.messages)) {
      console.warn('Invalid chat history format, clearing storage');
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    
    // 验证消息格式
    const validMessages = parsed.messages.filter((msg): msg is Message => {
      return (
        typeof msg === 'object' &&
        typeof msg.id === 'string' &&
        typeof msg.content === 'string' &&
        (msg.role === 'user' || msg.role === 'assistant') &&
        typeof msg.timestamp === 'number'
      );
    });
    
    return validMessages;
  } catch (error) {
    console.error('Failed to load chat history:', error);
    // 清理损坏的数据
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

// 清除对话历史
export function clearChatHistory(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear chat history:', error);
    return false;
  }
}

// 获取存储统计信息
export function getStorageStats() {
  const usage = getStorageUsage();
  const messages = loadChatHistory();
  
  return {
    usage,
    messageCount: messages.length,
    maxMessages: MAX_MESSAGES,
    maxSize: MAX_STORAGE_SIZE,
    usagePercentage: Math.round((usage / MAX_STORAGE_SIZE) * 100)
  };
} 