import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const reviewId = 'cmiiw05we000g4rhktte4o5b6'
    console.log(`Fetching review: ${reviewId}`)

    const review = await prisma.review.findUnique({
        where: { id: reviewId },
        include: {
            user: true,
            shoe: true,
            aiSources: true,
        },
    })

    if (!review) {
        console.log('Review not found')
        return
    }

    console.log('Review found:')
    console.log(JSON.stringify(review, null, 2))

    // Check for potential issues
    console.log('\n--- Analysis ---')
    if (review.imageUrls && review.imageUrls.length > 0) {
        console.log('Image URLs:', review.imageUrls)
        review.imageUrls.forEach((url: string) => {
            try {
                const u = new URL(url)
                console.log(`  - Domain: ${u.hostname}`)
            } catch (e) {
                console.log(`  - Invalid URL: ${url}`)
            }
        })
    } else {
        console.log('No images')
    }

    if (review.user && review.user.avatarUrl) {
        console.log('User Avatar:', review.user.avatarUrl)
        try {
            const u = new URL(review.user.avatarUrl)
            console.log(`  - Domain: ${u.hostname}`)
        } catch (e) {
            console.log(`  - Invalid URL: ${review.user.avatarUrl}`)
        }
    }

    console.log('Dates:')
    console.log('  createdAt:', review.createdAt)
    console.log('  updatedAt:', review.updatedAt)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
