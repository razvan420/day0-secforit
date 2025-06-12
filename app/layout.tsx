import type { Metadata } from 'next'
import type { Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'  // No default import
const inter = Inter({ subsets: ['latin'] })


export const metadata: Metadata = {
 title: 'VulnWatch | Real-time Vulnerability Intelligence Platform',
  description: 'Stay ahead of cyber threats with our comprehensive vulnerability tracking platform. Get instant alerts from CISA KEV, NVD, and GitHub Security Advisories with EPSS risk scoring and actionable threat intelligence.',
keywords: 'vulnerability scanner, CVE database, CISA KEV tracker, cybersecurity dashboard, threat intelligence platform, zero-day alerts, security monitoring, exploit prediction, vulnerability management, infosec tools, Lisman Razvan, Stefanini, vulnerability assessment, security intelligence, cyber threat monitoring, NVD database, GitHub security advisories, EPSS scoring, exploit likelihood, vulnerability feeds, security alerts, penetration testing, risk assessment, security operations center, SOC tools, incident response, threat hunting, malware analysis, security automation, vulnerability prioritization, patch management, security compliance, cyber defense, threat detection, security research, bug bounty, responsible disclosure, security advisory, exploit database, proof of concept, attack vector analysis, threat landscape, cyber intelligence, security metrics, vulnerability lifecycle, threat modeling, security posture, risk mitigation, cyber resilience, security orchestration, threat feeds, IOC indicators, MITRE ATT&CK, security frameworks, compliance monitoring, security benchmarks, penetration testing tools, red team exercises, blue team defense, purple team collaboration, security awareness, cyber hygiene, attack surface management, digital forensics, incident handling, security governance, risk management framework, cybersecurity maturity',  authors: [{ name: 'Razvan Lisman', url: 'https://secforit.ro/' }],
  robots: 'index, follow',
  openGraph: {
    title: 'VulnWatch',
    description: 'Professional-grade vulnerability tracking and threat intelligence. Real-time monitoring of critical security vulnerabilitie.',
    type: 'website',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    siteName: 'VulnWatch',
    images: [
      {
        url: '/og-image.jpg', // Add this image to your public folder
        width: 1200,
        height: 630,
        alt: 'VulnWatch Pro - Vulnerability Intelligence Dashboard',
      }
    ],
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