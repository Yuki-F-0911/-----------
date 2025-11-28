/**
 * システム診断API
 * エラーが発生した場合の原因特定を支援
 */

import { NextRequest, NextResponse } from 'next/server'

interface DiagnosticResult {
  category: string
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
  suggestion?: string
}

interface DiagnoseResponse {
  timestamp: string
  overallStatus: 'healthy' | 'degraded' | 'critical'
  diagnostics: DiagnosticResult[]
}

export async function GET(): Promise<NextResponse<DiagnoseResponse>> {
  const diagnostics: DiagnosticResult[] = []

  // 1. データベース接続
  try {
    const { prisma } = await import('@/lib/prisma/client')
    await prisma.$queryRaw`SELECT 1`
    diagnostics.push({
      category: 'データベース',
      name: 'PostgreSQL接続',
      status: 'ok',
      message: 'データベースに正常に接続できます',
    })
  } catch (error) {
    diagnostics.push({
      category: 'データベース',
      name: 'PostgreSQL接続',
      status: 'error',
      message: `接続エラー: ${error instanceof Error ? error.message : String(error)}`,
      suggestion: 'DATABASE_URLが正しく設定されているか確認してください。PostgreSQLサーバーが起動しているか確認してください。',
    })
  }

  // 2. AI要約機能
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasGemini = !!process.env.GEMINI_API_KEY
  
  if (hasOpenAI || hasGemini) {
    diagnostics.push({
      category: 'AI要約',
      name: 'APIキー設定',
      status: 'ok',
      message: `${hasOpenAI ? 'OpenAI' : ''}${hasOpenAI && hasGemini ? ', ' : ''}${hasGemini ? 'Gemini' : ''} APIキーが設定されています`,
    })

    // OpenAI APIテスト
    if (hasOpenAI) {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        })
        if (response.ok) {
          diagnostics.push({
            category: 'AI要約',
            name: 'OpenAI API接続',
            status: 'ok',
            message: 'OpenAI APIに正常に接続できます',
          })
        } else {
          const errorText = await response.text()
          diagnostics.push({
            category: 'AI要約',
            name: 'OpenAI API接続',
            status: 'error',
            message: `API接続エラー: ${response.status}`,
            suggestion: errorText.includes('invalid_api_key') 
              ? 'APIキーが無効です。OpenAI Platformで新しいキーを生成してください。'
              : 'APIキーに問題がある可能性があります。使用量制限や請求情報を確認してください。',
          })
        }
      } catch (error) {
        diagnostics.push({
          category: 'AI要約',
          name: 'OpenAI API接続',
          status: 'error',
          message: `ネットワークエラー: ${error instanceof Error ? error.message : String(error)}`,
          suggestion: 'インターネット接続を確認してください。',
        })
      }
    }

    // Gemini APIテスト
    if (hasGemini) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
        )
        if (response.ok) {
          diagnostics.push({
            category: 'AI要約',
            name: 'Gemini API接続',
            status: 'ok',
            message: 'Gemini APIに正常に接続できます',
          })
        } else {
          diagnostics.push({
            category: 'AI要約',
            name: 'Gemini API接続',
            status: 'error',
            message: `API接続エラー: ${response.status}`,
            suggestion: 'APIキーが無効か、Google Cloud Consoleでの設定に問題がある可能性があります。',
          })
        }
      } catch (error) {
        diagnostics.push({
          category: 'AI要約',
          name: 'Gemini API接続',
          status: 'error',
          message: `ネットワークエラー: ${error instanceof Error ? error.message : String(error)}`,
          suggestion: 'インターネット接続を確認してください。',
        })
      }
    }
  } else {
    diagnostics.push({
      category: 'AI要約',
      name: 'APIキー設定',
      status: 'error',
      message: 'OPENAI_API_KEYまたはGEMINI_API_KEYが設定されていません',
      suggestion: 'レビュー要約機能を使用するには、どちらかのAPIキーを設定してください。',
    })
  }

  // 3. YouTube API
  const hasYouTube = !!(process.env.YOUTUBE_API_KEY || process.env.YouTube_API_Key)
  if (hasYouTube) {
    try {
      const apiKey = process.env.YOUTUBE_API_KEY || process.env.YouTube_API_Key
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${apiKey}`
      )
      if (response.ok) {
        diagnostics.push({
          category: 'YouTube',
          name: 'YouTube Data API',
          status: 'ok',
          message: 'YouTube APIに正常に接続できます',
        })
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error?.message || `HTTPエラー: ${response.status}`
        let suggestion = 'APIキーを確認してください。'
        
        if (errorMessage.includes('API key not valid')) {
          suggestion = 'APIキーが無効です。Google Cloud Consoleで新しいキーを生成してください。'
        } else if (errorMessage.includes('quota')) {
          suggestion = 'APIクォータを超過しています。明日まで待つか、クォータを増やしてください。'
        } else if (errorMessage.includes('API has not been enabled')) {
          suggestion = 'YouTube Data API v3がプロジェクトで有効になっていません。Google Cloud Consoleで有効化してください。'
        }
        
        diagnostics.push({
          category: 'YouTube',
          name: 'YouTube Data API',
          status: 'error',
          message: `APIエラー: ${errorMessage}`,
          suggestion,
        })
      }
    } catch (error) {
      diagnostics.push({
        category: 'YouTube',
        name: 'YouTube Data API',
        status: 'error',
        message: `ネットワークエラー: ${error instanceof Error ? error.message : String(error)}`,
        suggestion: 'インターネット接続を確認してください。',
      })
    }
  } else {
    diagnostics.push({
      category: 'YouTube',
      name: 'YouTube Data API',
      status: 'warning',
      message: 'YOUTUBE_API_KEYが設定されていません',
      suggestion: 'YouTube動画検索機能を使用するにはAPIキーを設定してください。',
    })
  }

  // 4. Web検索API
  const hasSerper = !!process.env.SERPER_API_KEY
  const hasGoogleSearch = !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID)
  
  if (hasSerper || hasGoogleSearch) {
    if (hasSerper) {
      try {
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': process.env.SERPER_API_KEY!,
          },
          body: JSON.stringify({ q: 'test', num: 1 }),
        })
        if (response.ok) {
          diagnostics.push({
            category: 'Web検索',
            name: 'Serper API',
            status: 'ok',
            message: 'Serper APIに正常に接続できます',
          })
        } else {
          diagnostics.push({
            category: 'Web検索',
            name: 'Serper API',
            status: 'error',
            message: `APIエラー: ${response.status}`,
            suggestion: 'APIキーが無効か、クレジットが不足している可能性があります。',
          })
        }
      } catch (error) {
        diagnostics.push({
          category: 'Web検索',
          name: 'Serper API',
          status: 'error',
          message: `ネットワークエラー: ${error instanceof Error ? error.message : String(error)}`,
          suggestion: 'インターネット接続を確認してください。',
        })
      }
    }
  } else {
    diagnostics.push({
      category: 'Web検索',
      name: 'Web検索API',
      status: 'warning',
      message: 'SERPER_API_KEYまたはGOOGLE_SEARCH_API_KEYが設定されていません',
      suggestion: 'Web検索機能を使用するにはAPIキーを設定してください。',
    })
  }

  // 5. Python/FFmpeg（YouTube要約用）
  // サーバーサイドでのPython確認は複雑なため、警告のみ表示
  diagnostics.push({
    category: 'YouTube要約',
    name: 'Python環境',
    status: 'warning',
    message: 'Pythonの確認はサーバーサイドで行えません',
    suggestion: 'ローカルで `python youtube_summarizer.py` を実行して動作確認してください。',
  })

  // 総合ステータスの判定
  const hasError = diagnostics.some(d => d.status === 'error')
  const hasWarning = diagnostics.some(d => d.status === 'warning')
  const overallStatus = hasError ? 'critical' : hasWarning ? 'degraded' : 'healthy'

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    overallStatus,
    diagnostics,
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 特定のエラーの診断
  try {
    const body = await request.json()
    const { errorType, errorMessage } = body

    const suggestions: string[] = []

    // エラータイプに基づく診断
    if (errorMessage) {
      const msg = errorMessage.toLowerCase()
      
      if (msg.includes('database') || msg.includes('prisma') || msg.includes('postgresql')) {
        suggestions.push('DATABASE_URLの設定を確認してください')
        suggestions.push('PostgreSQLサーバーが起動しているか確認してください')
        suggestions.push('データベースのマイグレーションを実行してください: npm run db:migrate')
      }
      
      if (msg.includes('openai') || msg.includes('gpt')) {
        suggestions.push('OPENAI_API_KEYが正しく設定されているか確認してください')
        suggestions.push('OpenAI Platformで使用量制限を確認してください')
        suggestions.push('APIキーに十分なクレジットがあるか確認してください')
      }
      
      if (msg.includes('gemini') || msg.includes('google-ai')) {
        suggestions.push('GEMINI_API_KEYが正しく設定されているか確認してください')
        suggestions.push('Google AI Studioでキーの状態を確認してください')
      }
      
      if (msg.includes('youtube')) {
        suggestions.push('YOUTUBE_API_KEYが正しく設定されているか確認してください')
        suggestions.push('YouTube Data API v3がGoogle Cloud Consoleで有効になっているか確認してください')
        suggestions.push('APIクォータを超過していないか確認してください')
      }
      
      if (msg.includes('ffmpeg')) {
        suggestions.push('FFmpegがインストールされているか確認してください')
        suggestions.push('FFmpegがPATHに追加されているか確認してください')
        suggestions.push('新しいターミナルを開いて再試行してください')
      }
      
      if (msg.includes('whisper') || msg.includes('transcribe')) {
        suggestions.push('openai-whisperがインストールされているか確認: pip install openai-whisper')
        suggestions.push('FFmpegがインストールされているか確認してください')
        suggestions.push('メモリ不足の可能性があります。他のアプリを閉じてください')
      }
      
      if (msg.includes('timeout') || msg.includes('timed out')) {
        suggestions.push('ネットワーク接続を確認してください')
        suggestions.push('しばらく待ってから再試行してください')
        suggestions.push('動画が長すぎる場合、処理に時間がかかります')
      }
      
      if (msg.includes('rate limit') || msg.includes('quota')) {
        suggestions.push('APIの使用量制限に達しています')
        suggestions.push('しばらく待ってから再試行してください')
        suggestions.push('APIプランのアップグレードを検討してください')
      }
    }

    // デフォルトの提案
    if (suggestions.length === 0) {
      suggestions.push('/admin/system ページで環境変数の設定を確認してください')
      suggestions.push('ブラウザの開発者ツールでネットワークエラーを確認してください')
      suggestions.push('サーバーのログを確認してください')
    }

    return NextResponse.json({
      errorType,
      errorMessage,
      suggestions,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      error: '診断リクエストの処理に失敗しました',
      suggestions: ['リクエストの形式を確認してください'],
    }, { status: 400 })
  }
}

