import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { ReviewRating } from '@/components/reviews/ReviewRating'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils/date'
import Image from 'next/image'

async function getReview(id: string) {
  try {
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        shoe: {
          select: {
            id: true,
            brand: true,
            modelName: true,
            category: true,
            releaseYear: true,
            officialPrice: true,
          },
        },
        aiSources: {
          orderBy: {
            scrapedAt: 'desc',
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    })

    return review
  } catch (error) {
    console.error('Failed to fetch review:', error)
    return null
  }
}

export default async function ReviewDetailPage({ params }: { params: { id: string } }) {
  const review = await getReview(params.id)

  if (!review || (!review.isPublished && !review.isDraft)) {
    notFound()
  }

  const shoe = review.shoe
  const user = review.user

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl">{review.title}</CardTitle>
                  {shoe && (
                    <p className="mt-2 text-lg text-gray-600">
                      {shoe.brand} {shoe.modelName}
                    </p>
                  )}
                </div>
                <div className="ml-4 text-right">
                  <div className="text-4xl font-bold text-gray-900">
                    {parseFloat(String(review.overallRating)).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-500">/10.0</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                {review.comfortRating && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">履き心地</span>
                      <ReviewRating rating={parseFloat(String(review.comfortRating))} showNumber />
                    </div>
                  </div>
                )}
                {review.designRating && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">デザイン</span>
                      <ReviewRating rating={parseFloat(String(review.designRating))} showNumber />
                    </div>
                  </div>
                )}
                {review.durabilityRating && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">耐久性</span>
                      <ReviewRating rating={parseFloat(String(review.durabilityRating))} showNumber />
                    </div>
                  </div>
                )}
              </div>

              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-gray-700">{review.content}</p>
              </div>

              {review.imageUrls.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {review.imageUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square overflow-hidden rounded-lg">
                      <Image
                        src={url}
                        alt={`Review image ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {review.pros.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">長所</h3>
                  <ul className="list-disc space-y-1 pl-5 text-gray-700">
                    {review.pros.map((pro, index) => (
                      <li key={index}>{pro}</li>
                    ))}
                  </ul>
                </div>
              )}

              {review.cons.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">短所</h3>
                  <ul className="list-disc space-y-1 pl-5 text-gray-700">
                    {review.cons.map((con, index) => (
                      <li key={index}>{con}</li>
                    ))}
                  </ul>
                </div>
              )}

              {review.usagePeriod && (
                <div className="mt-6">
                  <span className="text-sm text-gray-600">使用期間: {review.usagePeriod}</span>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                {review.type === 'AI_SUMMARY' && (
                  <Badge variant="secondary">AI要約（{review.sourceCount}件の情報源から）</Badge>
                )}
                {review.recommendedFor && (
                  <Badge variant="outline">推奨: {review.recommendedFor}</Badge>
                )}
                {shoe && <Badge variant="outline">{shoe.category}</Badge>}
              </div>

              {review.type === 'AI_SUMMARY' && review.aiSources && review.aiSources.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">情報源</h3>
                  <div className="space-y-3">
                    {review.aiSources.map((source) => (
                      <div
                        key={source.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {source.sourceType === 'YOUTUBE_VIDEO' ? 'YouTube動画' : 'Web記事'}
                              </Badge>
                              <a
                                href={source.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 hover:underline"
                              >
                                {source.sourceTitle || 'タイトル不明'}
                              </a>
                            </div>
                            {source.sourceAuthor && (
                              <p className="mt-1 text-xs text-gray-600">
                                著者: {source.sourceAuthor}
                              </p>
                            )}
                            {source.summary && (
                              <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                                {source.summary}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                              収集日: {formatDate(source.scrapedAt)}
                            </p>
                          </div>
                        </div>
                        {source.youtubeVideoId && (
                          <div className="mt-4">
                            <iframe
                              width="100%"
                              height="200"
                              src={`https://www.youtube.com/embed/${source.youtubeVideoId}`}
                              title={source.sourceTitle || 'YouTube動画'}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-gray-500">
                    ※ このレビューは複数の情報源からAIによって要約・統合されたものです。
                    各情報源へのリンクをクリックして、元のレビューを確認できます。
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
                <div className="flex items-center space-x-3">
                  {user && (
                    <>
                      <Avatar src={user.avatarUrl} fallback={user.displayName[0]} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(review.createdAt)}
                  {review.updatedAt.getTime() !== review.createdAt.getTime() && (
                    <span className="ml-2">(更新済み)</span>
                  )}
                </div>
              </div>

              {review._count && (
                <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                  <span>いいね {review._count.likes}</span>
                  <span>コメント {review._count.comments}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          {shoe && (
            <Card>
              <CardHeader>
                <CardTitle>シューズ情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">ブランド</span>
                    <p className="text-gray-900">{shoe.brand}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">モデル名</span>
                    <p className="text-gray-900">{shoe.modelName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">カテゴリー</span>
                    <p className="text-gray-900">{shoe.category}</p>
                  </div>
                  {shoe.releaseYear && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">発売年</span>
                      <p className="text-gray-900">{shoe.releaseYear}</p>
                    </div>
                  )}
                  {shoe.officialPrice && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">価格</span>
                      <p className="text-gray-900">¥{shoe.officialPrice.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

