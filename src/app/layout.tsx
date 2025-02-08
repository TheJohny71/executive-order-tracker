import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap'  // Optimize font loading
})

export const metadata: Metadata = {
  title: 'Executive Order Tracker',
  description: 'Track and analyze White House executive orders and memoranda',
  metadataBase: new URL('https://executive-order-tracker.vercel.app'), // Update this with your actual domain
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
