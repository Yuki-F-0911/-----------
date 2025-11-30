import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { prisma } from '@/lib/prisma/client'
import { ReviewCard } from '@/components/reviews/ReviewCard'
import { Badge } from '@/components/ui/Badge'
import { RatingRadarChart } from '@/components/shoes/RatingRadarChart'
import { ProsConsList } from '@/components/shoes/ProsConsList'
import { generateProductSchema, generateBreadcrumbSchema, combineSchemas } from '@/lib/seo/structured-data'
import { generateShoeMetadata } from '@/lib/seo/metadata'
import { generatePriceComparisonLinks } from '@/lib/curation/price-comparison'
import type { Prisma } from '@prisma/client'

// メタデータ生成
export async function generateMetadata({
  params
}: {
  params: { id: string }
}): Promise<Metadata> {
  const shoe = await prisma.shoe.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      brand: true,
      modelName: true,
      category: true,
      description: true,
      imageUrls: true,
      officialPrice: true,
    },
  })

  if (!shoe) {
    return { title: 'シューズが見つかりません' }
  }

  return generateShoeMetadata(shoe)
}

// Prismaから返される型
type ShoeWithReviews = Prisma.ShoeGetPayload<{
  include: {
    reviews: {
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
    }
    _count: {
      select: {
        reviews: true
      }
    }
  }
}>

interface ShoeMedia {
  id: string
  publicUrl: string
  isPrimary: boolean
}

interface ShoeWithRelations extends ShoeWithReviews {
  media: ShoeMedia[]
}

