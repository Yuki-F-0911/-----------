"""
シューズ名抽出モジュール
競合サイトや検索結果からシューズ名を抽出
"""

import re
import json
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
import requests
from config import (
    SERPER_API_KEY, 
    GOOGLE_SEARCH_API_KEY, 
    GOOGLE_SEARCH_ENGINE_ID,
    POPULAR_BRANDS,
    POPULAR_MODELS
)


@dataclass
class ShoeInfo:
    brand: str
    model_name: str
    category: str = 'ランニング'
    year: Optional[int] = None
    source: str = ''
    source_url: str = ''

    def to_dict(self):
        return asdict(self)


def search_with_serper(query: str, num_results: int = 10) -> List[Dict]:
    """Serper APIで検索"""
    if not SERPER_API_KEY:
        print('⚠️ SERPER_API_KEYが設定されていません')
        return []

    try:
        response = requests.post(
            'https://google.serper.dev/search',
            headers={
                'Content-Type': 'application/json',
                'X-API-KEY': SERPER_API_KEY,
            },
            json={
                'q': query,
                'num': num_results,
                'gl': 'jp',
                'hl': 'ja',
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        return data.get('organic', [])
    except Exception as e:
        print(f'❌ Serper検索エラー: {e}')
        return []


def search_with_google(query: str, num_results: int = 10) -> List[Dict]:
    """Google Custom Search APIで検索"""
    if not GOOGLE_SEARCH_API_KEY or not GOOGLE_SEARCH_ENGINE_ID:
        print('⚠️ Google Search APIが設定されていません')
        return []

    try:
        response = requests.get(
            'https://www.googleapis.com/customsearch/v1',
            params={
                'key': GOOGLE_SEARCH_API_KEY,
                'cx': GOOGLE_SEARCH_ENGINE_ID,
                'q': query,
                'num': min(num_results, 10),
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        return [
            {
                'title': item.get('title', ''),
                'link': item.get('link', ''),
                'snippet': item.get('snippet', ''),
            }
            for item in data.get('items', [])
        ]
    except Exception as e:
        print(f'❌ Google検索エラー: {e}')
        return []


def extract_shoe_names_from_text(text: str, source: str = '', source_url: str = '') -> List[ShoeInfo]:
    """テキストからシューズ名を抽出"""
    shoes = []
    text_lower = text.lower()

    for brand in POPULAR_BRANDS:
        brand_lower = brand.lower()
        if brand_lower in text_lower:
            # ブランド名に続くモデル名を抽出
            patterns = [
                # Nike Pegasus 41 などのパターン
                rf'{re.escape(brand)}\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*(\d+)?',
                # ナイキ ペガサス などの日本語パターン
                rf'{get_japanese_brand(brand)}\s*([ァ-ヶー]+(?:\s*[ァ-ヶー]+)?)\s*(\d+)?',
            ]
            
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    model_name = match.group(1).strip()
                    version = match.group(2) if len(match.groups()) > 1 else None
                    
                    if model_name and len(model_name) > 2:
                        full_model = f'{model_name} {version}' if version else model_name
                        shoes.append(ShoeInfo(
                            brand=brand,
                            model_name=full_model,
                            source=source,
                            source_url=source_url,
                        ))

    # 既知のモデルを直接検索
    for brand, model in POPULAR_MODELS:
        if brand.lower() in text_lower and model.lower() in text_lower:
            # 重複チェック
            exists = any(
                s.brand == brand and s.model_name.lower() == model.lower() 
                for s in shoes
            )
            if not exists:
                shoes.append(ShoeInfo(
                    brand=brand,
                    model_name=model,
                    source=source,
                    source_url=source_url,
                ))

    return shoes


def get_japanese_brand(english_brand: str) -> str:
    """英語ブランド名を日本語に変換"""
    mapping = {
        'Nike': 'ナイキ',
        'Adidas': 'アディダス',
        'ASICS': 'アシックス',
        'New Balance': 'ニューバランス',
        'Hoka': 'ホカ',
        'On': 'オン',
        'Saucony': 'サッカニー',
        'Brooks': 'ブルックス',
        'Mizuno': 'ミズノ',
        'Puma': 'プーマ',
        'Under Armour': 'アンダーアーマー',
        'Reebok': 'リーボック',
    }
    return mapping.get(english_brand, english_brand)


def find_trending_shoes(num_results: int = 30) -> List[ShoeInfo]:
    """トレンドのシューズを検索して抽出"""
    all_shoes = []
    
    queries = [
        'ランニングシューズ 2024 新作 おすすめ',
        'マラソンシューズ 2024 レビュー',
        'ランニングシューズ 人気ランキング',
        'トレーニングシューズ レビュー 比較',
        'best running shoes 2024 review',
    ]

    for query in queries:
        print(f'🔍 検索中: {query}')
        
        # Serper APIを試す
        results = search_with_serper(query, 10)
        
        # フォールバック
        if not results:
            results = search_with_google(query, 10)
        
        for result in results:
            title = result.get('title', '')
            snippet = result.get('snippet', '')
            url = result.get('link', '')
            
            text = f'{title} {snippet}'
            shoes = extract_shoe_names_from_text(text, 'web_search', url)
            all_shoes.extend(shoes)

    # 重複を除去
    unique_shoes = []
    seen = set()
    for shoe in all_shoes:
        key = (shoe.brand.lower(), shoe.model_name.lower())
        if key not in seen:
            seen.add(key)
            unique_shoes.append(shoe)

    return unique_shoes[:num_results]


def get_shoes_from_predefined_list() -> List[ShoeInfo]:
    """事前定義されたリストからシューズ情報を取得"""
    return [
        ShoeInfo(brand=brand, model_name=model, source='predefined')
        for brand, model in POPULAR_MODELS
    ]


if __name__ == '__main__':
    print('=== シューズ検索テスト ===\n')
    
    print('📋 事前定義リスト:')
    predefined = get_shoes_from_predefined_list()
    for shoe in predefined[:10]:
        print(f'  - {shoe.brand} {shoe.model_name}')
    print(f'  ... 合計 {len(predefined)} 件\n')
    
    print('🔍 トレンド検索:')
    trending = find_trending_shoes(20)
    for shoe in trending:
        print(f'  - {shoe.brand} {shoe.model_name} (出典: {shoe.source})')
    print(f'\n合計 {len(trending)} 件のシューズを発見')

