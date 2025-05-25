'use client';

import { useState, useEffect, useRef } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSendMessage, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动聚焦
  useEffect(() => {
    if (textareaRef.current && !isLoading) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  // 自动调整textarea高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // 移动端键盘适配
  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const { height } = window.visualViewport;
        document.documentElement.style.setProperty('--vh', `${height * 0.01}px`);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      handleViewportChange();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      }
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (message.trim() && !isLoading && !isComposing) {
      onSendMessage(message.trim());
      setMessage('');
      // 重置textarea高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // 处理中文输入法
    if (e.nativeEvent.isComposing || isComposing) {
      return;
    }

    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift + Enter 换行
        return;
      } else {
        // Enter 发送
        e.preventDefault();
        handleSubmit(e);
      }
    }
  }

  function handleCompositionStart() {
    setIsComposing(true);
  }

  function handleCompositionEnd() {
    setIsComposing(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(e.target.value);
  }

  function handleFocus() {
    setIsFocused(true);
  }

  function handleBlur() {
    setIsFocused(false);
  }

  const isDisabled = !message.trim() || isLoading || isComposing;
  const placeholder = isLoading 
    ? "AI正在思考中，请稍候..." 
    : "输入你想要用第一性原理解释的问题...";

  return (
    <div className="border-t bg-white safe-area-bottom">
      <form onSubmit={handleSubmit} className="p-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-end space-x-3">
            {/* 输入区域 */}
            <div className="flex-1 relative">
              <div 
                className={`relative rounded-2xl border-2 transition-all duration-200 ${
                  isFocused 
                    ? 'border-wechat-green-400 bg-white shadow-lg shadow-wechat-green-100' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  placeholder={placeholder}
                  className="w-full resize-none bg-transparent px-4 py-3 text-sm md:text-base focus:outline-none disabled:text-gray-400 placeholder:text-gray-400 min-h-[2.75rem] md:min-h-[3rem] max-h-32"
                  rows={1}
                  maxLength={1000}
                  disabled={isLoading}
                />
                
                {/* 字符计数和快捷键提示 */}
                <div className="flex justify-between items-center px-4 pb-2">
                  <div className="text-xs text-gray-400">
                    {message.length}/1000
                  </div>
                  
                  {/* 快捷键提示 - 桌面端显示 */}
                  {message.length > 0 && !isLoading && (
                    <div className="hidden md:block text-xs text-gray-400">
                      Enter发送 • Shift+Enter换行
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 发送按钮 */}
            <button
              type="submit"
              disabled={isDisabled}
              className={`
                flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-2xl
                transition-all duration-200 touch-feedback ripple
                ${isDisabled 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'btn-wechat hover:shadow-lg active:scale-95'
                }
              `}
              title={isDisabled ? '请输入内容' : '发送消息'}
            >
              {isLoading ? (
                <div className="relative">
                  <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <svg
                  className="w-5 h-5 md:w-6 md:h-6 transition-transform duration-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
          
          {/* 移动端快捷键提示 */}
          {message.length > 0 && !isLoading && (
            <div className="mt-2 md:hidden text-xs text-gray-400 text-center">
              轻点发送 • 换行请直接输入
            </div>
          )}
        </div>
      </form>
    </div>
  );
} 