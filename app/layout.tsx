import type { Metadata } from 'next'
import type { Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ZeroDay Intelligence - Real-time Vulnerability Intelligence',
  description: 'Professional vulnerability tracking with real-time data from CISA KEV, NVD, and GitHub Security Advisories. Enhanced with EPSS exploitation probability scoring and threat intelligence.',
  keywords: 'vulnerabilities, CVE, CISA, NVD, zero-day, security, RSS feed, cybersecurity, threat intelligence, EPSS, exploit prediction',
  authors: [{ name: 'Razvan @Stefanini CSS' }],
  robots: 'index, follow',
  openGraph: {
    title: 'ZeroDay Intelligence - Real-time Vulnerability Intelligence',
    description: 'Professional vulnerability tracking with threat intelligence from trusted government and community sources',
    type: 'website',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    siteName: 'ZeroDay Intelligence',
    images: [
      {
        url: '/security-og-image.png',
        width: 1200,
        height: 630,
        alt: 'ZeroDay Intelligence - Vulnerability Tracking'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZeroDay Intelligence',
    description: 'Real-time vulnerability intelligence from trusted sources',
    images: ['/security-og-image.png']
  },
  alternates: {
    types: {
      'application/rss+xml': [
        {
          url: '/rss',
          title: 'Zero-Day Intelligence RSS Feed'
        }
      ]
    }
  },
  other: {
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' }
  ]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="alternate" type="application/rss+xml" title="Zero-Day Intelligence RSS Feed" href="/rss" />
        
        {/* Security Headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        
        {/* Performance Hints */}
        <link rel="dns-prefetch" href="//www.cisa.gov" />
        <link rel="dns-prefetch" href="//services.nvd.nist.gov" />
        <link rel="dns-prefetch" href="//api.github.com" />
        <link rel="dns-prefetch" href="//api.first.org" />
        
        {/* Structured Data for Search Engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'ZeroDay Intelligence',
              description: 'Real-time vulnerability intelligence and threat tracking',
              url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/search?q={search_term_string}`
                },
                'query-input': 'required name=search_term_string'
              },
              provider: {
                '@type': 'Organization',
                name: 'Security Intelligence Team',
                description: 'Professional cybersecurity threat intelligence'
              }
            })
          }}
        />
      </head>
      <body className={`${inter.className} antialiased bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50`}>
        <div id="root" className="min-h-screen">
          {children}
        </div>
        
        {/* Analytics and Monitoring Scripts */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Add your analytics scripts here */}
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  // Performance monitoring
                  if ('performance' in window) {
                    window.addEventListener('load', function() {
                      setTimeout(function() {
                        const perfData = performance.getEntriesByType('navigation')[0];
                        if (perfData) {
                          console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
                        }
                      }, 0);
                    });
                  }
                  
                  // Service Worker Registration for Offline Support
                  if ('serviceWorker' in navigator) {
                    window.addEventListener('load', function() {
                      navigator.serviceWorker.register('/sw.js')
                        .then(function(registration) {
                          console.log('SW registered: ', registration);
                        })
                        .catch(function(registrationError) {
                          console.log('SW registration failed: ', registrationError);
                        });
                    });
                  }
                `
              }}
            />
          </>
        )}
      </body>
    </html>
  )
} 