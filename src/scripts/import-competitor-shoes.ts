import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Manually load .env file to ensure DATABASE_URL is available
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8')
    envConfig.split('\n').forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
            const key = match[1].trim()
            const value = match[2].trim().replace(/^["']|["']$/g, '') // Remove quotes
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

const shoes = [
    { brand: 'Adidas', modelName: 'Adizero Evo SL', category: 'レース', description: '超軽量レーシングシューズ' },
    { brand: 'Under Armour', modelName: 'Sonic 7', category: 'ランニング', description: 'スマートシューズ機能搭載のクッションモデル' },
    { brand: 'Brooks', modelName: 'Ghost 17', category: 'ランニング', description: '定番のクッションモデル、スムーズな走り心地' },
    { brand: 'Hoka', modelName: 'Clifton 10', category: 'クッション', description: 'Hokaを代表するベストセラーモデル' },
    { brand: 'Asics', modelName: 'Novablast 5', category: 'ランニング', description: '反発性に優れたトランポリンのような走り心地' },
    { brand: 'Puma', modelName: 'ForeverRun Nitro 2', category: 'スタビリティ', description: '安定性とクッション性を両立' },
    { brand: 'Hoka', modelName: 'Bondi 9', category: 'クッション', description: 'Hokaの中で最もクッション性の高いモデル' },
    { brand: 'Nike', modelName: 'Vaporfly 4', category: 'レース', description: 'エリートランナー向け厚底レーシング' },
    { brand: 'Saucony', modelName: 'Endorphin Elite 2', category: 'レース', description: '最高峰の反発力を誇るレーシングモデル' },
    { brand: 'Adidas', modelName: 'Adizero Adios Pro 4', category: 'レース', description: '世界記録を狙うためのトップレーシング' },
    { brand: 'Brooks', modelName: 'Caldera 8', category: 'トレイル', description: '長距離トレイル向けのクッションモデル' },
    { brand: 'lululemon', modelName: 'Wildfeel', category: 'トレイル', description: 'lululemon初のトレイルランニングシューズ' },
]

async function main() {
    console.log('Starting competitor shoes import...')
    console.log(`Found ${shoes.length} shoes to import.`)

    for (const shoe of shoes) {
        const existing = await prisma.shoe.findFirst({
            where: {
                brand: shoe.brand,
                modelName: shoe.modelName,
            },
        })

        if (existing) {
            console.log(`Skipping existing shoe: ${shoe.brand} ${shoe.modelName}`)
            continue
        }

        await prisma.shoe.create({
            data: {
                brand: shoe.brand,
                modelName: shoe.modelName,
                category: shoe.category,
                description: shoe.description,
                releaseYear: 2025,
                officialPrice: 0, // Unknown price, set to 0 or null if nullable (schema says Int?)
                imageUrls: [],
                keywords: [shoe.category, '2025年モデル'],
            },
        })
        console.log(`Imported: ${shoe.brand} ${shoe.modelName}`)
    }

    console.log('Import complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
