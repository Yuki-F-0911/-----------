import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma/client'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

async function getShoe(id: string) {
  try {
    const shoe = await prisma.shoe.findUnique({
      where: { id },
      include: {
        reviews: {
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
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    })

    return shoe
  } catch (error) {
    console.error('Failed to fetch shoe:', error)
    return null
  }
}

export default async function ShoeDetailPage({ params }: { params: { id: string } }) {
  const shoe = await getShoe(params.id)

  if (!shoe) {
    notFound()
  }

  const averageRating =
    shoe.reviews.length > 0
      ? shoe.reviews.reduce((sum, review) => {
          const rating = typeof review.overallRating === 'number' 
            ? review.overallRating 
            : parseFloat(String(review.overallRating)) || 0
          return sum + rating
        }, 0) / shoe.reviews.length
      : 0

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl">{shoe.brand}</CardTitle>
              <p className="mt-2 text-xl text-gray-600">{shoe.modelName}</p>
            </div>
            <Badge variant="outline">{shoe.category}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            {shoe._count && (
              <div>
                <span className="text-sm font-medium text-gray-700">レビュー数</span>
                <p className="text-gray-900">{shoe._count.reviews}件</p>
              </div>
            )}
            {averageRating > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-700">平均評価</span>
                <p className="text-gray-900">{averageRating.toFixed(1)} / 10.0</p>
              </div>
            )}
          </div>
          {shoe.description && (
            <div className="mt-4">
              <p className="text-gray-700">{shoe.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-6 text-2xl font-bold text-gray-900">レビュー</h2>
        {shoe.reviews.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shoe.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">このシューズのレビューはまだありません</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

