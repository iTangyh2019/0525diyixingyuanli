import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '第一性原理解读机器人',
  description: '用基础原理重新思考问题的本质',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
} 