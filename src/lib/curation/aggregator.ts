/**
 * キュレーション統合サービス
 * 複数のソースからレビューを収集・統合
 * 
 * ⚠️ 注意: スクレイピング機能は著作権保護のため削除されました
 * 現在サポートされているソース:
 * - 楽天API（公式API）
 * - YouTube（メタデータのみ）
 */

import {
  CuratedReview,
  AggregatedReviewData,
  CurationSearchParams,
  CurationResult,
  SourceType,
} from './types'
import { collectRakutenReviewStats, RakutenReviewStats } from './rakuten-api'
import { searchYouTubeVideos } from '@/lib/ai/youtube-search'

// 以下のインポートは著作権保護のため削除されました:
// - collectKakakuReviews（価格.comスクレイピング）
// - collectRedditReviews（Redditコンテンツ収集）
// - scrapeWebArticle（Web記事スクレイピング）

/**
 * 複数ソースからレビューを収集・統合
 */
export async function aggregateReviews(
  params: CurationSearchParams
): Promise<CurationResult> {
  const {
    brand,
    modelName,
    maxResults = 50,
    sources,
    locale = 'ja',
    includeImages = true,
  } = params

  const allReviews: CuratedReview[] = []
  const errors: string[] = []
  const warnings: string[] = []

  // 使用するソースを決定
  const enabledSources = sources || getDefaultSources(locale)

  // 並行してレビューを収集
  const collectionPromises: Promise<void>[] = []

  // 楽天API
  if (enabledSources.includes('RAKUTEN') && process.env.RAKUTEN_APPLICATION_ID) {
    collectionPromises.push(
      collectRakutenReviewStats(
        brand,
        modelName,
        process.env.RAKUTEN_APPLICATION_ID,
        process.env.RAKUTEN_AFFILIATE_ID
      )
        .then((stats: RakutenReviewStats[]) => {
          const reviews: CuratedReview[] = stats.map(stat => ({
            id: `rakuten-${stat.productUrl}`,
            sourceType: 'RAKUTEN' as SourceType,
            sourceUrl: stat.productUrl,
            sourceTitle: stat.productName,
            content: `楽天市場のレビュー統計: ${stat.reviewCount}件の評価, 平均${stat.averageRating}点`,
            rating: stat.averageRating,
            ratingScale: 5,
            normalizedRating: stat.normalizedRating,
            imageUrls: [],
            pros: [],
            cons: [],
            locale: 'ja',
            relevanceScore: 0.9,
            collectedAt: stat.collectedAt,
          }))
          allReviews.push(...reviews)
          console.log(`[Rakuten] Collected stats for ${stats.length} products`)
        })
        .catch(err => {
          errors.push(`Rakuten: ${err.message}`)
        })
    )
  }

  // 価格.com - 著作権保護のため無効化
  // スクレイピングは利用規約違反のため削除されました
  if (enabledSources.includes('KAKAKU')) {
    warnings.push('価格.comスクレイピングは著作権保護のため無効化されています。代わりに価格比較リンクを使用してください。')
  }

  // Reddit - 著作権保護のため無効化
  // 投稿全文の収集は著作権侵害のリスクがあるため削除されました
  if (enabledSources.includes('REDDIT')) {
    warnings.push('Redditコンテンツ収集は著作権保護のため無効化されています。')
  }

  // YouTube
  if (enabledSources.includes('YOUTUBE') && process.env.YOUTUBE_API_KEY) {
    collectionPromises.push(
      collectYoutubeReviews(brand, modelName)
        .then(reviews => {
          allReviews.push(...reviews)
          console.log(`[YouTube] Collected ${reviews.length} reviews`)
        })
        .catch(err => {
          errors.push(`YouTube: ${err.message}`)
        })
    )
  }

  // Web記事 - 著作権保護のため無効化
  // 記事全文のスクレイピングは著作権侵害のため削除されました
  if (enabledSources.includes('WEB_ARTICLE')) {
    warnings.push('Web記事スクレイピングは著作権保護のため無効化されています。')
  }

  // すべての収集を待機
  await Promise.all(collectionPromises)

  if (allReviews.length === 0) {
    return {
      success: false,
      errors: errors.length > 0 ? errors : ['No reviews found from any source'],
    }
  }

  // レビューを統合
  const aggregatedData = aggregateReviewData(
    allReviews,
    brand,
    modelName,
    maxResults
  )

  return {
    success: true,
    data: aggregatedData,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * YouTubeレビューを収集
 */
async function collectYoutubeReviews(
  brand: string,
  modelName: string
): Promise<CuratedReview[]> {
  try {
    // 日本語と英語の両方で検索
    const queries = [
      `${brand} ${modelName} レビュー`,
      `${brand} ${modelName} review`,
    ]

    const reviews: CuratedReview[] = []

    for (const query of queries) {
      const response = await searchYouTubeVideos(query, 5)

      for (const video of response.items) {
        reviews.push({
          id: `youtube-${video.videoId}`,
          sourceType: 'YOUTUBE' as SourceType,
          sourceUrl: video.url,
          sourceTitle: video.title,
          sourceAuthor: video.channelTitle,
          content: video.description || video.title,
          ratingScale: 10,
          normalizedRating: 7.0, // YouTubeには評価なし、中立値
          reviewerName: video.channelTitle,
          reviewDate: video.publishedAt ? new Date(video.publishedAt) : undefined,
          imageUrls: video.thumbnailUrl ? [video.thumbnailUrl] : [],
          pros: [],
          cons: [],
          locale: video.title.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/) ? 'ja' : 'en',
          relevanceScore: 0.75,
          collectedAt: new Date(),
        })
      }
    }

    return reviews
  } catch (error) {
    console.error('YouTube collection error:', error)
    return []
  }
}

/**
 * Web記事レビューを収集
 * 
 * ⚠️ この機能は著作権保護のため無効化されています
 * Web記事の全文スクレイピングは著作権侵害になるため削除されました
 */

async function collectWebArticleReviews(
  _brand: string,
  _modelName: string
): Promise<CuratedReview[]> {
  console.warn('Web記事スクレイピングは著作権保護のため無効化されています')
  return []
}

/**
 * 地域に基づくデフォルトソース
 * 
 * 注意: スクレイピングソース（KAKAKU, WEB_ARTICLE, REDDIT）は
 * 著作権保護のため無効化されています
 */
function getDefaultSources(locale: string): SourceType[] {
  if (locale === 'ja') {
    // KAKAKU, WEB_ARTICLE, REDDITは著作権保護のため除外
    return ['RAKUTEN', 'YOUTUBE']
  }
  // REDDIT, WEB_ARTICLEは著作権保護のため除外
  return ['YOUTUBE']
}

/**
 * レビューデータを統合
 */
function aggregateReviewData(
  reviews: CuratedReview[],
  brand: string,
  modelName: string,
  maxResults: number
): AggregatedReviewData {
  // 重複を除去し、関連性スコアでソート
  const uniqueReviews = deduplicateReviews(reviews)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults)

  // 平均評価を計算
  const reviewsWithRating = uniqueReviews.filter(r => r.normalizedRating > 0)
  const averageRating = reviewsWithRating.length > 0
    ? reviewsWithRating.reduce((sum, r) => sum + r.normalizedRating, 0) / reviewsWithRating.length
    : 0

  // 評価分布を計算
  const ratingDistribution = calculateRatingDistribution(uniqueReviews)

  // 共通の長所・短所を抽出
  const { commonPros, commonCons } = extractCommonProsAndCons(uniqueReviews)

  // ソース別の統計
  const sources = calculateSourceStats(uniqueReviews)

  // 価格範囲（TODO: 実際の価格データを使用）
  const priceRange = {
    min: 0,
    max: 0,
    currency: 'JPY',
    sources: [],
  }

  // 推奨ランナータイプを推定
  const recommendedFor = inferRecommendedFor(uniqueReviews)

  return {
    shoeId: '', // 後で設定
    brand,
    modelName,
    totalReviews: uniqueReviews.length,
    averageRating: Math.round(averageRating * 10) / 10,
    ratingDistribution,
    commonPros,
    commonCons,
    recommendedFor,
    sources,
    priceRange,
    reviews: uniqueReviews,
    lastUpdated: new Date(),
  }
}

