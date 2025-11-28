/**
 * 環境変数チェックAPI
 * レビュー収集機能に必要な環境変数の設定状況を確認
 */

import { NextResponse } from 'next/server'

interface EnvCheckResult {
  name: string
  envKey: string
  status: 'configured' | 'missing' | 'invalid'
  required: boolean
  description: string
  helpUrl?: string
}

interface EnvCheckResponse {
  success: boolean
  timestamp: string
  summary: {
    total: number
    configured: number
    missing: number
    requiredMissing: number
  }
  categories: {
    name: string
    items: EnvCheckResult[]
  }[]
}

export async function GET(): Promise<NextResponse<EnvCheckResponse>> {
  const checks: { category: string; items: EnvCheckResult[] }[] = []

  // データベース接続
  const databaseChecks: EnvCheckResult[] = [
    {
      name: 'PostgreSQL接続URL',
      envKey: 'DATABASE_URL',
      status: process.env.DATABASE_URL ? 'configured' : 'missing',
      required: true,
      description: 'PostgreSQLデータベースへの接続文字列',
      helpUrl: 'https://www.prisma.io/docs/concepts/database-connectors/postgresql',
    },
  ]
  checks.push({ category: 'データベース', items: databaseChecks })

  // 認証設定
  const authChecks: EnvCheckResult[] = [
    {
      name: 'NextAuth シークレット',
      envKey: 'NEXTAUTH_SECRET',
      status: process.env.NEXTAUTH_SECRET ? 'configured' : 'missing',
      required: true,
      description: 'セッション暗号化用のシークレットキー',
      helpUrl: 'https://next-auth.js.org/configuration/options#secret',
    },
    {
      name: 'サイトURL',
      envKey: 'NEXTAUTH_URL',
      status: process.env.NEXTAUTH_URL ? 'configured' : 'missing',
      required: true,
      description: 'サイトのベースURL（本番環境で必要）',
    },
  ]
  checks.push({ category: '認証', items: authChecks })

  // AI要約機能
  const aiChecks: EnvCheckResult[] = [
    {
      name: 'OpenAI APIキー',
      envKey: 'OPENAI_API_KEY',
      status: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
      required: false,
      description: 'GPT-4を使用したレビュー要約（推奨）',
      helpUrl: 'https://platform.openai.com/api-keys',
    },
    {
      name: 'Gemini APIキー',
      envKey: 'GEMINI_API_KEY',
      status: process.env.GEMINI_API_KEY ? 'configured' : 'missing',
      required: false,
      description: 'Google Geminiを使用したレビュー要約（代替）',
      helpUrl: 'https://aistudio.google.com/app/apikey',
    },
  ]
  
  // AI要約のどちらかが必要
  const hasAiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY
  if (!hasAiKey) {
    aiChecks[0].status = 'missing'
    aiChecks[1].status = 'missing'
  }
  
  checks.push({ category: 'AI要約機能', items: aiChecks })

  // Web検索機能
  const searchChecks: EnvCheckResult[] = [
    {
      name: 'Serper APIキー',
      envKey: 'SERPER_API_KEY',
      status: process.env.SERPER_API_KEY ? 'configured' : 'missing',
      required: false,
      description: 'Serper.dev Web検索API（推奨・簡単）',
      helpUrl: 'https://serper.dev/',
    },
    {
      name: 'Google Search APIキー',
      envKey: 'GOOGLE_SEARCH_API_KEY',
      status: process.env.GOOGLE_SEARCH_API_KEY ? 'configured' : 'missing',
      required: false,
      description: 'Google Custom Search API',
      helpUrl: 'https://console.cloud.google.com/apis/credentials',
    },
    {
      name: 'Google検索エンジンID',
      envKey: 'GOOGLE_SEARCH_ENGINE_ID',
      status: process.env.GOOGLE_SEARCH_ENGINE_ID ? 'configured' : 'missing',
      required: false,
      description: 'Programmable Search Engine ID',
      helpUrl: 'https://programmablesearchengine.google.com/',
    },
  ]
  checks.push({ category: 'Web検索', items: searchChecks })

  // YouTube機能
  const youtubeChecks: EnvCheckResult[] = [
    {
      name: 'YouTube APIキー',
      envKey: 'YOUTUBE_API_KEY',
      status: (process.env.YOUTUBE_API_KEY || process.env.YouTube_API_Key) ? 'configured' : 'missing',
      required: false,
      description: 'YouTube Data API v3',
      helpUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
    },
  ]
  checks.push({ category: 'YouTube検索', items: youtubeChecks })

  // 画像アップロード（Cloudinary）
  const cloudinaryChecks: EnvCheckResult[] = [
    {
      name: 'Cloudinary クラウド名',
      envKey: 'CLOUDINARY_CLOUD_NAME',
      status: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'missing',
      required: false,
      description: 'Cloudinaryのクラウド名',
      helpUrl: 'https://cloudinary.com/console',
    },
    {
      name: 'Cloudinary APIキー',
      envKey: 'CLOUDINARY_API_KEY',
      status: process.env.CLOUDINARY_API_KEY ? 'configured' : 'missing',
      required: false,
      description: 'CloudinaryのAPIキー',
    },
    {
      name: 'Cloudinary APIシークレット',
      envKey: 'CLOUDINARY_API_SECRET',
      status: process.env.CLOUDINARY_API_SECRET ? 'configured' : 'missing',
      required: false,
      description: 'CloudinaryのAPIシークレット',
    },
  ]
  checks.push({ category: '画像アップロード（Cloudinary）', items: cloudinaryChecks })

  // 画像ストレージ（Supabase）
  const supabaseChecks: EnvCheckResult[] = [
    {
      name: 'Supabase URL',
      envKey: 'SUPABASE_URL',
      status: process.env.SUPABASE_URL ? 'configured' : 'missing',
      required: false,
      description: 'SupabaseプロジェクトのURL',
      helpUrl: 'https://supabase.com/dashboard/project/_/settings/api',
    },
    {
      name: 'Supabase サービスロールキー',
      envKey: 'SUPABASE_SERVICE_ROLE_KEY',
      status: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
      required: false,
      description: 'Supabaseのサービスロールキー',
    },
    {
      name: 'Supabase バケット名',
      envKey: 'SUPABASE_BUCKET_SHOES',
      status: process.env.SUPABASE_BUCKET_SHOES ? 'configured' : 'missing',
      required: false,
      description: '画像保存用のストレージバケット名',
    },
  ]
  checks.push({ category: '画像ストレージ（Supabase）', items: supabaseChecks })

  // 楽天API
  const rakutenChecks: EnvCheckResult[] = [
    {
      name: '楽天 アプリケーションID',
      envKey: 'RAKUTEN_APPLICATION_ID',
      status: process.env.RAKUTEN_APPLICATION_ID ? 'configured' : 'missing',
      required: false,
      description: '楽天市場商品検索API',
      helpUrl: 'https://webservice.rakuten.co.jp/',
    },
    {
      name: '楽天 アフィリエイトID',
      envKey: 'RAKUTEN_AFFILIATE_ID',
      status: process.env.RAKUTEN_AFFILIATE_ID ? 'configured' : 'missing',
      required: false,
      description: '楽天アフィリエイトID（オプション）',
    },
  ]
  checks.push({ category: '楽天API', items: rakutenChecks })

  // サマリーを計算
  const allItems = checks.flatMap(c => c.items)
  const configured = allItems.filter(i => i.status === 'configured').length
  const missing = allItems.filter(i => i.status === 'missing').length
  const requiredMissing = allItems.filter(i => i.required && i.status === 'missing').length

  return NextResponse.json({
    success: requiredMissing === 0,
    timestamp: new Date().toISOString(),
    summary: {
      total: allItems.length,
      configured,
      missing,
      requiredMissing,
    },
    categories: checks.map(c => ({
      name: c.category,
      items: c.items,
    })),
  })
}

