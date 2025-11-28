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
    remotePatterns: [
      // Cloudinary
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      // 楽天
      {
        protocol: 'https',
        hostname: 'thumbnail.image.rakuten.co.jp',
      },
      {
        protocol: 'https',
        hostname: 'shop.r10s.jp',
      },
      // Amazon
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      // YouTube
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      // Reddit
      {
        protocol: 'https',
        hostname: 'i.redd.it',
      },
      {
        protocol: 'https',
        hostname: 'preview.redd.it',
      },
      // Imgur
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
      },
      // ブランド公式サイト
      {
        protocol: 'https',
        hostname: '*.nike.com',
      },
      {
        protocol: 'https',
        hostname: '*.adidas.com',
      },
      {
        protocol: 'https',
        hostname: '*.asics.com',
      },
      // Google
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // GitHub
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
    // 画像の最適化を有効化
    formats: ['image/avif', 'image/webp'],
    // 画像サイズの設定
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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

