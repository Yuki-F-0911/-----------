import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { refreshCuratedSourcesForShoe } from '../lib/curation/service'
import { generateSummarizedReview } from '../lib/ai/summarizer'

// Manually load .env file
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8')
    envConfig.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
            const key = match[1].trim()
            const value = match[2].trim().replace(/^["']|["']$/g, '')
            if (!process.env[key]) {
                process.env[key] = value
            }
        }
    })
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
})

async function main() {
    console.log('Starting review processing...')

    // 1. Fetch target shoes (Running/Race/Trail, exclude sneakers)
    const allShoes = await prisma.shoe.findMany({
        where: {
            OR: [
                { category: 'ランニング' },
                { category: 'レース' },
                { category: 'トレイル' },
                { category: 'スタビリティ' },
                { category: 'クッション' },
            ],
            NOT: {
                modelName: {
                    in: ['Air Max 90', 'Chuck Taylor All Star'],
                },
            },
        },
        take: 20, // Limit to 20 shoes
    })

    console.log(`Found ${allShoes.length} shoes to process.`)

    for (const shoe of allShoes) {
        console.log(`\nProcessing: ${shoe.brand} ${shoe.modelName}...`)

        try {
            // 2. Collect reviews (Max 5 references)
            console.log('  - Collecting sources...')
            const collectionResult = await refreshCuratedSourcesForShoe(shoe.id, {
                maxResults: 5,
                includeVideos: true,
                includeWeb: true,
            })
            console.log(`    -> Created ${collectionResult.created} new sources.`)

            // 3. Fetch sources for summarization
            const sources = await prisma.curatedSource.findMany({
                where: { shoeId: shoe.id },
                take: 5, // Use top 5 sources
                orderBy: { reliability: 'desc' },
            })

            if (sources.length === 0) {
                console.log('    -> No sources found, skipping summarization.')
                continue
            }

            // 4. Generate Summary
            console.log('  - Generating summary...')
            const summary = await generateSummarizedReview(
                sources.map(s => ({
                    type: s.type === 'VIDEO' ? 'YOUTUBE_VIDEO' : 'WEB_ARTICLE',
                    title: s.title,
                    content: s.excerpt || '',
                    url: s.url,
                    author: s.author || undefined,
                })),
                shoe.brand,
                shoe.modelName
            )

            // 5. Post Review
            console.log('  - Posting review...')

            // Check if AI review already exists
            const existingReview = await prisma.review.findFirst({
                where: {
                    shoeId: shoe.id,
                    type: 'AI_SUMMARY',
                },
            })

            if (existingReview) {
                console.log('    -> Updating existing AI review.')
                await prisma.review.update({
                    where: { id: existingReview.id },
                    data: {
                        title: summary.title,
                        content: summary.summary,
                        overallRating: summary.overallRating,
                        pros: summary.pros,
                        cons: summary.cons,
                        recommendedFor: summary.recommendedFor,
                        sourceCount: sources.length,
                        isPublished: true,
                    },
                })
            } else {
                console.log('    -> Creating new AI review.')
                await prisma.review.create({
                    data: {
                        shoeId: shoe.id,
                        type: 'AI_SUMMARY',
                        title: summary.title,
                        content: summary.summary,
                        overallRating: summary.overallRating,
                        pros: summary.pros,
                        cons: summary.cons,
                        recommendedFor: summary.recommendedFor,
                        sourceCount: sources.length,
                        isPublished: true,
                        // AI reviews don't have a userId, or we could assign a system user if needed
                        // Schema allows userId to be nullable
                    },
                })
            }

            console.log('    -> Done!')

        } catch (error) {
            console.error(`    -> Error processing ${shoe.brand} ${shoe.modelName}:`, error)
        }
    }

    console.log('\nAll processing complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
