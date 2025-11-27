/** @type {import('next').NextConfig} */
const nextConfig = {
  // 本番環境での最適化設定
  reactStrictMode: true,
  swcMinify: true,
  
  // webpack設定: cheerioとundiciをサーバーサイドのみで使用
  webpack: (config, { isServer }) => {
    if (isServer) {
      // サーバーサイド: undiciを外部化（Node.jsの組み込みモジュールとして扱う）
      // cheerioは動的インポートで使用されるため、webpackのバンドルから除外される
      const originalExternals = config.externals
      config.externals = [
        ...(Array.isArray(originalExternals) ? originalExternals : [originalExternals]),
        ({ request }, callback) => {
          // undiciを含むすべてのリクエストを外部化
          if (request && (request.includes('undici') || request === 'undici')) {
            return callback(null, `commonjs ${request}`)
          }
          callback()
        }
      ]
    } else {
      // クライアントサイドではcheerioとundiciを使用しない
      config.resolve.fallback = {
        ...config.resolve.fallback,
        cheerio: false,
        undici: false,
      }
    }
    return config
  },
  
  // 画像の最適化設定
  images: {
    domains: ['res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      // シューズブランドの公式サイトなど、必要に応じて追加
      // {
      //   protocol: 'https',
      //   hostname: 'example.com',
      // },
    ],
    // 画像の最適化を有効化
    formats: ['image/avif', 'image/webp'],
  },

  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
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
            value: 'origin-when-cross-origin'
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig

