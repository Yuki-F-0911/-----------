"""
YouTube レビュー収集モジュール
YouTube Data API v3を使用してレビュー動画を検索
"""

import json
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import requests
from config import YOUTUBE_API_KEY


@dataclass
class YouTubeVideo:
    video_id: str
    title: str
    channel_name: str
    channel_id: str
    description: str
    published_at: str
    thumbnail_url: str
    view_count: Optional[int] = None
    like_count: Optional[int] = None
    comment_count: Optional[int] = None

    @property
    def url(self) -> str:
        return f'https://www.youtube.com/watch?v={self.video_id}'

    def to_dict(self):
        d = asdict(self)
        d['url'] = self.url
        return d


def search_youtube_videos(
    query: str,
    max_results: int = 10,
    order: str = 'relevance',  # relevance, date, rating, viewCount
    published_after: Optional[str] = None,
) -> List[YouTubeVideo]:
    """
    YouTube動画を検索
    
    Args:
        query: 検索クエリ
        max_results: 最大結果数
        order: 並び順
        published_after: この日付以降（ISO 8601形式）
    """
    if not YOUTUBE_API_KEY:
        print('⚠️ YOUTUBE_API_KEYが設定されていません')
        return []

    try:
        params = {
            'part': 'snippet',
            'q': query,
            'type': 'video',
            'maxResults': min(max_results, 50),
            'order': order,
            'key': YOUTUBE_API_KEY,
            'regionCode': 'JP',
            'relevanceLanguage': 'ja',
        }

        if published_after:
            params['publishedAfter'] = published_after

        response = requests.get(
            'https://www.googleapis.com/youtube/v3/search',
            params=params,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        videos = []
        for item in data.get('items', []):
            snippet = item.get('snippet', {})
            video = YouTubeVideo(
                video_id=item['id']['videoId'],
                title=snippet.get('title', ''),
                channel_name=snippet.get('channelTitle', ''),
                channel_id=snippet.get('channelId', ''),
                description=snippet.get('description', ''),
                published_at=snippet.get('publishedAt', ''),
                thumbnail_url=snippet.get('thumbnails', {}).get('high', {}).get('url', ''),
            )
            videos.append(video)

        # 追加の統計情報を取得（オプション）
        if videos:
            videos = enrich_video_stats(videos)

        return videos

    except requests.exceptions.HTTPError as e:
        error_data = e.response.json() if e.response else {}
        error_message = error_data.get('error', {}).get('message', str(e))
        print(f'❌ YouTube API HTTPエラー: {error_message}')
        return []
    except Exception as e:
        print(f'❌ YouTube検索エラー: {e}')
        return []


def enrich_video_stats(videos: List[YouTubeVideo]) -> List[YouTubeVideo]:
    """動画の統計情報を追加取得"""
    if not YOUTUBE_API_KEY or not videos:
        return videos

    try:
        video_ids = ','.join([v.video_id for v in videos])
        response = requests.get(
            'https://www.googleapis.com/youtube/v3/videos',
            params={
                'part': 'statistics',
                'id': video_ids,
                'key': YOUTUBE_API_KEY,
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        stats_map = {}
        for item in data.get('items', []):
            stats = item.get('statistics', {})
            stats_map[item['id']] = {
                'view_count': int(stats.get('viewCount', 0)),
                'like_count': int(stats.get('likeCount', 0)),
                'comment_count': int(stats.get('commentCount', 0)),
            }

        for video in videos:
            if video.video_id in stats_map:
                stats = stats_map[video.video_id]
                video.view_count = stats['view_count']
                video.like_count = stats['like_count']
                video.comment_count = stats['comment_count']

        return videos

    except Exception as e:
        print(f'⚠️ 統計情報の取得に失敗: {e}')
        return videos


def search_shoe_reviews(
    brand: str,
    model_name: str,
    max_results: int = 10,
) -> List[YouTubeVideo]:
    """
    シューズのレビュー動画を検索
    
    日本語と英語の両方で検索して結果を統合
    """
    all_videos = []
    seen_ids = set()

    queries = [
        f'{brand} {model_name} レビュー',
        f'{brand} {model_name} review',
        f'{brand} {model_name} 履いてみた',
    ]

    for query in queries:
        videos = search_youtube_videos(query, max_results=max_results // 2)
        for video in videos:
            if video.video_id not in seen_ids:
                seen_ids.add(video.video_id)
                all_videos.append(video)

    # 視聴回数でソート
    all_videos.sort(key=lambda v: v.view_count or 0, reverse=True)

    return all_videos[:max_results]


def search_running_shoe_reviews(max_results: int = 50) -> List[YouTubeVideo]:
    """
    ランニングシューズのレビュー動画を広く検索
    """
    queries = [
        'ランニングシューズ レビュー 2024',
        'running shoes review 2024',
        'マラソンシューズ おすすめ',
        'ランニングシューズ 比較',
    ]

    all_videos = []
    seen_ids = set()

    for query in queries:
        videos = search_youtube_videos(query, max_results=20)
        for video in videos:
            if video.video_id not in seen_ids:
                seen_ids.add(video.video_id)
                all_videos.append(video)

    return all_videos[:max_results]


if __name__ == '__main__':
    print('=== YouTube検索テスト ===\n')

    # 特定シューズの検索
    print('🔍 Nike Pegasus 41 のレビュー動画:')
    videos = search_shoe_reviews('Nike', 'Pegasus 41', max_results=5)
    for video in videos:
        views = f'{video.view_count:,}' if video.view_count else '不明'
        print(f'  📺 {video.title}')
        print(f'     チャンネル: {video.channel_name}')
        print(f'     視聴回数: {views}')
        print(f'     URL: {video.url}')
        print()

    # 一般的な検索
    print('\n🔍 ランニングシューズ全般のレビュー:')
    videos = search_running_shoe_reviews(max_results=5)
    for video in videos:
        print(f'  📺 {video.title[:50]}...')
        print(f'     チャンネル: {video.channel_name}')
        print()

