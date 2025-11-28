import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkReviews() {
  try {
    console.log('='.repeat(60))
    console.log('レビューの状態確認')
    console.log('='.repeat(60))

    // すべてのレビューを取得
    const allReviews = await prisma.review.findMany({
      include: {
        shoe: {
          select: {
            id: true,
            brand: true,
            modelName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`\n総レビュー数: ${allReviews.length}`)

    // 公開されているレビュー
    const publishedReviews = allReviews.filter(
      (r) => r.isPublished === true && r.isDraft === false
    )
    console.log(`公開されているレビュー: ${publishedReviews.length}`)

    // 非公開のレビュー
    const unpublishedReviews = allReviews.filter(
      (r) => r.isPublished === false || r.isDraft === true
    )
    console.log(`非公開のレビュー: ${unpublishedReviews.length}`)

    if (unpublishedReviews.length > 0) {
      console.log('\n非公開のレビュー詳細:')
      unpublishedReviews.slice(0, 10).forEach((review) => {
        console.log(`  - ID: ${review.id}`)
        console.log(`    タイトル: ${review.title}`)
        console.log(`    isPublished: ${review.isPublished}`)
        console.log(`    isDraft: ${review.isDraft}`)
        console.log(`    靴: ${review.shoe?.brand} ${review.shoe?.modelName}`)
        console.log('')
      })
    }

    // 靴が存在しないレビュー
    const reviewsWithoutShoe = allReviews.filter((r) => !r.shoe)
    if (reviewsWithoutShoe.length > 0) {
      console.log(`\n⚠️ 靴が存在しないレビュー: ${reviewsWithoutShoe.length}件`)
      reviewsWithoutShoe.slice(0, 5).forEach((review) => {
        console.log(`  - ID: ${review.id}, タイトル: ${review.title}`)
      })
    }

    // 公開されているレビューの詳細（最初の5件）
    if (publishedReviews.length > 0) {
      console.log('\n公開されているレビュー（最初の5件）:')
      publishedReviews.slice(0, 5).forEach((review) => {
        console.log(`  - ID: ${review.id}`)
        console.log(`    タイトル: ${review.title}`)
        console.log(`    靴: ${review.shoe?.brand} ${review.shoe?.modelName}`)
        console.log(`    作成日: ${review.createdAt}`)
        console.log('')
      })
    } else {
      console.log('\n⚠️ 公開されているレビューがありません')
      console.log('以下のコマンドでレビューを公開状態に更新できます:')
      console.log('pnpm update-reviews-publish')
    }
  } catch (error) {
    console.error('エラー:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkReviews()


