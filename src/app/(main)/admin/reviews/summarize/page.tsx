'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Review {
  id: string
  title: string
  type: string
  isDraft: boolean
  isPublished: boolean
  sourceCount: number
  overallRating: string
  createdAt: string
  shoe: {
    id: string
    brand: string
    modelName: string
    category: string
  }
  aiSources: {
    id: string
    sourceType: string
    sourceUrl: string
    sourceTitle: string
    sourceAuthor: string
    summary: string
  }[]
}

interface SummarizeResult {
  success: boolean
  data?: {
    review: any
    message: string
  }
  error?: string
}

export default function SummarizeReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [summarizing, setSummarizing] = useState<string | null>(null)
  const [result, setResult] = useState<SummarizeResult | null>(null)

  useEffect(() => {
    fetchDraftReviews()
  }, [])

  async function fetchDraftReviews() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reviews?type=AI_SUMMARY&draft=true')
      const data = await res.json()
      setReviews(data.data?.items || [])
    } catch (error) {
      console.error('レビュー取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSummarize(reviewId: string) {
    setSummarizing(reviewId)
    setResult(null)

    try {
      const res = await fetch('/api/admin/reviews/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId }),
      })

      const data = await res.json()

      if (res.ok) {
        setResult({ success: true, data })
        fetchDraftReviews() // リストを更新
      } else {
        setResult({ success: false, error: data.error })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'エラーが発生しました',
      })
    } finally {
      setSummarizing(null)
    }
  }

  async function handlePublish(reviewId: string) {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: true, isDraft: false }),
      })

      if (res.ok) {
        fetchDraftReviews()
        alert('レビューを公開しました')
      } else {
        const data = await res.json()
        alert(data.error || '公開に失敗しました')
      }
    } catch (error) {
      console.error('公開エラー:', error)
      alert('エラーが発生しました')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">レビュー要約・公開</h1>
          <p className="text-slate-600">
            収集した情報源を統合し、AI要約レビューを生成・公開します
          </p>
        </div>

        {/* 結果表示 */}
        {result && (
          <Card className="mb-8">
            <CardContent className="py-4">
              {result.success ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Badge className="bg-green-100 text-green-800 mb-2">✓ 要約完了</Badge>
                  <p className="text-green-800">{result.data?.message}</p>
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <Badge className="bg-red-100 text-red-800 mb-2">✗ エラー</Badge>
                  <p className="text-red-800">{result.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 下書きレビュー一覧 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>下書きレビュー一覧</span>
              <Button onClick={fetchDraftReviews} size="sm" disabled={loading}>
                {loading ? '読込中...' : '更新'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>要約待ちのレビューがありません</p>
                <a
                  href="/admin/reviews/collect"
                  className="text-indigo-600 hover:underline text-sm mt-2 inline-block"
                >
                  → レビューを収集する
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 border border-slate-200 rounded-lg hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-slate-800">
                            {review.shoe.brand} {review.shoe.modelName}
                          </h3>
                          <Badge className="bg-slate-100 text-slate-700">
                            {review.shoe.category}
                          </Badge>
                          {review.isDraft && (
                            <Badge className="bg-yellow-100 text-yellow-800">下書き</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{review.title}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span>情報源: {review.sourceCount}件</span>
                          <span>評価: {parseFloat(review.overallRating).toFixed(1)}/10</span>
                          <span>作成: {new Date(review.createdAt).toLocaleDateString('ja-JP')}</span>
                        </div>

                        {/* 情報源一覧 */}
                        {review.aiSources && review.aiSources.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-slate-700 mb-2">収集した情報源:</p>
                            <div className="space-y-2">
                              {review.aiSources.map((source) => (
                                <div
                                  key={source.id}
                                  className="text-sm p-2 bg-slate-50 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <Badge className="text-xs">
                                      {source.sourceType === 'YOUTUBE_VIDEO' ? '🎬 YouTube' : '📄 記事'}
                                    </Badge>
                                    <a
                                      href={source.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:underline truncate"
                                    >
                                      {source.sourceTitle || source.sourceUrl}
                                    </a>
                                  </div>
                                  {source.sourceAuthor && (
                                    <p className="text-slate-500 mt-1">by {source.sourceAuthor}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          onClick={() => handleSummarize(review.id)}
                          disabled={summarizing === review.id}
                          size="sm"
                        >
                          {summarizing === review.id ? '要約中...' : '要約を生成'}
                        </Button>
                        {!review.isDraft && (
                          <Button
                            onClick={() => handlePublish(review.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            公開する
                          </Button>
                        )}
                        <a
                          href={`/reviews/${review.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:underline text-center"
                        >
                          プレビュー
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使い方ガイド */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>📖 要約フロー</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <ol className="list-decimal list-inside space-y-2 text-slate-600">
              <li>「レビュー収集」ページで複数のYouTube動画から情報を収集します</li>
              <li>このページで「要約を生成」ボタンをクリックすると、AIが情報を統合します</li>
              <li>生成された要約を確認し、問題なければ「公開する」をクリックします</li>
            </ol>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>💡 ヒント:</strong> 情報源が多いほど、より信頼性の高い要約が生成されます。
                最低3つ以上の情報源を収集することを推奨します。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

