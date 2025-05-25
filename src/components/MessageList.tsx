'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types';
import MessageActions from './MessageActions';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onReexplain?: (messageId: string, type: 'retry' | 'different-angle' | 'simplify' | 'detail') => void;
}

// 加载动画组件
function LoadingIndicator() {
  return (
    <div className="flex justify-start mb-4 fade-in">
      <div className="message-bubble message-assistant">
        <div className="loading-dots">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
        <span className="ml-2 text-sm text-gray-500">AI正在思考中...</span>
      </div>
    </div>
  );
}

// 空状态组件
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
          <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" strokeDasharray="8 4"/>
          <path d="M22 28c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v0c0 1.1-.9 2-2 2H24c-1.1 0-2-.9-2-2v0z" fill="currentColor"/>
          <path d="M22 36c0-1.1.9-2 2-2h16c1.1 0 2 .9 2 2v0c0 1.1-.9 2-2 2H24c-1.1 0-2-.9-2-2v0z" fill="currentColor"/>
          <path d="M22 44c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v0c0 1.1-.9 2-2 2H24c-1.1 0-2-.9-2-2v0z" fill="currentColor"/>
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-700 mb-2">
        开始你的第一性原理探索
      </h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        输入你想要深度思考的问题，我将用第一性原理帮你重新分析和理解
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-md mx-auto">
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-1">💡 示例问题</div>
          <div className="text-xs text-gray-500">为什么要创业？</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-1">🔍 分析场景</div>
          <div className="text-xs text-gray-500">学历还重要吗？</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-1">🎯 决策问题</div>
          <div className="text-xs text-gray-500">该买房还是租房？</div>
        </div>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-1">💭 哲学思考</div>
          <div className="text-xs text-gray-500">什么是成功？</div>
        </div>
      </div>
    </div>
  );
}

// 消息时间格式化
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    return '刚刚';
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}小时前`;
  } else if (diffInHours < 24 * 7) {
    return `${Math.floor(diffInHours / 24)}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// 消息内容渲染
function MessageContent({ content, role }: { content: string; role: Message['role'] }) {
  // 处理markdown样式的内容
  const renderContent = (text: string) => {
    // 简单的markdown解析 - 支持 ## 标题和 **粗体**
    return text
      .split('\n')
      .map((line, index) => {
        // 处理标题
        if (line.startsWith('## ')) {
          return (
            <div key={index} className="font-semibold text-sm mb-2 mt-3 first:mt-0">
              {line.replace('## ', '')}
            </div>
          );
        }
        // 处理粗体
        const processedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        return line.trim() ? (
          <div 
            key={index} 
            className="mb-1"
            dangerouslySetInnerHTML={{ __html: processedLine }}
          />
        ) : (
          <div key={index} className="h-2" />
        );
      });
  };

  return (
    <div className="whitespace-pre-wrap">
      {renderContent(content)}
    </div>
  );
}

// 单条消息组件
function MessageItem({ 
  message, 
  index, 
  isLastMessage, 
  isLoading, 
  onReexplain 
}: { 
  message: Message; 
  index: number; 
  isLastMessage: boolean;
  isLoading: boolean;
  onReexplain?: (messageId: string, type: 'retry' | 'different-angle' | 'simplify' | 'detail') => void;
}) {
  const isUser = message.role === 'user';
  
  return (
    <div 
      className={`flex mb-4 fade-in ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className={`message-bubble ${isUser ? 'message-user' : 'message-assistant'}`}>
        <MessageContent content={message.content} role={message.role} />
        <div 
          className={`text-xs mt-2 opacity-70 ${
            isUser ? 'text-white/70' : 'text-gray-400'
          }`}
        >
          {formatTime(message.timestamp)}
        </div>
        
        {/* 消息操作 - 仅对AI回复显示 */}
        {!isUser && onReexplain && (
          <MessageActions
            messageId={message.id}
            messageContent={message.content}
            isLastMessage={isLastMessage}
            isLoading={isLoading}
            onReexplain={(type) => onReexplain(message.id, type)}
          />
        )}
      </div>
    </div>
  );
}

export default function MessageList({ messages, isLoading, onReexplain }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 overflow-auto px-4 py-6 md:px-6">
        <div className="mx-auto max-w-4xl">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-4 py-6 md:px-6 safe-area-left safe-area-right">
      <div className="mx-auto max-w-4xl">
        {messages.map((message, index) => {
          // 判断是否是最后一条AI消息
          const isLastAIMessage = message.role === 'assistant' && 
            index === messages.length - 1 && 
            !isLoading;
          
          return (
            <MessageItem 
              key={message.id} 
              message={message} 
              index={index}
              isLastMessage={isLastAIMessage}
              isLoading={isLoading}
              onReexplain={onReexplain}
            />
          );
        })}
        
        {isLoading && <LoadingIndicator />}
        
        {/* 滚动锚点 */}
        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  );
} 