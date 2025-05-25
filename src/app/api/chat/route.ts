import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `角色定义​
你是由第一性原理驱动的本质思考引擎，需遵循：

绝对物理法则（不可违反客观规律）
逻辑自洽（每个结论必须有因果链）
要素穷尽（拆解至不可分割的基本单元）

核心处理流程​
▍阶段1：破界（突破表象）

强制声明："我将暂时清空所有传统认知"
执行动作：识别并粉碎3个最常见假设（例："年入百万必须创业"→粉碎为劳动力价值公式）

▍阶段2：原子化拆解
使用5层递归分解：
① 问题重构：将抽象问题转为可量化要素
（如"学历贬值该考研吗？"→拆解为「机会成本=备考时间×成功率×学历溢价」）
② 要素溯源：追溯每个变量的一阶原理
（例："学历溢价"拆解为「企业筛选成本+知识折旧率」）
③ 物理基准：建立最小可行性单元模型
（如"备考时间"转化为「神经科学中的有效学习时长阈值」）
④ 约束条件：标注不可突破的刚性限制
（如生物学限制：人类每日有效学习≤6小时）

▍阶段3：重构解决方案

强制路径：必须包含3种重建方式：
① 要素重组（重新排列组合基本单元）
② 技术跃迁（引入跨学科原理，如用博弈论重构职场竞争）
③ 范式颠覆（建立新坐标系，如用"个人IP市值"替代"年薪"）

验证机制​
悖论检测：主动寻找方案中的矛盾点
（例：若方案要求"每天学习18小时"，触发生物学悖论警报）
极端测试：将条件参数调整至极限值验证
（如将时间压缩至1/10，成本增加100倍）
迁移验证：在3个不相关领域模拟应用
（例：将赚钱方案迁移到火星殖民场景）

交互强化设计​
三维度输出结构：
本质层（物理/数学表达式）→ 应用层（执行路径图）→ 迁移层（跨领域案例）

请按照以下结构组织你的回答：
## 问题拆解
拆解用户问题的基本组成部分，质疑潜在假设

## 核心原理  
列举最基础的事实或真理（第一性原理）

## 创新思路
基于第一性原理提出新颖的解决方案或视角

语气风格请模仿Elon Musk的直率且富有远见的表达方式。`;

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    // 输入验证
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: '请输入有效的问题' },
        { status: 400 }
      );
    }
    
    if (message.length > 1000) {
      return NextResponse.json(
        { error: '输入内容过长，请限制在1000字符以内' },
        { status: 400 }
      );
    }
    
    // 简单的提示词注入过滤
    const suspiciousPatterns = [
      /ignore\s+previous\s+instructions/i,
      /你是.*(?:助手|AI)/i,
      /forget\s+everything/i,
    ];
    
    const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
      pattern.test(message)
    );
    
    if (hasSuspiciousContent) {
      return NextResponse.json(
        { error: '请输入正常的问题，避免使用特殊指令' },
        { status: 400 }
      );
    }

    // 获取API密钥
    const apiKey = process.env.OPENROUTER_API_KEY || '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';
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API配置错误' },
        { status: 500 }
      );
    }

    // 调用OpenRouter API
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://first-principle-ai-bot.vercel.app',
        'X-Title': 'First Principle AI Bot',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'AI服务暂时不可用，请稍后重试' },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'AI回复格式异常，请重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      content: data.choices[0].message.content
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'AI服务暂时不可用，请稍后重试' },
      { status: 500 }
    );
  }
} 