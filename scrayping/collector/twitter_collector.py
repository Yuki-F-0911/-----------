"""
X (Twitter) レビュー収集モジュール
Twitter API v2を使用してランニングシューズのレビューを検索

⚠️ 著作権・プライバシー注意:
- ツイートの全文転載は行わない
- URLとメタデータのみを収集
- 詳細は元のツイートを参照してもらう形式
"""

import json
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import requests
try:
    import tweepy
    TWEEPY_AVAILABLE = True
except ImportError:
    TWEEPY_AVAILABLE = False
from config import (
    TWITTER_API_KEY,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_TOKEN_SECRET,
    TWITTER_BEARER_TOKEN,
)


@dataclass
class Tweet:
    tweet_id: str
    text_preview: str  # 最初の100文字のみ
    author_username: str
    author_name: str
    created_at: str
    retweet_count: int
    like_count: int
    reply_count: int
    quote_count: int
    language: str = ''
    
    @property
    def url(self) -> str:
        return f'https://twitter.com/{self.author_username}/status/{self.tweet_id}'

    def to_dict(self):
        d = asdict(self)
        d['url'] = self.url
        return d


def get_twitter_client_v2():
    """Twitter API v2 クライアントを取得"""
    if not TWEEPY_AVAILABLE:
        print('⚠️ tweepyがインストールされていません: pip install tweepy')
        return None

    if TWITTER_BEARER_TOKEN:
        try:
            client = tweepy.Client(bearer_token=TWITTER_BEARER_TOKEN)
            return client
        except Exception as e:
            print(f'❌ Twitter API接続エラー: {e}')
            return None
    elif TWITTER_API_KEY and TWITTER_API_SECRET:
        try:
            client = tweepy.Client(
                consumer_key=TWITTER_API_KEY,
                consumer_secret=TWITTER_API_SECRET,
                access_token=TWITTER_ACCESS_TOKEN,
                access_token_secret=TWITTER_ACCESS_TOKEN_SECRET,
            )
            return client
        except Exception as e:
            print(f'❌ Twitter API接続エラー: {e}')
            return None
    else:
        print('⚠️ Twitter API認証情報が設定されていません')
        print('   TWITTER_BEARER_TOKENまたはTWITTER_API_KEY/SECRETを設定してください')
        return None


def search_tweets(
    query: str,
    max_results: int = 10,
    lang: Optional[str] = None,
) -> List[Tweet]:
    """
    ツイートを検索
    
    Args:
        query: 検索クエリ
        max_results: 最大結果数（10-100）
        lang: 言語フィルター（ja, en等）
    """
    client = get_twitter_client_v2()
    if not client:
        return []

    try:
        # クエリを構築
        full_query = query
        if lang:
            full_query += f' lang:{lang}'
        
        # リツイートを除外
        full_query += ' -is:retweet'

        # 検索実行
        response = client.search_recent_tweets(
            query=full_query,
            max_results=min(max_results, 100),
            tweet_fields=['created_at', 'public_metrics', 'lang', 'author_id'],
            user_fields=['username', 'name'],
            expansions=['author_id'],
        )

        if not response.data:
            return []

        # ユーザー情報のマップを作成
        users = {}
        if response.includes and 'users' in response.includes:
            for user in response.includes['users']:
                users[user.id] = {
                    'username': user.username,
                    'name': user.name,
                }

        tweets = []
        for tweet in response.data:
            user_info = users.get(tweet.author_id, {})
            metrics = tweet.public_metrics or {}
            
            # テキストのプレビュー（最初の100文字のみ）
            text_preview = tweet.text[:100] + '...' if len(tweet.text) > 100 else tweet.text

            tweets.append(Tweet(
                tweet_id=str(tweet.id),
                text_preview=text_preview,
                author_username=user_info.get('username', ''),
                author_name=user_info.get('name', ''),
                created_at=tweet.created_at.isoformat() if tweet.created_at else '',
                retweet_count=metrics.get('retweet_count', 0),
                like_count=metrics.get('like_count', 0),
                reply_count=metrics.get('reply_count', 0),
                quote_count=metrics.get('quote_count', 0),
                language=tweet.lang or '',
            ))

        # いいね数でソート
        tweets.sort(key=lambda t: t.like_count, reverse=True)
        return tweets

    except tweepy.errors.TooManyRequests:
        print('❌ Twitter APIレート制限に達しました。しばらく待ってから再試行してください。')
        return []
    except tweepy.errors.Forbidden as e:
        print(f'❌ Twitter APIアクセス拒否: {e}')
        print('   APIプランを確認してください（Free/Basic/Pro）')
        return []
    except Exception as e:
        print(f'❌ Twitter検索エラー: {e}')
        return []


def search_shoe_reviews_twitter(
    brand: str,
    model_name: str,
    max_results: int = 10,
) -> List[Tweet]:
    """
    シューズのレビューツイートを検索
    """
    queries = [
        f'{brand} {model_name} レビュー',
        f'{brand} {model_name} 履いてみた',
        f'{brand} {model_name} review',
    ]

    all_tweets = []
    seen_ids = set()

    for query in queries:
        tweets = search_tweets(query, max_results=max_results // 2)
        for tweet in tweets:
            if tweet.tweet_id not in seen_ids:
                seen_ids.add(tweet.tweet_id)
                all_tweets.append(tweet)

    # いいね数でソート
    all_tweets.sort(key=lambda t: t.like_count, reverse=True)
    return all_tweets[:max_results]


def search_running_tweets(max_results: int = 50) -> List[Tweet]:
    """
    ランニングシューズ関連のツイートを広く検索
    """
    queries = [
        'ランニングシューズ レビュー',
        'マラソンシューズ おすすめ',
        'running shoes review',
    ]

    all_tweets = []
    seen_ids = set()

    for query in queries:
        tweets = search_tweets(query, max_results=30, lang='ja')
        for tweet in tweets:
            if tweet.tweet_id not in seen_ids:
                seen_ids.add(tweet.tweet_id)
                all_tweets.append(tweet)
        
        # 英語も
        tweets_en = search_tweets(query, max_results=20, lang='en')
        for tweet in tweets_en:
            if tweet.tweet_id not in seen_ids:
                seen_ids.add(tweet.tweet_id)
                all_tweets.append(tweet)

    all_tweets.sort(key=lambda t: t.like_count, reverse=True)
    return all_tweets[:max_results]


if __name__ == '__main__':
    print('=== X (Twitter) 検索テスト ===\n')

    # 特定シューズの検索
    print('🔍 Nike Pegasus 41 のツイート:')
    tweets = search_shoe_reviews_twitter('Nike', 'Pegasus 41', max_results=5)
    
    if not tweets:
        print('  ⚠️ ツイートが見つからないか、API認証が設定されていません')
    else:
        for tweet in tweets:
            print(f'  🐦 {tweet.text_preview}')
            print(f'     @{tweet.author_username} | ❤️ {tweet.like_count} | 🔁 {tweet.retweet_count}')
            print(f'     URL: {tweet.url}')
            print()

    # 一般検索
    print('\n🔍 ランニングシューズ関連ツイート:')
    running_tweets = search_running_tweets(max_results=5)
    for tweet in running_tweets:
        print(f'  🐦 {tweet.text_preview}')
        print(f'     @{tweet.author_username} | ❤️ {tweet.like_count}')
        print()

