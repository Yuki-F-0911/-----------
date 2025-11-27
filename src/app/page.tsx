import Link from 'next/link'
import { prisma } from '@/lib/prisma/client'
import { Button } from '@/components/ui/Button'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

// 動的レンダリングを強制（ビルド時の静的生成をスキップ）
export const dynamic = 'force-dynamic'

async function getLatestReviews() {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        isPublished: true,
        isDraft: false,
      },
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
            imageUrls: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 6,
    })

    return reviews
  } catch (error) {
    console.error('Failed to fetch reviews:', error)
    // エラーが発生した場合は空配列を返す
    return []
  }
}

export default async function HomePage() {
  const reviews = await getLatestReviews()

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">シューズレビューサイト</h1>
        <p className="mb-8 text-lg text-gray-600">
          様々なシューズのレビューを投稿・閲覧できるプラットフォーム
        </p>
        <div className="flex justify-center space-x-4">
          <Link href="/reviews/new">
            <Button size="lg">レビューを投稿</Button>
          </Link>
          <Link href="/reviews">
            <Button variant="outline" size="lg">
              レビューを閲覧
            </Button>
          </Link>
        </div>
      </section>

      <section className="mb-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">新着レビュー</h2>
          <Link href="/reviews">
            <Button variant="ghost">すべて見る</Button>
          </Link>
        </div>
        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">まだレビューがありません</p>
              <Link href="/reviews/new" className="mt-4 inline-block">
                <Button>最初のレビューを投稿</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}

