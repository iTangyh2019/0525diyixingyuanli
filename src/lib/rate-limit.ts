// 频率限制管理器
class RateLimiter {
  private requests: { [key: string]: number[] } = {};
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  // 检查是否允许请求
  checkLimit(key: string): boolean {
    const now = Date.now();
    
    // 获取当前key的请求记录
    if (!this.requests[key]) {
      this.requests[key] = [];
    }
    
    const requests = this.requests[key];
    
    // 清理过期的请求记录
    const validRequests = requests.filter(time => now - time < this.windowMs);
    this.requests[key] = validRequests;
    
    // 检查是否超过限制
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // 记录新请求
    validRequests.push(now);
    return true;
  }

  // 获取剩余请求次数
  getRemainingRequests(key: string): number {
    const now = Date.now();
    
    if (!this.requests[key]) {
      return this.maxRequests;
    }
    
    const validRequests = this.requests[key].filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  // 获取重置时间
  getResetTime(key: string): number {
    if (!this.requests[key] || this.requests[key].length === 0) {
      return 0;
    }
    
    const oldestRequest = Math.min(...this.requests[key]);
    return oldestRequest + this.windowMs;
  }

  // 清理所有过期记录
  cleanup(): void {
    const now = Date.now();
    
    Object.keys(this.requests).forEach(key => {
      this.requests[key] = this.requests[key].filter(time => now - time < this.windowMs);
      
      // 如果没有有效记录，删除这个key
      if (this.requests[key].length === 0) {
        delete this.requests[key];
      }
    });
  }
}

// 创建默认的频率限制实例
// 限制：1分钟内最多10次请求
export const chatRateLimiter = new RateLimiter(10, 60000);

// 获取用户标识符（简单实现，实际项目中可能需要更复杂的逻辑）
export function getUserKey(): string {
  // 在实际项目中，可能会使用用户ID、IP地址等
  // 这里使用localStorage来生成一个持久的用户标识
  if (typeof window === 'undefined') {
    return 'anonymous';
  }
  
  let userKey = localStorage.getItem('user-key');
  if (!userKey) {
    userKey = 'user-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('user-key', userKey);
  }
  
  return userKey;
}

// 检查是否可以发送请求
export function canSendRequest(): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  waitTime: number;
} {
  const userKey = getUserKey();
  const allowed = chatRateLimiter.checkLimit(userKey);
  const remaining = chatRateLimiter.getRemainingRequests(userKey);
  const resetTime = chatRateLimiter.getResetTime(userKey);
  const waitTime = resetTime - Date.now();
  
  return {
    allowed,
    remaining,
    resetTime,
    waitTime: Math.max(0, waitTime)
  };
}

// 格式化等待时间
export function formatWaitTime(ms: number): string {
  if (ms <= 0) return '';
  
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}分钟`;
} 