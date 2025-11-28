/**
 * レビュー収集機能テストAPI
 * 各APIの接続テストを実行
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchYouTubeVideos } from '@/lib/ai/youtube-search'
import { searchWebArticles } from '@/lib/ai/web-search'

interface TestResult {
  name: string
  status: 'success' | 'error' | 'skipped'
  message: string
  duration?: number
  data?: any
}

interface TestResponse {
  success: boolean
  timestamp: string
  results: TestResult[]
}

export async function POST(request: NextRequest): Promise<NextResponse<TestResponse>> {
  const results: TestResult[] = []
  
  try {
    const body = await request.json()
    const { testType, query } = body
    const testQuery = query || 'Nike Pegasus 41 レビュー'

    // YouTube API テスト
    if (!testType || testType === 'youtube') {
      const startTime = Date.now()
      try {
        if (!process.env.YOUTUBE_API_KEY && !process.env.YouTube_API_Key) {
          results.push({
            name: 'YouTube API',
            status: 'skipped',
            message: 'YOUTUBE_API_KEYが設定されていません',
          })
        } else {
          const response = await searchYouTubeVideos(testQuery, 3)
          results.push({
            name: 'YouTube API',
            status: 'success',
            message: `${response.items.length}件の動画を取得しました`,
            duration: Date.now() - startTime,
            data: {
              totalResults: response.totalResults,
              items: response.items.map(item => ({
                title: item.title,
                channel: item.channelTitle,
                url: item.url,
              })),
            },
          })
        }
      } catch (error) {
        results.push({
          name: 'YouTube API',
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        })
      }
    }

    // Web検索API テスト
    if (!testType || testType === 'web') {
      const startTime = Date.now()
      try {
        const hasSerper = !!process.env.SERPER_API_KEY
        const hasGoogle = !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID)
        
        if (!hasSerper && !hasGoogle) {
          results.push({
            name: 'Web検索API',
            status: 'skipped',
            message: 'SERPER_API_KEYまたはGOOGLE_SEARCH_API_KEYが設定されていません',
          })
        } else {
          const response = await searchWebArticles(testQuery, 5)
          results.push({
            name: 'Web検索API',
            status: 'success',
            message: `${response.items.length}件の記事を取得しました`,
            duration: Date.now() - startTime,
            data: {
              totalResults: response.totalResults,
              provider: hasSerper ? 'Serper' : 'Google',
              items: response.items.map(item => ({
                title: item.title,
                url: item.url,
                snippet: item.snippet?.substring(0, 100) + '...',
              })),
            },
          })
        }
      } catch (error) {
        results.push({
          name: 'Web検索API',
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        })
      }
    }

    // OpenAI API テスト
    if (!testType || testType === 'openai') {
      const startTime = Date.now()
      try {
        if (!process.env.OPENAI_API_KEY) {
          results.push({
            name: 'OpenAI API',
            status: 'skipped',
            message: 'OPENAI_API_KEYが設定されていません',
          })
        } else {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          })
          
          if (response.ok) {
            results.push({
              name: 'OpenAI API',
              status: 'success',
              message: 'APIキーが有効です',
              duration: Date.now() - startTime,
            })
          } else {
            const error = await response.text()
            results.push({
              name: 'OpenAI API',
              status: 'error',
              message: `APIエラー: ${error}`,
              duration: Date.now() - startTime,
            })
          }
        }
      } catch (error) {
        results.push({
          name: 'OpenAI API',
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        })
      }
    }

    // Gemini API テスト
    if (!testType || testType === 'gemini') {
      const startTime = Date.now()
      try {
        if (!process.env.GEMINI_API_KEY) {
          results.push({
            name: 'Gemini API',
            status: 'skipped',
            message: 'GEMINI_API_KEYが設定されていません',
          })
        } else {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
          )
          
          if (response.ok) {
            results.push({
              name: 'Gemini API',
              status: 'success',
              message: 'APIキーが有効です',
              duration: Date.now() - startTime,
            })
          } else {
            const error = await response.text()
            results.push({
              name: 'Gemini API',
              status: 'error',
              message: `APIエラー: ${error}`,
              duration: Date.now() - startTime,
            })
          }
        }
      } catch (error) {
        results.push({
          name: 'Gemini API',
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        })
      }
    }

    // データベース接続テスト
    if (!testType || testType === 'database') {
      const startTime = Date.now()
      try {
        const { prisma } = await import('@/lib/prisma/client')
        const count = await prisma.shoe.count()
        results.push({
          name: 'データベース接続',
          status: 'success',
          message: `接続成功 - ${count}件のシューズが登録されています`,
          duration: Date.now() - startTime,
        })
      } catch (error) {
        results.push({
          name: 'データベース接続',
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        })
      }
    }

    const allSuccess = results.every(r => r.status === 'success' || r.status === 'skipped')

    return NextResponse.json({
      success: allSuccess,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      results: [{
        name: 'テスト実行',
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      }],
    })
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'POSTメソッドを使用してテストを実行してください',
    usage: {
      method: 'POST',
      body: {
        testType: 'youtube | web | openai | gemini | database（省略時は全テスト）',
        query: '検索テスト用のクエリ（省略時: Nike Pegasus 41 レビュー）',
      },
    },
  })
}

