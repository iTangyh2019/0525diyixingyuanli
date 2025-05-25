'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message, ChatState } from '@/types';
import { saveChatHistory, loadChatHistory, clearChatHistory } from '@/lib/storage';
import { useEnhancedFetch } from '@/lib/hooks';
import { canSendRequest, formatWaitTime } from '@/lib/rate-limit';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

const MAX_RETRY_COUNT = 3;
const REQUEST_TIMEOUT = 30000; // 30秒

export default function ChatInterface() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    retryCount: 0,
    canRetry: false,
    isRetrying: false,
  });

  const { fetchWithRetry, cancelRequest, isRequestActive } = useEnhancedFetch();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<string>('');

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 组件初始化时加载历史记录
  useEffect(() => {
    try {
      const savedMessages = loadChatHistory();
      if (savedMessages.length > 0) {
        setChatState(prev => ({
          ...prev,
          messages: savedMessages
        }));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, []);

  // 自动保存对话历史
  useEffect(() => {
    if (chatState.messages.length > 0) {
      try {
        saveChatHistory(chatState.messages);
      } catch (error) {
        console.error('Failed to save chat history:', error);
      }
    }
  }, [chatState.messages]);

  // 自动滚动到底部
  useEffect(() => {
    if (chatState.messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [chatState.messages, scrollToBottom]);

  // 处理API调用
  const callChatAPI = useCallback(async (message: string, isRetry: boolean = false) => {
    try {
      const response = await fetchWithRetry('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
        timeout: REQUEST_TIMEOUT
      }, isRetry ? 1 : MAX_RETRY_COUNT);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求已取消');
      }
      throw error;
    }
  }, [fetchWithRetry]);

  // 发送消息
  const handleSendMessage = useCallback(async (content: string) => {
    // 检查频率限制
    const rateLimitCheck = canSendRequest();
    if (!rateLimitCheck.allowed) {
      const waitTime = formatWaitTime(rateLimitCheck.waitTime);
      setChatState(prev => ({
        ...prev,
        error: `请求过于频繁，请在 ${waitTime} 后重试。剩余请求次数：${rateLimitCheck.remaining}`
      }));
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    lastUserMessageRef.current = content;

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
      retryCount: 0,
      canRetry: false,
      isRetrying: false,
    }));

    try {
      const responseContent = await callChatAPI(content);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now(),
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        retryCount: 0,
        canRetry: false,
      }));

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? error.message : '发送失败，请重试';
      
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        canRetry: !errorMessage.includes('取消') && prev.retryCount < MAX_RETRY_COUNT,
        retryCount: prev.retryCount + 1,
      }));
    }
  }, [callChatAPI]);

  // 重试最后一条消息
  const handleRetry = useCallback(async () => {
    if (!lastUserMessageRef.current || chatState.isLoading) return;

    setChatState(prev => ({
      ...prev,
      isLoading: true,
      isRetrying: true,
      error: null,
    }));

    try {
      const responseContent = await callChatAPI(lastUserMessageRef.current, true);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now(),
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        isRetrying: false,
        retryCount: 0,
        canRetry: false,
      }));

    } catch (error) {
      console.error('Retry error:', error);
      const errorMessage = error instanceof Error ? error.message : '重试失败';
      
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        isRetrying: false,
        error: errorMessage,
        canRetry: prev.retryCount < MAX_RETRY_COUNT,
        retryCount: prev.retryCount + 1,
      }));
    }
  }, [chatState.isLoading, callChatAPI]);

  // 取消请求
  const handleCancelRequest = useCallback(() => {
    cancelRequest();
    setChatState(prev => ({
      ...prev,
      isLoading: false,
      isRetrying: false,
      error: '请求已取消',
      canRetry: true,
    }));
  }, [cancelRequest]);

  // 清除错误
  const clearError = useCallback(() => {
    setChatState(prev => ({ ...prev, error: null, canRetry: false }));
  }, []);

  // 清除对话历史
  const handleClearHistory = useCallback(() => {
    try {
      clearChatHistory();
      setChatState(prev => ({
        ...prev,
        messages: [],
        error: null,
        retryCount: 0,
        canRetry: false,
      }));
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }, []);

  // 处理多轮对话重新解释
  const handleReexplain = useCallback(async (messageId: string, type: 'retry' | 'different-angle' | 'simplify' | 'detail') => {
    // 找到对应的消息
    const messageIndex = chatState.messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    // 找到对应的用户消息（AI消息的前一条）
    const userMessage = chatState.messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    // 检查频率限制
    const rateLimitCheck = canSendRequest();
    if (!rateLimitCheck.allowed) {
      const waitTime = formatWaitTime(rateLimitCheck.waitTime);
      setChatState(prev => ({
        ...prev,
        error: `请求过于频繁，请在 ${waitTime} 后重试。剩余请求次数：${rateLimitCheck.remaining}`
      }));
      return;
    }

    // 构建提示词后缀
    const promptSuffix = {
      'retry': '请重新用第一性原理解释这个问题，采用不同的分析路径。',
      'different-angle': '请从完全不同的角度重新分析这个问题，寻找新的视角和洞察。',
      'simplify': '请用更简单易懂的语言重新解释，减少专业术语，增加生活化的例子。',
      'detail': '请提供更详细深入的分析，展开每个关键概念，提供更多实例和论证。'
    };

    const enhancedMessage = `${userMessage.content}\n\n${promptSuffix[type]}`;

    setChatState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      retryCount: 0,
      canRetry: false,
      isRetrying: false,
    }));

    try {
      const responseContent = await callChatAPI(enhancedMessage);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: Date.now(),
      };

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        retryCount: 0,
        canRetry: false,
      }));

    } catch (error) {
      console.error('Reexplain error:', error);
      const errorMessage = error instanceof Error ? error.message : '重新解释失败，请重试';
      
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        canRetry: true,
        retryCount: prev.retryCount + 1,
      }));
    }
  }, [chatState.messages, callChatAPI]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 mobile-keyboard-adjust">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 safe-area-top">
        <div className="px-4 py-3 md:py-4">
          <div className="mx-auto max-w-4xl flex justify-between items-center">
            <div className="flex items-center space-x-3">
              {/* Logo/Icon */}
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-wechat-green-400 to-wechat-green-600 flex items-center justify-center">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
              </div>
              
              <div>
                <h1 className="text-lg md:text-xl font-semibold text-gray-900 text-gradient">
                  第一性原理解读机器人
                </h1>
                <p className="text-xs md:text-sm text-gray-500 hidden md:block">
                  用基础原理重新思考问题的本质
                </p>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* 消息数量指示器 */}
              {chatState.messages.length > 0 && (
                <div className="hidden md:flex items-center space-x-2 text-xs text-gray-500">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                  </svg>
                  <span>{Math.floor(chatState.messages.length / 2)} 对话</span>
                </div>
              )}
              
              {/* 清除历史按钮 */}
              {chatState.messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  disabled={chatState.isLoading}
                  className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 touch-feedback"
                >
                  <span className="hidden md:inline">清除历史</span>
                  <svg className="w-4 h-4 md:hidden" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Error Message */}
      {chatState.error && (
        <div className="bg-red-50 border-l-4 border-red-400 slide-in-bottom">
          <div className="p-4">
            <div className="mx-auto max-w-4xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{chatState.error}</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {chatState.canRetry && (
                    <button
                      onClick={handleRetry}
                      disabled={chatState.isLoading || chatState.isRetrying}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 touch-feedback"
                    >
                      {chatState.isRetrying ? '重试中...' : '重试'}
                    </button>
                  )}
                  <button
                    onClick={clearError}
                    className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-100 transition-colors touch-feedback"
                  >
                    <span className="sr-only">关闭</span>
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <MessageList 
        messages={chatState.messages} 
        isLoading={chatState.isLoading}
        onReexplain={handleReexplain}
      />
      
      {/* 取消请求按钮 */}
      {chatState.isLoading && isRequestActive && (
        <div className="px-4 py-2 text-center slide-in-bottom">
          <button
            onClick={handleCancelRequest}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors touch-feedback"
          >
            取消请求
          </button>
        </div>
      )}

      {/* 滚动到底部的锚点 */}
      <div ref={messagesEndRef} />

      {/* Input */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        isLoading={chatState.isLoading}
      />
    </div>
  );
} 