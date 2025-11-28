"""
Web検索ベースのソーシャル収集モジュール
X(Twitter), Redditの投稿をWeb検索経由で取得

X/Twitter APIが不要で、Serper APIのみで動作
"""

import re
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
import requests
from config import SERPER_API_KEY, GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID


@dataclass
class SocialPost:
    """ソーシャルメディア投稿"""
    platform: str  # twitter, reddit, etc.
    title: str
    url: str
    snippet: str
    author: str = ''
    post_type: str = ''  # tweet, reddit_post, etc.

    def to_dict(self):
        return asdict(self)


def search_serper(query: str, num_results: int = 10) -> List[Dict]:
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


def extract_twitter_username(url: str) -> str:
    """URLからTwitterユーザー名を抽出"""
    patterns = [
        r'(?:twitter\.com|x\.com)/([^/]+)/status',
        r'(?:twitter\.com|x\.com)/([^/]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            username = match.group(1)
            if username not in ['search', 'hashtag', 'i', 'intent']:
                return username
    return ''


def extract_reddit_info(url: str) -> Dict:
    """URLからReddit情報を抽出"""
    info = {'subreddit': '', 'type': 'post'}
    
    # r/subreddit/comments/... パターン
    match = re.search(r'reddit\.com/r/([^/]+)', url)
    if match:
        info['subreddit'] = match.group(1)
    
    if '/comments/' in url:
        info['type'] = 'post'
    elif '/r/' in url:
        info['type'] = 'subreddit'
    
    return info


def search_twitter_posts(
    query: str,
    max_results: int = 10,
    lang: str = 'ja',
) -> List[SocialPost]:
    """
    Web検索経由でX(Twitter)の投稿を検索
    Twitter APIなしで動作
    """
    # site:twitter.com OR site:x.com で検索
    search_query = f'{query} (site:twitter.com OR site:x.com)'
    
    results = search_serper(search_query, max_results * 2)
    
    posts = []
    seen_urls = set()
    
    for result in results:
        url = result.get('link', '')
        
        # Twitter/X のURLのみ
        if not ('twitter.com' in url or 'x.com' in url):
            continue
        
        # 重複チェック
        if url in seen_urls:
            continue
        seen_urls.add(url)
        
        # ステータスページ（実際のツイート）のみ
        if '/status/' not in url:
            continue
        
        username = extract_twitter_username(url)
        title = result.get('title', '')
        snippet = result.get('snippet', '')
        
        posts.append(SocialPost(
            platform='twitter',
            title=title,
            url=url,
            snippet=snippet,
            author=f'@{username}' if username else '',
            post_type='tweet',
        ))
        
        if len(posts) >= max_results:
            break
    
    return posts


def search_reddit_posts_via_web(
    query: str,
    max_results: int = 10,
    subreddits: Optional[List[str]] = None,
) -> List[SocialPost]:
    """
    Web検索経由でRedditの投稿を検索
    Reddit APIなしで動作
    """
    # site:reddit.com で検索
    if subreddits:
        subreddit_query = ' OR '.join([f'site:reddit.com/r/{s}' for s in subreddits])
        search_query = f'{query} ({subreddit_query})'
    else:
        search_query = f'{query} site:reddit.com'
    
    results = search_serper(search_query, max_results * 2)
    
    posts = []
    seen_urls = set()
    
    for result in results:
        url = result.get('link', '')
        
        # Reddit のURLのみ
        if 'reddit.com' not in url:
            continue
        
        # 重複チェック
        if url in seen_urls:
            continue
        seen_urls.add(url)
        
        # 実際の投稿ページのみ
        if '/comments/' not in url:
            continue
        
        reddit_info = extract_reddit_info(url)
        title = result.get('title', '')
        snippet = result.get('snippet', '')
        
        posts.append(SocialPost(
            platform='reddit',
            title=title,
            url=url,
            snippet=snippet,
            author=f'r/{reddit_info["subreddit"]}' if reddit_info['subreddit'] else '',
            post_type='reddit_post',
        ))
        
        if len(posts) >= max_results:
            break
    
    return posts


def search_shoe_reviews_social(
    brand: str,
    model_name: str,
    max_results: int = 10,
    platforms: Optional[List[str]] = None,
) -> Dict[str, List[SocialPost]]:
    """
    シューズのレビューをソーシャルメディアから検索
    
    Args:
        brand: ブランド名
        model_name: モデル名
        max_results: 各プラットフォームの最大結果数
        platforms: 検索対象 ['twitter', 'reddit']
    
    Returns:
        プラットフォームごとの投稿リスト
    """
    if platforms is None:
        platforms = ['twitter', 'reddit']
    
    results = {}
    
    queries = [
        f'{brand} {model_name} レビュー',
        f'{brand} {model_name} review',
    ]
    
    if 'twitter' in platforms:
        print('🐦 X(Twitter) 検索中...')
        twitter_posts = []
        seen = set()
        for query in queries:
            posts = search_twitter_posts(query, max_results=max_results)
            for post in posts:
                if post.url not in seen:
                    seen.add(post.url)
                    twitter_posts.append(post)
        results['twitter'] = twitter_posts[:max_results]
        print(f'   {len(results["twitter"])} 件取得')
    
    if 'reddit' in platforms:
        print('📝 Reddit 検索中...')
        running_subreddits = ['running', 'RunningShoeGeeks', 'AdvancedRunning']
        reddit_posts = []
        seen = set()
        for query in queries:
            posts = search_reddit_posts_via_web(
                query, 
                max_results=max_results,
                subreddits=running_subreddits
            )
            for post in posts:
                if post.url not in seen:
                    seen.add(post.url)
                    reddit_posts.append(post)
        results['reddit'] = reddit_posts[:max_results]
        print(f'   {len(results["reddit"])} 件取得')
    
    return results


def search_general_running_social(max_results: int = 20) -> Dict[str, List[SocialPost]]:
    """
    ランニングシューズ関連の投稿を広く検索
    """
    queries = [
        'ランニングシューズ レビュー',
        'マラソンシューズ おすすめ 2024',
        'running shoes review',
    ]
    
    all_twitter = []
    all_reddit = []
    seen_twitter = set()
    seen_reddit = set()
    
    for query in queries:
        # Twitter
        posts = search_twitter_posts(query, max_results=10)
        for post in posts:
            if post.url not in seen_twitter:
                seen_twitter.add(post.url)
                all_twitter.append(post)
        
        # Reddit
        posts = search_reddit_posts_via_web(query, max_results=10)
        for post in posts:
            if post.url not in seen_reddit:
                seen_reddit.add(post.url)
                all_reddit.append(post)
    
    return {
        'twitter': all_twitter[:max_results],
        'reddit': all_reddit[:max_results],
    }


if __name__ == '__main__':
    print('=== Web検索ベースのソーシャル収集テスト ===\n')
    
    if not SERPER_API_KEY:
        print('❌ SERPER_API_KEYが設定されていません')
        print('   .env.local に SERPER_API_KEY を追加してください')
        exit(1)
    
    # 特定シューズの検索
    print('🔍 Nike Pegasus 41 のソーシャル投稿:\n')
    results = search_shoe_reviews_social('Nike', 'Pegasus 41', max_results=5)
    
    if results.get('twitter'):
        print('\n🐦 X (Twitter):')
        for post in results['twitter']:
            print(f'   {post.author}: {post.title[:50]}...')
            print(f'   URL: {post.url}')
            print()
    
    if results.get('reddit'):
        print('\n📝 Reddit:')
        for post in results['reddit']:
            print(f'   {post.author}: {post.title[:50]}...')
            print(f'   URL: {post.url}')
            print()
    
    print('\n✅ テスト完了')

