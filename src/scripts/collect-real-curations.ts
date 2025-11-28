import * as fs from 'fs'
import * as path from 'path'

// Manually load .env
try {
    const envPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8')
        envConfig.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
            if (match) {
                const key = match[1]
                let value = match[2] || ''
                // Remove inline comments
                const commentIndex = value.indexOf('#')
                if (commentIndex > -1) {
                    value = value.substring(0, commentIndex)
                }
                value = value.trim().replace(/^["']|["']$/g, '')

                if (!process.env[key]) {
                    process.env[key] = value
                }
            }
        })
    }
} catch (e) {
    console.warn('Failed to load .env manually', e)
}

console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'Yes' : 'No')

import { PrismaClient } from '@prisma/client'
import { refreshCuratedSourcesForShoe } from '@/lib/curation/service'

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
})

async function main() {
    console.log('Starting real curation collection...')

    // 1. シューズを取得
    const shoes = await prisma.shoe.findMany()
    console.log(`Found ${shoes.length} shoes.`)

    if (shoes.length === 0) {
        console.error('No shoes found. Please seed shoes first.')
        return
    }

    // 2. 無料枠を考慮して収集数を制限
    // Serper: 2500 queries/month free
    // Google: 100 queries/day free
    // YouTube: 10000 units/day free

    // 今回は合計100件程度のレビューを目指す
    // シューズ数で割って、1シューズあたりの取得数を決定
    // 最低3件、最大10件とする
    const targetTotal = 100
    const perShoe = Math.max(3, Math.min(10, Math.ceil(targetTotal / shoes.length)))

    console.log(`Target: ~${targetTotal} reviews total`)
    console.log(`Fetching max ${perShoe} reviews per shoe for ${shoes.length} shoes`)

    let totalCreated = 0

    for (const shoe of shoes) {
        console.log(`\nProcessing ${shoe.brand} ${shoe.modelName}...`)
        try {
            const result = await refreshCuratedSourcesForShoe(shoe.id, {
                includeVideos: true,
                includeWeb: true,
                maxResults: perShoe
            })

            console.log(`  -> Created ${result.created} new sources`)
            totalCreated += result.created

            // APIレート制限を考慮して少し待機
            await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (error) {
            console.error(`  -> Error: ${error instanceof Error ? error.message : String(error)}`)
        }
    }

    console.log('\n' + '='.repeat(40))
    console.log(`Collection complete! Total new sources: ${totalCreated}`)
    console.log('='.repeat(40))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
