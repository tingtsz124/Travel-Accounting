export const metadata = {
  title: '多幣種旅遊記帳',
  description: '旅行消費記錄與 AI 分析分析工具',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f4f6f8' }}>
        {children}
      </body>
    </html>
  )
}
