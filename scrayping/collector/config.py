"""
設定ファイル
環境変数からAPIキーなどを読み込み
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# プロジェクトルートの.env.localを読み込み
project_root = Path(__file__).parent.parent.parent
env_file = project_root / '.env.local'
if env_file.exists():
    load_dotenv(env_file)
else:
    # .envも試す
    env_file = project_root / '.env'
    if env_file.exists():
        load_dotenv(env_file)

# データベース設定
DATABASE_URL = os.getenv('DATABASE_URL', '')

# YouTube API
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY') or os.getenv('YouTube_API_Key', '')

# AI要約
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

# Web検索
SERPER_API_KEY = os.getenv('SERPER_API_KEY', '')
GOOGLE_SEARCH_API_KEY = os.getenv('GOOGLE_SEARCH_API_KEY', '')
GOOGLE_SEARCH_ENGINE_ID = os.getenv('GOOGLE_SEARCH_ENGINE_ID', '')

# Reddit API
REDDIT_CLIENT_ID = os.getenv('REDDIT_CLIENT_ID', '')
REDDIT_CLIENT_SECRET = os.getenv('REDDIT_CLIENT_SECRET', '')
REDDIT_USER_AGENT = os.getenv('REDDIT_USER_AGENT', 'ShoeReviewCollector/1.0')

# X (Twitter) API
TWITTER_API_KEY = os.getenv('TWITTER_API_KEY', '')
TWITTER_API_SECRET = os.getenv('TWITTER_API_SECRET', '')
TWITTER_ACCESS_TOKEN = os.getenv('TWITTER_ACCESS_TOKEN', '')
TWITTER_ACCESS_TOKEN_SECRET = os.getenv('TWITTER_ACCESS_TOKEN_SECRET', '')
TWITTER_BEARER_TOKEN = os.getenv('TWITTER_BEARER_TOKEN', '')

# 楽天API
RAKUTEN_APPLICATION_ID = os.getenv('RAKUTEN_APPLICATION_ID', '')
RAKUTEN_AFFILIATE_ID = os.getenv('RAKUTEN_AFFILIATE_ID', '')

# 競合サイト（参照用）
COMPETITOR_SITES = [
    {
        'name': 'Runtrip',
        'url': 'https://runtrip.jp/running-shoes',
        'type': 'article_site',
    },
    {
        'name': 'Running Warehouse Japan',
        'url': 'https://www.runningwarehouse.jp/',
        'type': 'ec_site',
    },
    {
        'name': 'Step Sports',
        'url': 'https://www.step-sports.co.jp/',
        'type': 'ec_site',
    },
]

# 人気ブランド
POPULAR_BRANDS = [
    'Nike',
    'Adidas',
    'ASICS',
    'New Balance',
    'Hoka',
    'On',
    'Saucony',
    'Brooks',
    'Mizuno',
    'Puma',
    'Under Armour',
    'Reebok',
]

# 人気モデル（検索用）
POPULAR_MODELS = [
    ('Nike', 'Pegasus 41'),
    ('Nike', 'Vaporfly 3'),
    ('Nike', 'Alphafly 3'),
    ('Nike', 'Vomero 18'),
    ('Nike', 'Invincible 3'),
    ('Adidas', 'Adizero Adios Pro 3'),
    ('Adidas', 'Adizero Boston 12'),
    ('Adidas', 'Ultraboost Light'),
    ('ASICS', 'Gel-Kayano 30'),
    ('ASICS', 'Gel-Nimbus 26'),
    ('ASICS', 'Novablast 4'),
    ('ASICS', 'Metaspeed Sky+'),
    ('ASICS', 'Superblast'),
    ('New Balance', 'FuelCell SC Elite v4'),
    ('New Balance', 'Fresh Foam 1080v13'),
    ('New Balance', 'FuelCell Rebel v4'),
    ('Hoka', 'Clifton 9'),
    ('Hoka', 'Bondi 8'),
    ('Hoka', 'Mach 6'),
    ('Hoka', 'Rocket X 2'),
    ('On', 'Cloudmonster'),
    ('On', 'Cloudsurfer'),
    ('On', 'Cloudstratus'),
    ('Saucony', 'Endorphin Pro 4'),
    ('Saucony', 'Kinvara 14'),
    ('Brooks', 'Ghost 16'),
    ('Brooks', 'Glycerin 21'),
    ('Mizuno', 'Wave Rebellion Pro 2'),
    ('Mizuno', 'Wave Rider 27'),
]


def check_config():
    """設定状況を確認"""
    status = {
        'database': bool(DATABASE_URL),
        'youtube': bool(YOUTUBE_API_KEY),
        'openai': bool(OPENAI_API_KEY),
        'gemini': bool(GEMINI_API_KEY),
        'serper': bool(SERPER_API_KEY),
        'google_search': bool(GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID),
        'reddit': bool(REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET),
        'twitter': bool(TWITTER_BEARER_TOKEN or (TWITTER_API_KEY and TWITTER_API_SECRET)),
        'rakuten': bool(RAKUTEN_APPLICATION_ID),
    }
    return status


if __name__ == '__main__':
    print('=== 設定状況 ===')
    status = check_config()
    for key, value in status.items():
        emoji = '✅' if value else '❌'
        print(f'{emoji} {key}: {"設定済み" if value else "未設定"}')

