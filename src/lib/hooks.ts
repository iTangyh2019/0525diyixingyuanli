import { useCallback, useRef, useState } from 'react';
import { RequestOptions } from '@/types';

// 防抖Hook
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      func(...args);
    }, delay);
  }, [func, delay]) as T;
}

// 增强的 fetch Hook，支持重试和取消
export function useEnhancedFetch() {
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  const fetchWithRetry = useCallback(async (
    url: string,
    options: RequestInit & RequestOptions = {},
    maxRetries: number = 3
  ): Promise<Response> => {
    const { signal, timeout = 30000, ...fetchOptions } = options;
    
    // 创建新的 AbortController
    const controller = new AbortController();
    setAbortController(controller);
    
    // 组合信号
    const combinedSignal = signal ? 
      AbortSignal.any?.([signal, controller.signal]) || controller.signal : 
      controller.signal;
    
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 设置超时
        const timeoutId = setTimeout(() => {
          controller.abort('Request timeout');
        }, timeout);
        
        const response = await fetch(url, {
          ...fetchOptions,
          signal: combinedSignal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // 如果是取消操作，直接抛出错误
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // 指数退避，最大5秒
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }, [setAbortController]);
  
  const cancelRequest = useCallback(() => {
    if (abortController) {
      abortController.abort('User cancelled');
      setAbortController(null);
    }
  }, [abortController, setAbortController]);
  
  const isRequestActive = abortController !== null;
  
  return {
    fetchWithRetry,
    cancelRequest,
    isRequestActive
  };
}

// 自动保存Hook
export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => void,
  delay: number = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<T>(data);
  
  const debouncedSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      if (lastDataRef.current !== data) {
        saveFunction(data);
        lastDataRef.current = data;
      }
    }, delay);
  }, [data, saveFunction, delay]);
  
  return debouncedSave;
} 