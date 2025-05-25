'use client';

import { useState } from 'react';

interface MessageActionsProps {
  messageId: string;
  messageContent: string;
  isLastMessage: boolean;
  isLoading: boolean;
  onReexplain: (type: 'retry' | 'different-angle' | 'simplify' | 'detail') => void;
}

export default function MessageActions({ 
  messageId, 
  messageContent, 
  isLastMessage, 
  isLoading,
  onReexplain 
}: MessageActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // 复制消息内容
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // 处理重新解释
  const handleReexplain = (type: 'retry' | 'different-angle' | 'simplify' | 'detail') => {
    onReexplain(type);
    setIsExpanded(false);
  };

  const actionButtons = [
    {
      type: 'retry' as const,
      label: '再解释一遍',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
      ),
      description: '重新用第一性原理解释这个问题'
    },
    {
      type: 'different-angle' as const,
      label: '换个角度',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-4 0 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
        </svg>
      ),
      description: '从不同维度重新分析这个问题'
    },
    {
      type: 'simplify' as const,
      label: '简化解释',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
      description: '用更简单易懂的方式解释'
    },
    {
      type: 'detail' as const,
      label: '详细展开',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
      ),
      description: '提供更深入详细的分析'
    }
  ];

  return (
    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
      {/* 基础操作 */}
      <div className="flex items-center space-x-2">
        {/* 复制按钮 */}
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors touch-feedback"
          title="复制内容"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-green-500">已复制</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
              </svg>
              <span>复制</span>
            </>
          )}
        </button>

        {/* 点赞按钮 */}
        <button
          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors touch-feedback"
          title="这个回答很有帮助"
        >
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/>
          </svg>
          <span>有用</span>
        </button>
      </div>

      {/* 重新解释操作 - 仅对最后一条AI消息显示 */}
      {isLastMessage && (
        <div className="relative">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            disabled={isLoading}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-wechat-green-50 text-wechat-green-700 hover:bg-wechat-green-100 rounded-lg transition-colors disabled:opacity-50 touch-feedback"
          >
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>继续对话</span>
          </button>

          {/* 下拉菜单 */}
          {isExpanded && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 slide-in-bottom">
              <div className="p-2">
                <div className="text-xs text-gray-500 px-2 py-1 mb-1">选择对话方式：</div>
                {actionButtons.map((action) => (
                  <button
                    key={action.type}
                    onClick={() => handleReexplain(action.type)}
                    disabled={isLoading}
                    className="w-full flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 touch-feedback"
                    title={action.description}
                  >
                    <div className="flex-shrink-0 text-wechat-green-600">
                      {action.icon}
                    </div>
                    <span className="flex-1 text-left">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 