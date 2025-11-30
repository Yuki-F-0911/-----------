/**
 * 構造化データ (JSON-LD) の生成
 * Google Rich Results用のSchema.orgマークアップ
 */

import type { Shoe, Review } from '@prisma/client'

// サイト情報
const SITE_INFO = {
  name: 'シューズレビューサイト',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://shoe-review.jp',
  description: 'ランニングシューズの専門レビューサイト。AIが厳選した情報源からレビューを収集・統合し、最適なシューズ選びをサポートします。',
  logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://shoe-review.jp'}/logo.png`,
}

/**
 * Organization構造化データ
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_INFO.name,
    url: SITE_INFO.url,
    logo: SITE_INFO.logo,
    description: SITE_INFO.description,
    sameAs: [
      'https://twitter.com/shoesreview_jp', // 仮のTwitterアカウント
      'https://www.instagram.com/shoesreview_jp', // 仮のInstagramアカウント
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Japanese', 'English'],
    },
  }
}

/**
 * WebSite構造化データ
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_INFO.name,
    url: SITE_INFO.url,
    description: SITE_INFO.description,
    inLanguage: 'ja-JP',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_INFO.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * BreadcrumbList構造化データ
 */
export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_INFO.url}${item.url}`,
    })),
  }
}

/**
 * Product構造化データ (シューズ用)
 */
export function generateProductSchema(
  shoe: Shoe & {
    reviews?: { overallRating: number | string | any }[]
    _count?: { reviews: number }
  }
) {
  // 平均評価を計算
  let aggregateRating = null
  if (shoe.reviews && shoe.reviews.length > 0) {
    const ratings = shoe.reviews.map(r =>
      typeof r.overallRating === 'number' ? r.overallRating : parseFloat(String(r.overallRating)) || 0
    )
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length

    aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(avgRating * 10) / 10,
      bestRating: 10,
      worstRating: 0,
      ratingCount: shoe.reviews.length,
      reviewCount: shoe._count?.reviews || shoe.reviews.length,
    }
  }

  const productSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${shoe.brand} ${shoe.modelName}`,
    description: shoe.description || `${shoe.brand}の${shoe.modelName}。${shoe.category}カテゴリーのランニングシューズ。`,
    brand: {
      '@type': 'Brand',
      name: shoe.brand,
    },
    category: shoe.category,
    url: `${SITE_INFO.url}/shoes/${shoe.id}`,
    // 追加: SKUやMPNがあればここに追加推奨
  }

  // 画像がある場合
  if (shoe.imageUrls && shoe.imageUrls.length > 0) {
    productSchema.image = shoe.imageUrls
  }

  // 価格がある場合
  if (shoe.officialPrice) {
    productSchema.offers = {
      '@type': 'Offer',
      price: shoe.officialPrice,
      priceCurrency: 'JPY',
      availability: 'https://schema.org/InStock',
      url: `${SITE_INFO.url}/shoes/${shoe.id}`,
      priceValidUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], // 1年後まで有効
    }
  }

  // 評価がある場合
  if (aggregateRating) {
    productSchema.aggregateRating = aggregateRating
  }

  return productSchema
}

/**
 * Review構造化データ
 */
export function generateReviewSchema(
  review: Review & {
    user?: { displayName: string; username: string } | null
    shoe?: { brand: string; modelName: string; id: string } | null
    aiSources?: { sourceUrl: string; sourceTitle: string | null }[] // AIソースを追加
  }
) {
  const rating = typeof review.overallRating === 'number'
    ? review.overallRating
    : parseFloat(String(review.overallRating)) || 0

  const reviewSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    name: review.title,
    reviewBody: review.content,
    datePublished: review.createdAt.toISOString(),
    dateModified: review.updatedAt.toISOString(),
    reviewRating: {
      '@type': 'Rating',
      ratingValue: rating,
      bestRating: 10,
      worstRating: 0,
    },
    url: `${SITE_INFO.url}/reviews/${review.id}`,
  }

  // 著者情報
  if (review.user) {
    reviewSchema.author = {
      '@type': 'Person',
      name: review.user.displayName,
      url: `${SITE_INFO.url}/users/${review.user.username}`,
    }
  } else if (review.type === 'AI_SUMMARY') {
    reviewSchema.author = {
      '@type': 'Organization',
      name: SITE_INFO.name,
      url: SITE_INFO.url,
    }
    // AI要約の場合、引用元を追加 (GEO対策)
    if (review.aiSources && review.aiSources.length > 0) {
      reviewSchema.citation = review.aiSources.map(source => ({
        '@type': 'CreativeWork',
        name: source.sourceTitle || '参照元',
        url: source.sourceUrl,
      }))
    }
  }

  // レビュー対象のシューズ
  if (review.shoe) {
    reviewSchema.itemReviewed = {
      '@type': 'Product',
      name: `${review.shoe.brand} ${review.shoe.modelName}`,
      url: `${SITE_INFO.url}/shoes/${review.shoe.id}`,
      brand: {
        '@type': 'Brand',
        name: review.shoe.brand,
      },
    }
  }

  // 画像がある場合
  if (review.imageUrls && review.imageUrls.length > 0) {
    reviewSchema.image = review.imageUrls
  }

  // 長所・短所
  if (review.pros && review.pros.length > 0) {
    reviewSchema.positiveNotes = {
      '@type': 'ItemList',
      itemListElement: review.pros.map((pro, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: pro,
      })),
    }
  }

  if (review.cons && review.cons.length > 0) {
    reviewSchema.negativeNotes = {
      '@type': 'ItemList',
      itemListElement: review.cons.map((con, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: con,
      })),
    }
  }

  return reviewSchema
}

/**
 * FAQPage構造化データ
 */
export function generateFAQSchema(
  faqs: { question: string; answer: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

/**
 * ItemList構造化データ (シューズ一覧用)
 */
export function generateItemListSchema(
  items: { name: string; url: string; position: number }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map(item => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: `${SITE_INFO.url}${item.url}`,
    })),
  }
}

/**
 * Article構造化データ (ブログ記事用)
 */
export function generateArticleSchema(article: {
  title: string
  description: string
  content: string
  author: string
  publishedAt: Date
  updatedAt: Date
  imageUrl?: string
  slug: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    articleBody: article.content,
    author: {
      '@type': 'Person',
      name: article.author,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_INFO.name,
      logo: {
        '@type': 'ImageObject',
        url: SITE_INFO.logo,
      },
    },
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_INFO.url}/articles/${article.slug}`,
    },
    image: article.imageUrl || SITE_INFO.logo,
  }
}


/**
 * AboutPage構造化データ
 */
export function generateAboutPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: '私たちについて',
    description: SITE_INFO.description,
    url: `${SITE_INFO.url}/about`,
    publisher: {
      '@type': 'Organization',
      name: SITE_INFO.name,
      logo: {
        '@type': 'ImageObject',
        url: SITE_INFO.logo,
      },
    },
  }
}

/**
 * 複数のスキーマを結合する (@graphを使用)
 */
export function combineSchemas(...schemas: Record<string, unknown>[]) {
  return {
    '@context': 'https://schema.org',
    '@graph': schemas,
  }
}
