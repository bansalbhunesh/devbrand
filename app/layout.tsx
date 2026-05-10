import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'DevBrand — GitHub to LinkedIn Posts & Resume Bullets',
  description:
    'Turn your merged PRs into honest LinkedIn posts, resume bullets, and interview stories. No hype. No emoji. Just your actual work, written well.',
  openGraph: {
    title: 'DevBrand',
    description: 'GitHub → LinkedIn posts + resume bullets. No cringe.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{<Providers>{children}</Providers>}</body>
    </html>
  )
}
