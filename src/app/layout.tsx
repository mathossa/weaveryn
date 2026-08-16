import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AppFooter } from '@/components/app-footer'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  preload: false,
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  preload: false,
})

export const metadata: Metadata = {
  title: {
    default: 'Weaveryn',
    template: '%s · Weaveryn',
  },
  description:
    'Persistent worlds, campaigns, characters, and connected stories.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AppFooter />
      </body>
    </html>
  )
}
