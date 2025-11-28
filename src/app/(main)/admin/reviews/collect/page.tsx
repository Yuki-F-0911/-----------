'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Shoe {
  id: string
  brand: string
  modelName: string
  category: string
}

interface CollectResult {
  success: boolean
  data?: {
    reviewId: string
    aiSource: any
    message: string
  }
  error?: string
  details?: string
}

export default function CollectReviewsPage() {
  const [shoes, setShoes] = useState<Shoe[]>([])
  const [selectedShoe, setSelectedShoe] = useState<string>('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CollectResult | null>(null)
  const [shoesLoading, setShoesLoading] = useState(true)

  useEffect(() => {
    fetchShoes()
  }, [])

  async function fetchShoes() {
    setShoesLoading(true)
    try {
      const res = await fetch('/api/shoes?limit=100')
      const data = await res.json()
      setShoes(data.data || [])
    } catch (error) {
      console.error('シューズ取得エラー:', error)
    } finally {
      setShoesLoading(false)
    }
  }

  async function handleCollect() {
    if (!selectedShoe || !sourceUrl) {
      alert('シューズとURLを選択してください')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      // URLの種類を判定
      const isYouTube = sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be')
      const sourceType = isYouTube ? 'YOUTUBE_VIDEO' : 'WEB_ARTICLE'

      const res = await fetch('/api/admin/reviews/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shoeId: selectedShoe,
          sourceType,
          sourceUrl,
        }),
      })

      const data = await res.json()
      
      if (res.ok) {
        setResult({ success: true, data })
        setSourceUrl('')
      } else {
        setResult({ success: false, error: data.error, details: data.details })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'エラーが発生しました',
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedShoeData = shoes.find(s => s.id === selectedShoe)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">レビュー収集</h1>
          <p className="text-slate-600">
            YouTube動画からレビュー情報を収集し、AI要約レビューを生成します
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 収集フォーム */}
          <Card>
            <CardHeader>
              <CardTitle>情報源を追加</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* シューズ選択 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  シューズを選択 *
                </label>
                {shoesLoading ? (
                  <div className="h-10 bg-slate-100 rounded-lg animate-pulse"></div>
                ) : (
                  <select
                    value={selectedShoe}
                    onChange={(e) => setSelectedShoe(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">選択してください</option>
                    {shoes.map((shoe) => (
                      <option key={shoe.id} value={shoe.id}>
                        {shoe.brand} {shoe.modelName} ({shoe.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* URL入力 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  YouTube動画URL *
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-sm text-slate-500 mt-2">
                  ※ 現在はYouTube動画のみ対応しています（Web記事は著作権保護のため無効化）
                </p>
              </div>

              {/* 実行ボタン */}
              <Button
                onClick={handleCollect}
                disabled={loading || !selectedShoe || !sourceUrl}
                className="w-full"
              >
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    収集中...（文字起こし処理のため数分かかります）
                  </>
                ) : (
                  '動画を要約して収集'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 結果表示 */}
          <Card>
            <CardHeader>
              <CardTitle>収集結果</CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                result.success ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-100 text-green-800">✓ 成功</Badge>
                    </div>
                    <p className="text-green-800 mb-4">{result.data?.message}</p>
                    {result.data?.aiSource && (
                      <div className="space-y-2 text-sm">
                        <p><strong>タイトル:</strong> {result.data.aiSource.sourceTitle}</p>
                        <p><strong>チャンネル:</strong> {result.data.aiSource.sourceAuthor}</p>
                        {result.data.aiSource.summary && (
                          <div>
                            <strong>要約:</strong>
                            <p className="mt-1 p-2 bg-white rounded text-slate-700">
                              {result.data.aiSource.summary}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-4">
                      <a
                        href="/admin/reviews/summarize"
                        className="text-indigo-600 hover:underline text-sm"
                      >
                        → 統合レビューを生成する
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-red-100 text-red-800">✗ エラー</Badge>
                    </div>
                    <p className="text-red-800">{result.error}</p>
                    {result.details && (
                      <p className="text-sm text-red-600 mt-2">{result.details}</p>
                    )}
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>収集結果がここに表示されます</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 選択中のシューズ情報 */}
        {selectedShoeData && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>選択中のシューズ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-2xl">
                  👟
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedShoeData.brand} {selectedShoeData.modelName}</h3>
                  <p className="text-slate-600">{selectedShoeData.category}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 使い方ガイド */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>📖 使い方</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <ol className="list-decimal list-inside space-y-2 text-slate-600">
              <li>レビューを収集したいシューズを選択します</li>
              <li>YouTube動画のURLを入力します（レビュー動画を推奨）</li>
              <li>「動画を要約して収集」ボタンをクリックします</li>
              <li>処理が完了したら、「統合レビューを生成」で複数のソースを1つの要約にまとめます</li>
            </ol>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                <strong>⚠️ 注意:</strong> YouTube動画の文字起こしには数分かかる場合があります。
                処理中はページを閉じないでください。
              </p>
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>💡 ヒント:</strong> 複数の動画から情報を収集し、
                AIで統合することでより信頼性の高いレビューが生成できます。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

