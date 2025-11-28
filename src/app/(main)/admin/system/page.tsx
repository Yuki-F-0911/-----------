'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

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

export default function SystemPage() {
  const [envCheck, setEnvCheck] = useState<EnvCheckResponse | null>(null)
  const [testResults, setTestResults] = useState<TestResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)

  useEffect(() => {
    checkEnv()
  }, [])

  async function checkEnv() {
    setLoading(true)
    try {
      const res = await fetch('/api/curation/check-env')
      const data = await res.json()
      setEnvCheck(data)
    } catch (error) {
      console.error('環境変数チェックエラー:', error)
    } finally {
      setLoading(false)
    }
  }

  async function runTests() {
    setTestLoading(true)
    try {
      const res = await fetch('/api/curation/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'Nike Pegasus 41 レビュー' }),
      })
      const data = await res.json()
      setTestResults(data)
    } catch (error) {
      console.error('テスト実行エラー:', error)
    } finally {
      setTestLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'configured':
      case 'success':
        return <Badge className="bg-green-100 text-green-800">✓ 設定済み</Badge>
      case 'missing':
        return <Badge className="bg-yellow-100 text-yellow-800">未設定</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">エラー</Badge>
      case 'skipped':
        return <Badge className="bg-gray-100 text-gray-800">スキップ</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">システム設定確認</h1>
        <p className="mt-2 text-gray-600">
          レビュー収集機能に必要な環境変数とAPI接続状況を確認します
        </p>
      </div>

      {/* サマリー */}
      {envCheck && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>設定状況サマリー</span>
              <Button onClick={checkEnv} disabled={loading} size="sm">
                {loading ? '確認中...' : '再確認'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{envCheck.summary.total}</div>
                <div className="text-sm text-gray-600">総設定項目</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{envCheck.summary.configured}</div>
                <div className="text-sm text-gray-600">設定済み</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{envCheck.summary.missing}</div>
                <div className="text-sm text-gray-600">未設定</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{envCheck.summary.requiredMissing}</div>
                <div className="text-sm text-gray-600">必須項目の未設定</div>
              </div>
            </div>
            {envCheck.summary.requiredMissing > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">
                  ⚠️ 必須の環境変数が{envCheck.summary.requiredMissing}件未設定です。
                  アプリケーションが正常に動作しない可能性があります。
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* API接続テスト */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>API接続テスト</span>
            <Button onClick={runTests} disabled={testLoading}>
              {testLoading ? 'テスト中...' : 'テスト実行'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {testResults ? (
            <div className="space-y-4">
              {testResults.results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : result.status === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.name}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    {result.duration && (
                      <span className="text-sm text-gray-500">{result.duration}ms</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{result.message}</p>
                  {result.data && result.data.items && (
                    <div className="mt-2 text-xs text-gray-500">
                      <details>
                        <summary className="cursor-pointer">取得データを表示</summary>
                        <pre className="mt-2 p-2 bg-white rounded overflow-auto max-h-40">
                          {JSON.stringify(result.data.items, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              「テスト実行」ボタンをクリックして、API接続をテストしてください
            </p>
          )}
        </CardContent>
      </Card>

      {/* 環境変数詳細 */}
      {envCheck && (
        <div className="space-y-6">
          {envCheck.categories.map((category, catIndex) => (
            <Card key={catIndex}>
              <CardHeader>
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          {item.required && (
                            <Badge className="bg-red-100 text-red-800 text-xs">必須</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          <code className="bg-gray-200 px-1 rounded">{item.envKey}</code>
                          <span className="ml-2">{item.description}</span>
                        </div>
                        {item.helpUrl && (
                          <a
                            href={item.helpUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                          >
                            取得方法を見る →
                          </a>
                        )}
                      </div>
                      <div>{getStatusBadge(item.status)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* APIキー取得ガイド */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>📖 APIキー取得ガイド</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">1. OpenAI APIキー（推奨）</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>
                  <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    OpenAI Platform
                  </a>
                  にアクセス
                </li>
                <li>アカウントを作成またはログイン</li>
                <li>「API keys」→「Create new secret key」をクリック</li>
                <li>生成されたキーを<code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY</code>に設定</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">2. Gemini APIキー（代替）</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>
                  <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Google AI Studio
                  </a>
                  にアクセス
                </li>
                <li>Googleアカウントでログイン</li>
                <li>「Get API key」→「Create API key」をクリック</li>
                <li>生成されたキーを<code className="bg-gray-100 px-1 rounded">GEMINI_API_KEY</code>に設定</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">3. YouTube APIキー</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>
                  <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Google Cloud Console
                  </a>
                  にアクセス
                </li>
                <li>新しいプロジェクトを作成</li>
                <li>「APIとサービス」→「ライブラリ」→「YouTube Data API v3」を有効化</li>
                <li>「認証情報」→「認証情報を作成」→「APIキー」を選択</li>
                <li>生成されたキーを<code className="bg-gray-100 px-1 rounded">YOUTUBE_API_KEY</code>に設定</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">4. Serper APIキー（Web検索）</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>
                  <a href="https://serper.dev/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Serper.dev
                  </a>
                  にアクセス
                </li>
                <li>アカウントを作成</li>
                <li>ダッシュボードからAPIキーをコピー</li>
                <li>生成されたキーを<code className="bg-gray-100 px-1 rounded">SERPER_API_KEY</code>に設定</li>
              </ol>
              <p className="text-sm text-gray-500 mt-2">
                ※ Serperは月2,500回まで無料で利用可能です
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">5. 楽天API</h3>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>
                  <a href="https://webservice.rakuten.co.jp/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    楽天Webサービス
                  </a>
                  にアクセス
                </li>
                <li>楽天IDでログインまたはアカウント作成</li>
                <li>「アプリ新規登録」からアプリを作成</li>
                <li>アプリケーションIDを<code className="bg-gray-100 px-1 rounded">RAKUTEN_APPLICATION_ID</code>に設定</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

