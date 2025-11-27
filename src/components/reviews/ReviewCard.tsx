import Link from 'next/link'
import Image from 'next/image'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import type { Review } from '@/types/review'
import { formatDate } from '@/lib/utils/date'
import type { Prisma } from '@prisma/client'

// Prismaから返される型を受け入れる
type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: {
    user: {
      select: {
        id: true
        username: true
        displayName: true
        avatarUrl: true
      }
    }
    shoe: {
      select: {
        id: true
        brand: true
        modelName: true
        category: true
        imageUrls: true
      }
    }
    _count: {
      select: {
        likes: true
        comments: true
      }
    }
  }
}>

interface ReviewCardProps {
  review: ReviewWithRelations
}

export function ReviewCard({ review }: ReviewCardProps) {
  const shoe = review.shoe
  const user = review.user

  const shoeImageUrl = shoe?.imageUrls && shoe.imageUrls.length > 0 ? shoe.imageUrls[0] : null

  return (
    <Link href={`/reviews/${review.id}`}>
      <Card className="h-full transition-shadow hover:shadow-lg">
        {shoeImageUrl && (
          <div className="relative h-48 w-full overflow-hidden bg-gray-100">
            <Image
              src={shoeImageUrl}
              alt={`${shoe.brand} ${shoe.modelName}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-xs text-white">
                画像提供: {shoe.brand}（著作権は各ブランドに帰属します）
              </p>
            </div>
          </div>
        )}
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{review.title}</h3>
              {shoe && (
                <p className="mt-1 text-sm text-gray-600">
                  {shoe.brand} {shoe.modelName}
                </p>
              )}
            </div>
            <div className="ml-4 flex flex-col items-end">
              <div className="text-2xl font-bold text-gray-900">
                {parseFloat(String(review.overallRating)).toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">/10.0</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3 text-sm text-gray-600">{review.content}</p>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {user && (
                <>
                  <Avatar src={user.avatarUrl} fallback={user.displayName[0]} />
                  <span className="text-sm text-gray-700">{user.displayName}</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              {review._count && (
                <>
                  <span>いいね {review._count.likes}</span>
                  <span>コメント {review._count.comments}</span>
                </>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {review.type === 'AI' && <Badge variant="secondary">AI</Badge>}
            {shoe && <Badge variant="outline">{shoe.category}</Badge>}
          </div>
          <p className="mt-2 text-xs text-gray-500">{formatDate(review.createdAt)}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

