import { prisma } from '@/lib/prisma/client'
import { ShoeCard } from '@/components/shoes/ShoeCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

// 動的レンダリングを強制（ビルド時の静的生成をスキップ）
export const dynamic = 'force-dynamic'

async function getShoes() {
  try {
    return await prisma.shoe.findMany({
      orderBy: [
        { brand: 'asc' },
        { modelName: 'asc' },
      ],
      include: {
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    })
  } catch (error) {
    console.error('Failed to fetch shoes:', error)
    // エラーが発生した場合は空配列を返す
    return []
  }
}

export default async function ShoesPage() {
  const shoes = await getShoes()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">シューズ一覧</h1>
      </div>

      {shoes.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shoes.map((shoe) => (
            <ShoeCard key={shoe.id} shoe={shoe} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="シューズが登録されていません"
          description="最初のシューズを登録してみましょう"
        />
      )}
    </div>
  )
}

