import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: {
    default: 'DecodedSound — SDK Music Translator',
    template: '%s | DecodedSound',
  },
  description:
    'AI-powered translator for SDK (Esdeekid) music from the Cape Flats, South Africa. Understand the lyrics, slang, and cultural context of one of the most unique street music genres in the world.',
  keywords: ['SDK', 'esdeekid', 'Cape Flats', 'South Africa', 'music translator', 'slang dictionary', 'cultural context', 'Kaaps', 'Cape Town hip-hop'],
  authors: [{ name: 'DecodedSound' }],
  openGraph: {
    title: 'DecodedSound — SDK Music Translator',
    description: 'AI-powered cultural translator for SDK / Esdeekid music from the Cape Flats. Making the culture accessible to the world.',
    siteName: 'DecodedSound',
    type: 'website',
    locale: 'en_ZA',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DecodedSound — SDK Music Translator',
    description: 'AI-powered cultural translator for SDK / Esdeekid music from the Cape Flats.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-ds-bg text-ds-text antialiased min-h-screen">
        <nav className="border-b border-white/5 bg-ds-bg/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ds-accent to-ds-purple flex items-center justify-center text-sm font-bold">
                DS
              </div>
              <span className="font-semibold text-white tracking-tight">DecodedSound</span>
              <span className="text-xs text-white/30 font-mono ml-1">v1.0</span>
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/library" className="text-white/50 hover:text-white transition-colors">Library</Link>
              <Link href="/kb" className="text-white/50 hover:text-white transition-colors">Slang KB</Link>
              <span className="px-2 py-0.5 rounded-full bg-ds-accent/10 text-ds-accent text-xs font-mono border border-ds-accent/20">
                SDK only
              </span>
            </div>
          </div>
        </nav>
        {children}
        <footer className="border-t border-white/5 mt-24 py-8 text-center text-white/20 text-sm">
          <p>DecodedSound · SDK / Esdeekid Music · Cape Flats, South Africa</p>
          <p className="mt-1">AI-generated translations — always flagged for accuracy.</p>
        </footer>
      </body>
    </html>
  )
}
