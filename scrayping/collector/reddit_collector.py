"""
Reddit レビュー収集モジュール
Reddit APIを使用してランニングシューズのレビューを検索

⚠️ 著作権注意:
- 投稿の全文転載は行わない
- タイトル、URL、メタデータのみを収集
- 詳細は元の投稿を参照してもらう形式
"""

import json
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import praw
from config import REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT


@dataclass
class RedditPost:
    post_id: str
    title: str
    subreddit: str
    author: str
    score: int
    num_comments: int
    url: str
    permalink: str
    created_utc: float
    # 全文は著作権の観点から保存しない
    # 代わりに最初の一部のみをプレビューとして保持
    preview: str = ''
    
    @property
    def full_url(self) -> str:
        return f'https://www.reddit.com{self.permalink}'

    @property
    def created_at(self) -> datetime:
        return datetime.fromtimestamp(self.created_utc)

    def to_dict(self):
        d = asdict(self)
        d['full_url'] = self.full_url
        d['created_at'] = self.created_at.isoformat()
        return d


def get_reddit_client() -> Optional[praw.Reddit]:
    """Reddit APIクライアントを取得"""
    if not REDDIT_CLIENT_ID or not REDDIT_CLIENT_SECRET:
        print('⚠️ Reddit API認証情報が設定されていません')
        print('   REDDIT_CLIENT_IDとREDDIT_CLIENT_SECRETを設定してください')
        return None

    try:
        reddit = praw.Reddit(
            client_id=REDDIT_CLIENT_ID,
            client_secret=REDDIT_CLIENT_SECRET,
            user_agent=REDDIT_USER_AGENT,
        )
        # 接続テスト
        reddit.read_only = True
        return reddit
    except Exception as e:
        print(f'❌ Reddit API接続エラー: {e}')
        return None


def search_reddit_posts(
    query: str,
    subreddits: Optional[List[str]] = None,
    max_results: int = 25,
    sort: str = 'relevance',  # relevance, hot, top, new
    time_filter: str = 'year',  # all, day, week, month, year
) -> List[RedditPost]:
    """
    Redditで投稿を検索
    
    Args:
        query: 検索クエリ
        subreddits: 検索対象のサブレディット（Noneの場合は全体検索）
        max_results: 最大結果数
        sort: 並び順
        time_filter: 期間フィルター
    """
    reddit = get_reddit_client()
    if not reddit:
        return []

    try:
        posts = []
        
        if subreddits:
            # 特定のサブレディットで検索
            for subreddit_name in subreddits:
                try:
                    subreddit = reddit.subreddit(subreddit_name)
                    results = subreddit.search(
                        query,
                        sort=sort,
                        time_filter=time_filter,
                        limit=max_results // len(subreddits)
                    )
                    for submission in results:
                        post = _submission_to_post(submission)
                        posts.append(post)
                except Exception as e:
                    print(f'⚠️ r/{subreddit_name} の検索エラー: {e}')
        else:
            # 全体検索
            results = reddit.subreddit('all').search(
                query,
                sort=sort,
                time_filter=time_filter,
                limit=max_results
            )
            for submission in results:
                post = _submission_to_post(submission)
                posts.append(post)

        # スコアでソート
        posts.sort(key=lambda p: p.score, reverse=True)
        return posts[:max_results]

    except Exception as e:
        print(f'❌ Reddit検索エラー: {e}')
        return []


def _submission_to_post(submission) -> RedditPost:
    """Submissionオブジェクトを RedditPost に変換"""
    # 本文のプレビュー（最初の200文字のみ）
    selftext = submission.selftext or ''
    preview = selftext[:200] + '...' if len(selftext) > 200 else selftext

    return RedditPost(
        post_id=submission.id,
        title=submission.title,
        subreddit=submission.subreddit.display_name,
        author=str(submission.author) if submission.author else '[deleted]',
        score=submission.score,
        num_comments=submission.num_comments,
        url=submission.url,
        permalink=submission.permalink,
        created_utc=submission.created_utc,
        preview=preview,
    )


def search_shoe_reviews_reddit(
    brand: str,
    model_name: str,
    max_results: int = 10,
) -> List[RedditPost]:
    """
    シューズのレビュー投稿を検索
    """
    # ランニング関連のサブレディット
    running_subreddits = [
        'running',
        'RunningShoeGeeks',
        'AdvancedRunning',
        'Marathon',
        'trailrunning',
    ]

    queries = [
        f'{brand} {model_name}',
        f'{brand} {model_name} review',
    ]

    all_posts = []
    seen_ids = set()

    for query in queries:
        posts = search_reddit_posts(
            query,
            subreddits=running_subreddits,
            max_results=max_results,
            sort='top',
            time_filter='year',
        )
        for post in posts:
            if post.post_id not in seen_ids:
                seen_ids.add(post.post_id)
                all_posts.append(post)

    return all_posts[:max_results]


def get_popular_running_posts(max_results: int = 50) -> List[RedditPost]:
    """
    人気のランニングシューズ関連投稿を取得
    """
    reddit = get_reddit_client()
    if not reddit:
        return []

    try:
        posts = []
        running_subreddits = ['running', 'RunningShoeGeeks', 'AdvancedRunning']
        
        for subreddit_name in running_subreddits:
            try:
                subreddit = reddit.subreddit(subreddit_name)
                # 人気投稿を取得
                for submission in subreddit.top(time_filter='month', limit=20):
                    # シューズ関連かどうか簡易チェック
                    title_lower = submission.title.lower()
                    if any(word in title_lower for word in ['shoe', 'シューズ', 'review', 'レビュー']):
                        post = _submission_to_post(submission)
                        posts.append(post)
            except Exception as e:
                print(f'⚠️ r/{subreddit_name} の取得エラー: {e}')

        posts.sort(key=lambda p: p.score, reverse=True)
        return posts[:max_results]

    except Exception as e:
        print(f'❌ Reddit取得エラー: {e}')
        return []


if __name__ == '__main__':
    print('=== Reddit検索テスト ===\n')

    # 特定シューズの検索
    print('🔍 Nike Pegasus 41 のReddit投稿:')
    posts = search_shoe_reviews_reddit('Nike', 'Pegasus 41', max_results=5)
    
    if not posts:
        print('  ⚠️ 投稿が見つからないか、API認証が設定されていません')
    else:
        for post in posts:
            print(f'  📝 {post.title[:60]}...')
            print(f'     r/{post.subreddit} | スコア: {post.score} | コメント: {post.num_comments}')
            print(f'     URL: {post.full_url}')
            print()

    # 人気投稿
    print('\n🔥 人気のランニングシューズ投稿:')
    popular = get_popular_running_posts(max_results=5)
    for post in popular:
        print(f'  📝 {post.title[:60]}...')
        print(f'     r/{post.subreddit} | スコア: {post.score}')
        print()

