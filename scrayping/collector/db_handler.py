"""
データベース操作モジュール
収集したデータをPostgreSQLに登録
"""

import json
from typing import List, Dict, Optional, Any
from datetime import datetime
from dataclasses import dataclass
import psycopg2
from psycopg2.extras import RealDictCursor, Json
from config import DATABASE_URL


def get_db_connection():
    """データベース接続を取得"""
    if not DATABASE_URL:
        print('❌ DATABASE_URLが設定されていません')
        return None

    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f'❌ データベース接続エラー: {e}')
        return None


def test_connection() -> bool:
    """接続テスト"""
    conn = get_db_connection()
    if conn:
        conn.close()
        return True
    return False


# ===== シューズ操作 =====

def get_all_shoes() -> List[Dict]:
    """全シューズを取得"""
    conn = get_db_connection()
    if not conn:
        return []

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('''
                SELECT id, brand, "modelName", category, "releaseYear", 
                       "officialPrice", description, keywords, "imageUrls",
                       "createdAt", "updatedAt"
                FROM shoes
                ORDER BY "createdAt" DESC
            ''')
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        print(f'❌ シューズ取得エラー: {e}')
        return []
    finally:
        conn.close()


def get_shoe_by_brand_model(brand: str, model_name: str) -> Optional[Dict]:
    """ブランドとモデル名でシューズを検索"""
    conn = get_db_connection()
    if not conn:
        return None

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('''
                SELECT id, brand, "modelName", category, "releaseYear", 
                       "officialPrice", description, keywords
                FROM shoes
                WHERE LOWER(brand) = LOWER(%s) AND LOWER("modelName") = LOWER(%s)
            ''', (brand, model_name))
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as e:
        print(f'❌ シューズ検索エラー: {e}')
        return None
    finally:
        conn.close()


def create_shoe(
    brand: str,
    model_name: str,
    category: str = 'ランニング',
    release_year: Optional[int] = None,
    official_price: Optional[int] = None,
    description: Optional[str] = None,
    keywords: Optional[List[str]] = None,
) -> Optional[str]:
    """シューズを新規作成"""
    conn = get_db_connection()
    if not conn:
        return None

    try:
        with conn.cursor() as cur:
            cur.execute('''
                INSERT INTO shoes (id, brand, "modelName", category, "releaseYear", 
                                   "officialPrice", description, keywords, "imageUrls",
                                   "createdAt", "updatedAt")
                VALUES (gen_random_uuid()::text, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id
            ''', (
                brand,
                model_name,
                category,
                release_year,
                official_price,
                description,
                keywords or [],
                [],
            ))
            shoe_id = cur.fetchone()[0]
            conn.commit()
            return shoe_id
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        print(f'⚠️ シューズは既に存在します: {brand} {model_name}')
        return None
    except Exception as e:
        conn.rollback()
        print(f'❌ シューズ作成エラー: {e}')
        return None
    finally:
        conn.close()


def ensure_shoe_exists(
    brand: str,
    model_name: str,
    category: str = 'ランニング',
) -> Optional[str]:
    """シューズが存在しなければ作成し、IDを返す"""
    existing = get_shoe_by_brand_model(brand, model_name)
    if existing:
        return existing['id']
    
    return create_shoe(brand, model_name, category)


# ===== キュレーションソース操作 =====

def create_curated_source(
    shoe_id: str,
    source_type: str,  # OFFICIAL, MARKETPLACE, SNS, VIDEO, ARTICLE, COMMUNITY
    platform: str,
    title: str,
    url: str,
    author: Optional[str] = None,
    excerpt: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    language: str = 'ja',
    country: str = 'JP',
    reliability: float = 0.7,
    metadata: Optional[Dict] = None,
) -> Optional[str]:
    """キュレーションソースを作成"""
    conn = get_db_connection()
    if not conn:
        return None

    try:
        with conn.cursor() as cur:
            # 重複チェック
            cur.execute('''
                SELECT id FROM "curatedSources" WHERE url = %s AND "shoeId" = %s
            ''', (url, shoe_id))
            if cur.fetchone():
                print(f'⚠️ 既に登録済み: {url[:50]}...')
                return None

            cur.execute('''
                INSERT INTO "curatedSources" (
                    id, "shoeId", type, platform, title, excerpt, url,
                    author, language, country, "thumbnailUrl", reliability,
                    metadata, status, tags, "createdAt", "updatedAt"
                )
                VALUES (
                    gen_random_uuid()::text, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, 'PUBLISHED', %s, NOW(), NOW()
                )
                RETURNING id
            ''', (
                shoe_id,
                source_type,
                platform,
                title,
                excerpt,
                url,
                author,
                language,
                country,
                thumbnail_url,
                reliability,
                Json(metadata) if metadata else None,
                [],
            ))
            source_id = cur.fetchone()[0]
            conn.commit()
            return source_id
    except Exception as e:
        conn.rollback()
        print(f'❌ ソース作成エラー: {e}')
        return None
    finally:
        conn.close()


