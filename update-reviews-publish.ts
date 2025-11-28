import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateReviewsToPublished() {
  try {
    console.log('='.repeat(60))
    console.log('レビューを公開状態に更新')
    console.log('='.repeat(60))

    // 非公開のレビューを公開状態に更新
    const result = await prisma.review.updateMany({
      where: {
        OR: [
          { isPublished: false },
          { isDraft: true },
        ],
      },
      data: {
        isPublished: true,
        isDraft: false,
      },
    })

    console.log(`\n✅ ${result.count}件のレビューを公開状態に更新しました`)

    // 更新後の状態を確認
    const publishedCount = await prisma.review.count({
      where: {
        isPublished: true,
        isDraft: false,
      },
    })

    console.log(`\n現在公開されているレビュー数: ${publishedCount}件`)
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateReviewsToPublished()