/**
 * 重複レビューを除去
 */
function deduplicateReviews(reviews: CuratedReview[]): CuratedReview[] {
  const seen = new Set<string>()
  const unique: CuratedReview[] = []

  for (const review of reviews) {
    // コンテンツのハッシュで重複チェック
    const contentKey = review.content.substring(0, 100).toLowerCase().replace(/\s+/g, '')

    if (!seen.has(contentKey)) {
      seen.add(contentKey)
      unique.push(review)
    }
  }

  return unique
}

/**
 * 評価分布を計算
 */
function calculateRatingDistribution(
  reviews: CuratedReview[]
): { rating: number; count: number; percentage: number }[] {
  const distribution: { [key: number]: number } = {}

  for (let i = 1; i <= 10; i++) {
    distribution[i] = 0
  }

  for (const review of reviews) {
    if (review.normalizedRating > 0) {
      const bucket = Math.ceil(review.normalizedRating)
      distribution[bucket] = (distribution[bucket] || 0) + 1
    }
  }

  const total = reviews.filter(r => r.normalizedRating > 0).length

  return Object.entries(distribution).map(([rating, count]) => ({
    rating: parseInt(rating),
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  }))
}

/**
 * 共通の長所・短所を抽出
 */
function extractCommonProsAndCons(reviews: CuratedReview[]): {
  commonPros: string[]
  commonCons: string[]
} {
  const prosCount: { [key: string]: number } = {}
  const consCount: { [key: string]: number } = {}

  for (const review of reviews) {
    for (const pro of review.pros) {
      const normalized = normalizeTerm(pro)
      prosCount[normalized] = (prosCount[normalized] || 0) + 1
    }
    for (const con of review.cons) {
      const normalized = normalizeTerm(con)
      consCount[normalized] = (consCount[normalized] || 0) + 1
    }
  }

  // 出現回数でソートして上位を返す
  const commonPros = Object.entries(prosCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term)

  const commonCons = Object.entries(consCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term)

  return { commonPros, commonCons }
}

