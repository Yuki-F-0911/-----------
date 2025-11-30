/**
 * サイトマップ生成
 * 動的にシューズとレビューのURLを含める
 * SEO最適化: 日本語キーワード対応のページを含む
 */

import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma/client'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://shoe-review.jp'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 静的ページ（SEO重要度順）
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/shoes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/reviews`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  // ブランド別ページを生成
  let brandPages: MetadataRoute.Sitemap = []
  try {
    const brands = await prisma.shoe.findMany({
      select: { brand: true },
      distinct: ['brand'],
    })

    brandPages = brands.map((b) => ({
      url: `${SITE_URL}/shoes?brand=${encodeURIComponent(b.brand)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    }))
  } catch (error) {
    console.error('Error fetching brands for sitemap:', error)
  }

  // カテゴリ別ページを生成
  const categoryPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/shoes?category=ランニング`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/shoes?category=レース`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/shoes?category=トレイル`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/shoes?category=スタビリティ`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.85 },
  ]

  // シューズページを取得
  let shoePages: MetadataRoute.Sitemap = []
  try {
    const shoes = await prisma.shoe.findMany({
      select: {
        id: true,
        updatedAt: true,
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    shoePages = shoes.map(shoe => ({
      url: `${SITE_URL}/shoes/${shoe.id}`,
      lastModified: shoe.updatedAt,
      changeFrequency: 'weekly' as const,
      // レビュー数が多いシューズは優先度を高く
      priority: Math.min(0.8, 0.5 + (shoe._count.reviews * 0.05)),
    }))
  } catch (error) {
    console.error('Error fetching shoes for sitemap:', error)
  }

  // レビューページを取得
  let reviewPages: MetadataRoute.Sitemap = []
  try {
    const reviews = await prisma.review.findMany({
      where: {
        isPublished: true,
        isDraft: false,
      },
      select: {
        id: true,
        updatedAt: true,
        type: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 1000, // 最大1000件
    })

    reviewPages = reviews.map(review => ({
      url: `${SITE_URL}/reviews/${review.id}`,
      lastModified: review.updatedAt,
      changeFrequency: 'monthly' as const,
      // AI要約レビューは優先度を高く
      priority: review.type === 'AI_SUMMARY' ? 0.7 : 0.6,
    }))
  } catch (error) {
    console.error('Error fetching reviews for sitemap:', error)
  }

  return [...staticPages, ...brandPages, ...categoryPages, ...shoePages, ...reviewPages]
}