def get_curated_sources_for_shoe(shoe_id: str) -> List[Dict]:
    """シューズのキュレーションソースを取得"""
    conn = get_db_connection()
    if not conn:
        return []

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute('''
                SELECT id, type, platform, title, excerpt, url, author,
                       "thumbnailUrl", reliability, "createdAt"
                FROM "curatedSources"
                WHERE "shoeId" = %s AND status = 'PUBLISHED'
                ORDER BY reliability DESC, "createdAt" DESC
            ''', (shoe_id,))
            return [dict(row) for row in cur.fetchall()]
    except Exception as e:
        print(f'❌ ソース取得エラー: {e}')
        return []
    finally:
        conn.close()


# ===== AIソース操作 =====

def create_ai_source(
    review_id: str,
    source_type: str,  # WEB_ARTICLE, YOUTUBE_VIDEO
    source_url: str,
    source_title: Optional[str] = None,
    source_author: Optional[str] = None,
    youtube_video_id: Optional[str] = None,
    summary: Optional[str] = None,
    raw_data: Optional[Dict] = None,
    reliability: float = 0.5,
) -> Optional[str]:
    """AIソースを作成"""
    conn = get_db_connection()
    if not conn:
        return None

    try:
        with conn.cursor() as cur:
            cur.execute('''
                INSERT INTO ai_sources (
                    id, "reviewId", "sourceType", "sourceUrl", "sourceTitle",
                    "sourceAuthor", "youtubeVideoId", summary, "rawData",
                    reliability, "scrapedAt"
                )
                VALUES (
                    gen_random_uuid()::text, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, NOW()
                )
                RETURNING id
            ''', (
                review_id,
                source_type,
                source_url,
                source_title,
                source_author,
                youtube_video_id,
                summary,
                Json(raw_data) if raw_data else None,
                reliability,
            ))
            source_id = cur.fetchone()[0]
            conn.commit()
            return source_id
    except Exception as e:
        conn.rollback()
        print(f'❌ AIソース作成エラー: {e}')
        return None
    finally:
        conn.close()


# ===== 統計 =====

def get_stats() -> Dict:
    """データベースの統計情報を取得"""
    conn = get_db_connection()
    if not conn:
        return {}

    try:
        with conn.cursor() as cur:
            stats = {}
            
            cur.execute('SELECT COUNT(*) FROM shoes')
            stats['shoes'] = cur.fetchone()[0]
            
            cur.execute('SELECT COUNT(*) FROM reviews')
            stats['reviews'] = cur.fetchone()[0]
            
            cur.execute('SELECT COUNT(*) FROM "curatedSources"')
            stats['curated_sources'] = cur.fetchone()[0]
            
            cur.execute('SELECT COUNT(*) FROM ai_sources')
            stats['ai_sources'] = cur.fetchone()[0]
            
            return stats
    except Exception as e:
        print(f'❌ 統計取得エラー: {e}')
        return {}
    finally:
        conn.close()


if __name__ == '__main__':
    print('=== データベース接続テスト ===\n')

    if test_connection():
        print('✅ データベース接続成功\n')
        
        stats = get_stats()
        print('📊 統計:')
        for key, value in stats.items():
            print(f'   {key}: {value}')
        
        print('\n📦 登録済みシューズ:')
        shoes = get_all_shoes()
        for shoe in shoes[:10]:
            print(f'   - {shoe["brand"]} {shoe["modelName"]}')
        if len(shoes) > 10:
            print(f'   ... 他 {len(shoes) - 10} 件')
    else:
        print('❌ データベース接続失敗')