/**
 * 用語を正規化
 */
function normalizeTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^\w\s\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '')
    .trim()
    .substring(0, 50)
}

/**
 * ソース別統計を計算
 */
function calculateSourceStats(
  reviews: CuratedReview[]
): { type: SourceType; count: number; avgRating: number; url?: string }[] {
  const sourceStats: { [key: string]: { count: number; totalRating: number; url?: string } } = {}

  for (const review of reviews) {
    const source = review.sourceType
    if (!sourceStats[source]) {
      sourceStats[source] = { count: 0, totalRating: 0, url: review.sourceUrl }
    }
    sourceStats[source].count++
    if (review.normalizedRating > 0) {
      sourceStats[source].totalRating += review.normalizedRating
    }
  }

  return Object.entries(sourceStats).map(([type, stats]) => ({
    type: type as SourceType,
    count: stats.count,
    avgRating: stats.count > 0 ? Math.round((stats.totalRating / stats.count) * 10) / 10 : 0,
    url: stats.url,
  }))
}

/**
 * 推奨ランナータイプを推定
 */
function inferRecommendedFor(reviews: CuratedReview[]): string[] {
  const keywords: { [key: string]: string[] } = {
    '初心者': ['beginner', 'first', '初心者', '入門', 'easy'],
    '中級者': ['intermediate', 'versatile', '中級', 'all-around'],
    '上級者': ['advanced', 'elite', 'race', '上級', 'プロ'],
    'デイリートレーナー': ['daily', 'everyday', 'training', 'トレーニング', '練習用'],
    'レース用': ['race', 'racing', 'fast', 'speed', 'レース', '大会'],
    'ロング走': ['long run', 'marathon', 'distance', 'ロング', 'マラソン'],
    'リカバリー': ['recovery', 'easy', 'comfortable', 'リカバリー', '回復'],
    'トレイル': ['trail', 'off-road', 'トレイル', '山'],
  }

  const scores: { [key: string]: number } = {}

  for (const review of reviews) {
    const text = (review.content + ' ' + review.pros.join(' ') + ' ' + review.cons.join(' ')).toLowerCase()

    for (const [category, kws] of Object.entries(keywords)) {
      for (const kw of kws) {
        if (text.includes(kw.toLowerCase())) {
          scores[category] = (scores[category] || 0) + 1
        }
      }
    }
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category)
}

/**
 * キャッシュされたデータを取得（将来的に実装）
 */
export async function getCachedAggregatedData(
  shoeId: string
): Promise<AggregatedReviewData | null> {
  // TODO: Redisまたはデータベースからキャッシュを取得
  return null
}

/**
 * データをキャッシュ（将来的に実装）
 */
export async function cacheAggregatedData(
  data: AggregatedReviewData,
  ttl: number = 3600
): Promise<void> {
  // TODO: Redisまたはデータベースにキャッシュを保存
}