async function getShoe(id: string): Promise<ShoeWithRelations | null> {
  try {
    // 靴の基本情報とレビューを取得
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

    if (!shoe) return null

    // メディアを別途取得（ShoeMediaモデルがある場合）
    let media: ShoeMedia[] = []
    try {
      const mediaResults = await (prisma as any).shoeMedia.findMany({
        where: {
          shoeId: id,
          status: 'APPROVED',
        },
        orderBy: [
          { isPrimary: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 10,
        select: {
          id: true,
          publicUrl: true,
          isPrimary: true,
        },
      })
      media = mediaResults
    } catch {
      // ShoeMediaモデルが存在しない場合は空配列
    }

    return {
      ...shoe,
      media,
    }
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

  // Calculate averages
  const reviews = shoe.reviews
  const calcAvg = (key: keyof typeof reviews[0]) => {
    const validReviews = reviews.filter(r => r[key] != null)
    if (validReviews.length === 0) return 0
    const sum = validReviews.reduce((acc, r) => acc + Number(r[key]), 0)
    return sum / validReviews.length
  }

  const averageRating = calcAvg('overallRating')

  const radarData = [
    { label: '総合', value: averageRating, fullMark: 10 },
    { label: '快適性', value: calcAvg('comfortRating'), fullMark: 10 },
    { label: 'デザイン', value: calcAvg('designRating'), fullMark: 10 },
    { label: '耐久性', value: calcAvg('durabilityRating'), fullMark: 10 },
  ]

  // Extract pros/cons from the latest AI review or aggregate
  const aiReview = reviews.find(r => r.type === 'AI_SUMMARY')
  const pros = aiReview?.pros || []
  const cons = aiReview?.cons || []

  // 画像を取得（メディアテーブルから、なければimageUrlsから）
  const images: string[] = shoe.media.length > 0
    ? shoe.media.map((m) => m.publicUrl)
    : shoe.imageUrls || []

  const primaryImage = images[0] || '/placeholder-shoe.png'

  // 構造化データ
  const productSchema = generateProductSchema({
    ...shoe,
    imageUrls: images,
    reviews: shoe.reviews.map((r) => ({ overallRating: r.overallRating })),
  })
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'ホーム', url: '/' },
    { name: 'シューズ', url: '/shoes' },
    { name: `${shoe.brand} ${shoe.modelName}`, url: `/shoes/${shoe.id}` },
  ])

  // 価格比較リンク
  const priceLinks = generatePriceComparisonLinks(shoe.brand, shoe.modelName)

  return (
    <>
      {/* 構造化データ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(combineSchemas(productSchema, breadcrumbSchema)),
        }}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          {/* パンくずリスト */}
          <nav className="mb-6 text-sm text-slate-500">
            <ol className="flex items-center gap-2">
              <li><Link href="/" className="hover:text-indigo-600">ホーム</Link></li>
              <li>/</li>
              <li><Link href="/shoes" className="hover:text-indigo-600">シューズ</Link></li>
              <li>/</li>
              <li className="text-slate-700">{shoe.brand} {shoe.modelName}</li>
            </ol>
          </nav>

          {/* メインコンテンツ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* 画像セクション */}
            <div className="space-y-4">
              {/* メイン画像 */}
              <div className="relative aspect-square bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {images.length > 0 ? (
                  <Image
                    src={primaryImage}
                    alt={`${shoe.brand} ${shoe.modelName} - ランニングシューズ`}
                    fill
                    className="object-contain p-4"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* サムネイル */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.slice(0, 6).map((img: string, index: number) => (
                    <div
                      key={index}
                      className="relative w-20 h-20 flex-shrink-0 bg-white rounded-lg border border-slate-200 overflow-hidden"
                    >
                      <Image
                        src={img}
                        alt={`${shoe.brand} ${shoe.modelName} - 画像${index + 1}`}
                        fill
                        className="object-contain p-1"
                        sizes="80px"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 情報セクション */}
            <div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                {/* ブランド・モデル名 */}
                <div className="mb-4">
                  <span className="text-indigo-600 font-medium">{shoe.brand}</span>
                  <h1 className="text-3xl font-bold text-slate-800 mt-1">
                    {shoe.modelName}
                  </h1>
                </div>

                {/* バッジ */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="outline">{shoe.category}</Badge>
                  {shoe.releaseYear && (
                    <Badge variant="secondary">{shoe.releaseYear}年発売</Badge>
                  )}
                </div>

                {/* 評価チャートとスコア */}
                <div className="flex flex-col md:flex-row items-center gap-6 mb-6 p-4 bg-slate-50 rounded-xl">
                  <div className="flex-1 text-center md:text-left">
                    <div className="text-4xl font-bold text-indigo-600">
                      {averageRating.toFixed(1)}
                    </div>
                    <div className="text-sm text-slate-500">総合評価 / 10.0</div>
                    <div className="mt-2 flex justify-center md:justify-start items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 w-6 rounded-full ${i < Math.round(averageRating / 2)
                              ? 'bg-yellow-400'
                              : 'bg-slate-200'
                            }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-slate-600 mt-2">
                      {shoe._count.reviews}件のレビュー
                    </p>
                  </div>

                  {/* レーダーチャート */}
                  <div className="flex-shrink-0">
                    <RatingRadarChart ratings={radarData} size={160} />
                  </div>
                </div>

                {/* 価格 */}
                {shoe.officialPrice && (
                  <div className="mb-6">
                    <span className="text-sm text-slate-500">定価</span>
                    <p className="text-2xl font-bold text-slate-800">
                      ¥{shoe.officialPrice.toLocaleString()}
                    </p>
                  </div>
                )}

                {/* 説明 */}
                {shoe.description && (
                  <div className="mb-6">
                    <p className="text-slate-600 leading-relaxed">
                      {shoe.description}
                    </p>
                  </div>
                )}

                {/* レビュー投稿ボタン */}
                <Link
                  href={`/reviews/new?shoeId=${shoe.id}`}
                  className="block w-full bg-indigo-600 text-white text-center font-medium py-3 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  レビューを投稿する
                </Link>
              </div>

              {/* 価格比較リンク */}
              <div className="mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-4">
                  価格を比較する
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {priceLinks.map((link) => (
                    <a
                      key={link.siteName}
                      href={link.searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-700 text-sm font-medium transition-colors"
                    >
                      {link.siteName}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-3 text-center">
                  ※ 各サイトで最新の価格をご確認ください
                </p>
              </div>
            </div>
          </div>

          {/* Pros/Cons セクション */}
          {(pros.length > 0 || cons.length > 0) && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">
                AIによる分析まとめ
              </h2>
              <ProsConsList pros={pros} cons={cons} />
            </section>
          )}

          {/* レビューセクション */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                レビュー
                {shoe._count.reviews > 0 && (
                  <span className="text-lg font-normal text-slate-500 ml-2">
                    ({shoe._count.reviews}件)
                  </span>
                )}
              </h2>
            </div>

            {shoe.reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shoe.reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="text-slate-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-slate-600 mb-4">
                  このシューズのレビューはまだありません
                </p>
                <Link
                  href={`/reviews/new?shoeId=${shoe.id}`}
                  className="inline-block bg-indigo-600 text-white font-medium px-6 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  最初のレビューを投稿
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
