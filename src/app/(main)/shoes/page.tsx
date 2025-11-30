import { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma/client'
import { ShoeCard } from '@/components/shoes/ShoeCard'
import { ShoeFilters } from '@/components/shoes/ShoeFilters'
import { EmptyState } from '@/components/common/EmptyState'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateBreadcrumbSchema } from '@/lib/seo/structured-data'
import { shoesListMetadata } from '@/lib/seo/metadata'
import { Prisma } from '@prisma/client'

// 動的レンダリングを強制
export const dynamic = 'force-dynamic'

export const metadata: Metadata = shoesListMetadata

interface FilterParams {
  brands?: string[]
  categories?: string[]
  sort?: string
}

async function getShoes(params: FilterParams) {
  try {
    const where: Prisma.ShoeWhereInput = {}

    if (params.brands && params.brands.length > 0) {
      where.brand = { in: params.brands }
    }

    if (params.categories && params.categories.length > 0) {
      where.category = { in: params.categories }
    }

    let orderBy: Prisma.ShoeOrderByWithRelationInput[] = []

    switch (params.sort) {
      case 'price_asc':
        orderBy = [{ officialPrice: 'asc' }]
        break
      case 'price_desc':
        orderBy = [{ officialPrice: 'desc' }]
        break
      case 'rating':
        // Note: Sorting by computed rating is hard in Prisma without raw query or denormalization.
        // For now, let's sort by review count as a proxy for popularity/rating if we can't easily do avg.
        // Or we can fetch all and sort in memory (fine for 50 items).
        // Let's stick to simple DB sorts for now.
        // If we want rating, we might need to rely on a cached field.
        // Let's use createdAt desc as default and fallback.
        orderBy = [{ createdAt: 'desc' }]
        break
      case 'newest':
      default:
        orderBy = [{ createdAt: 'desc' }]
    }

    const shoes = await prisma.shoe.findMany({
      where,
      orderBy,
      include: {
        reviews: {
          select: {
            overallRating: true
          }
        },
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    })

    // In-memory sort for rating if needed
    if (params.sort === 'rating') {
      return shoes.sort((a, b) => {
        const avgA = a.reviews.length > 0
          ? a.reviews.reduce((sum, r) => sum + Number(r.overallRating), 0) / a.reviews.length
          : 0
        const avgB = b.reviews.length > 0
          ? b.reviews.reduce((sum, r) => sum + Number(r.overallRating), 0) / b.reviews.length
          : 0
        return avgB - avgA
      })
    }

    return shoes
  } catch (error) {
    console.error('Failed to fetch shoes:', error)
    return []
  }
}

async function getFilterOptions() {
  const brands = await prisma.shoe.findMany({
    select: { brand: true },
    distinct: ['brand'],
    orderBy: { brand: 'asc' }
  })

  const categories = await prisma.shoe.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' }
  })

  return {
    brands: brands.map(b => b.brand),
    categories: categories.map(c => c.category)
  }
}

export default async function ShoesPage({
  searchParams,
}: {
  searchParams: { brands?: string; categories?: string; sort?: string }
}) {
  const brands = searchParams.brands?.split(',') || []
  const categories = searchParams.categories?.split(',') || []
  const sort = searchParams.sort

  const shoes = await getShoes({ brands, categories, sort })
  const filterOptions = await getFilterOptions()

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'ホーム', url: '/' },
    { name: 'シューズ一覧', url: '/shoes' },
  ])

  return (
    <>
      <JsonLd data={breadcrumbSchema} />

      <div className="container mx-auto px-4 py-8">
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-gray-500">
            <li><Link href="/" className="hover:text-gray-700">ホーム</Link></li>
            <li>/</li>
            <li className="text-gray-900 font-medium">シューズ一覧</li>
          </ol>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">シューズ一覧</h1>
          <p className="mt-1 text-gray-600">
            {shoes.length}モデルのランニングシューズが見つかりました
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <ShoeFilters
                brands={filterOptions.brands}
                categories={filterOptions.categories}
              />
            </div>
          </div>

          {/* Shoe Grid */}
          <div className="lg:col-span-3">
            {shoes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shoes.map((shoe) => (
                  <ShoeCard key={shoe.id} shoe={shoe} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="条件に一致するシューズが見つかりませんでした"
                description="検索条件を変更して再度お試しください"
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

