/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '127.0.0.1:3000'],
      bodySizeLimit: '2mb'
    }
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/rss',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/rss+xml; charset=utf-8'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=1800, stale-while-revalidate=3600'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com' : '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
          }
        ]
      }
    ];
  },
  
  // URL rewrites for SEO and user-friendly URLs
  async rewrites() {
    return [
      {
        source: '/feed',
        destination: '/rss'
      },
      {
        source: '/feed.xml',
        destination: '/rss'
      },
      {
        source: '/vulnerabilities.xml',
        destination: '/rss'
      },
      {
        source: '/security-feed',
        destination: '/rss'
      }
    ];
  },
  
  // Redirect old URLs to new structure
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true
      },
      {
        source: '/home',
        destination: '/',
        permanent: true
      }
    ];
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com'
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com'
      }
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },
  
  // Performance optimizations
  swcMinify: true,
  poweredByHeader: false,
  generateEtags: true,
  compress: true,
  
  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    typescript: {
      ignoreBuildErrors: false
    },
    eslint: {
      ignoreDuringBuilds: false
    }
  }),
  
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    output: 'standalone',
    distDir: '.next',
    trailingSlash: false,
    
    // Bundle analyzer (uncomment to analyze bundle size)
    // bundlePagesRouterDependencies: true,
    
    // Logging configuration
    logging: {
      fetches: {
        fullUrl: true
      }
    }
  }),
  
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Webpack configuration for custom optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // Custom webpack rules
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
      type: 'asset'
    });
    
    // Optimization for production builds
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            enforce: true
          }
        }
      };
    }
    
    // Add bundle analyzer in development
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          analyzerPort: 8888,
          openAnalyzer: true
        })
      );
    }
    
    return config;
  },
  
  // Custom server configuration
  async rewrites() {
    return {
      beforeFiles: [
        // Health check endpoint
        {
          source: '/health',
          destination: '/api/health'
        },
        // RSS feed alternative URLs
        {
          source: '/feed',
          destination: '/rss'
        },
        {
          source: '/feed.xml',
          destination: '/rss'
        }
      ],
      afterFiles: [
        // Static file serving optimizations
        {
          source: '/static/:path*',
          destination: '/_next/static/:path*'
        }
      ],
      fallback: [
        // Fallback for missing pages
        {
          source: '/:path*',
          destination: '/404'
        }
      ]
    };
  }
};

// Conditional configuration based on environment
if (process.env.NODE_ENV === 'production') {
  // Production-specific configurations
  nextConfig.compiler = {
    removeConsole: {
      exclude: ['error', 'warn']
    }
  };
}

// Export configuration
module.exports = nextConfig;