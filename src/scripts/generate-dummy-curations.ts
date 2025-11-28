import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import type { CuratedSourceType, CuratedSourceStatus } from '@/types/curation'

const prisma = new PrismaClient()

const SOURCE_TYPES: CuratedSourceType[] = [
    'OFFICIAL',
    'MARKETPLACE',
    'SNS',
    'VIDEO',
    'ARTICLE',
    'COMMUNITY',
]

const TITLES = [
    '最高のランニングシューズ！',
    'デザインが気に入りました',
    'クッション性が抜群',
    '少しサイズが小さめかも',
    '長距離ランに最適',
    'コスパ最強',
    '初心者におすすめ',
    'プロも愛用するモデル',
    '雨の日でも滑りにくい',
    '通気性が良くて蒸れない',
]

const PLATFORMS = [
    'twitter.com',
    'instagram.com',
    'youtube.com',
    'nike.com',
    'adidas.com',
    'runnet.jp',
    'amazon.co.jp',
    'rakuten.co.jp',
]

async function main() {
    console.log('Starting dummy curation generation...')

    const shoes = await prisma.shoe.findMany()
    if (shoes.length === 0) {
        console.error('No shoes found. Please seed shoes first.')
        return
    }

    const totalToGenerate = 100
    let createdCount = 0

    for (let i = 0; i < totalToGenerate; i++) {
        const shoe = shoes[Math.floor(Math.random() * shoes.length)]
        const type = SOURCE_TYPES[Math.floor(Math.random() * SOURCE_TYPES.length)]
        const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)]
        const title = `${shoe.brand} ${shoe.modelName} - ${TITLES[Math.floor(Math.random() * TITLES.length)]}`

        await prisma.curatedSource.create({
            data: {
                shoeId: shoe.id,
                type: type,
                platform: platform,
                title: title,
                url: `https://${platform}/item/${Math.floor(Math.random() * 100000)}`,
                excerpt: 'これは自動生成されたダミーのキュレーションデータです。実際のレビュー内容ではありませんが、UIのテストに使用できます。',
                reliability: 0.7 + Math.random() * 0.3,
                status: 'PUBLISHED' as CuratedSourceStatus,
                language: 'ja',
                publishedAt: new Date(Date.now() - Math.floor(Math.random() * 10000000000)),
            },
        })
        createdCount++
        process.stdout.write(`\rGenerated ${createdCount}/${totalToGenerate} reviews`)
    }

    console.log('\nDone!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
