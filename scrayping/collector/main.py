#!/usr/bin/env python3
"""
レビュー収集メインスクリプト
各モジュールを統合して実行

使用方法:
    python main.py --help
    python main.py shoes --list
    python main.py shoes --add "Nike" "Pegasus 41"
    python main.py collect --shoe-id <id> --source youtube
    python main.py collect-all --limit 10
"""

import argparse
import json
import sys
from datetime import datetime
from typing import List, Optional

# 同一ディレクトリのモジュールをインポート
from config import check_config, POPULAR_MODELS, SERPER_API_KEY
from shoe_finder import find_trending_shoes, get_shoes_from_predefined_list, ShoeInfo
from youtube_collector import search_shoe_reviews, search_running_shoe_reviews, YouTubeVideo
from web_collector import search_shoe_reviews_social, SocialPost  # Web検索ベース（API不要）
from db_handler import (
    get_all_shoes,
    get_shoe_by_brand_model,
    create_shoe,
    ensure_shoe_exists,
    create_curated_source,
    get_curated_sources_for_shoe,
    get_stats,
    test_connection,
)


def cmd_config(args):
    """設定状況を表示"""
    print('=== 設定状況 ===\n')
    status = check_config()
    for key, value in status.items():
        emoji = '✅' if value else '❌'
        print(f'{emoji} {key}: {"設定済み" if value else "未設定"}')
    
    print('\n=== データベース統計 ===')
    if test_connection():
        stats = get_stats()
        for key, value in stats.items():
            print(f'   {key}: {value}')
    else:
        print('   ❌ 接続失敗')


def cmd_shoes_list(args):
    """シューズ一覧を表示"""
    print('=== 登録済みシューズ ===\n')
    shoes = get_all_shoes()
    
    if not shoes:
        print('シューズが登録されていません')
        return

    for shoe in shoes:
        print(f'📦 {shoe["brand"]} {shoe["modelName"]}')
        print(f'   ID: {shoe["id"]}')
        print(f'   カテゴリ: {shoe["category"]}')
        if shoe.get('releaseYear'):
            print(f'   発売年: {shoe["releaseYear"]}')
        print()


def cmd_shoes_add(args):
    """シューズを追加"""
    brand = args.brand
    model_name = args.model
    category = args.category or 'ランニング'

    print(f'📦 シューズを追加: {brand} {model_name}')
    
    existing = get_shoe_by_brand_model(brand, model_name)
    if existing:
        print(f'⚠️ 既に存在します (ID: {existing["id"]})')
        return

    shoe_id = create_shoe(brand, model_name, category)
    if shoe_id:
        print(f'✅ 追加完了 (ID: {shoe_id})')
    else:
        print('❌ 追加に失敗しました')


def cmd_shoes_import(args):
    """事前定義リストからシューズをインポート"""
    print('=== シューズインポート ===\n')
    
    shoes = get_shoes_from_predefined_list()
    added = 0
    skipped = 0

    for shoe in shoes:
        shoe_id = ensure_shoe_exists(shoe.brand, shoe.model_name)
        if shoe_id:
            existing = get_shoe_by_brand_model(shoe.brand, shoe.model_name)
            if existing and existing['id'] == shoe_id:
                print(f'✅ {shoe.brand} {shoe.model_name}')
                added += 1
            else:
                print(f'⏭️ {shoe.brand} {shoe.model_name} (既存)')
                skipped += 1
        else:
            print(f'❌ {shoe.brand} {shoe.model_name}')

    print(f'\n完了: 追加 {added} 件, スキップ {skipped} 件')


def cmd_collect(args):
    """特定のシューズのレビューを収集"""
    shoe_id = args.shoe_id
    sources = args.sources.split(',') if args.sources else ['youtube', 'social']

    # シューズ情報を取得
    shoes = get_all_shoes()
    shoe = next((s for s in shoes if s['id'] == shoe_id), None)
    
    if not shoe:
        print(f'❌ シューズが見つかりません: {shoe_id}')
        return

    brand = shoe['brand']
    model_name = shoe['modelName']
    print(f'=== レビュー収集: {brand} {model_name} ===\n')

    total_collected = 0

    # YouTube
    if 'youtube' in sources:
        print('🎬 YouTube検索中...')
        videos = search_shoe_reviews(brand, model_name, max_results=10)
        for video in videos:
            source_id = create_curated_source(
                shoe_id=shoe_id,
                source_type='VIDEO',
                platform='youtube.com',
                title=video.title,
                url=video.url,
                author=video.channel_name,
                excerpt=video.description[:200] if video.description else None,
                thumbnail_url=video.thumbnail_url,
                reliability=0.8,
                metadata={
                    'video_id': video.video_id,
                    'view_count': video.view_count,
                    'like_count': video.like_count,
                    'published_at': video.published_at,
                },
            )
            if source_id:
                print(f'   ✅ {video.title[:50]}...')
                total_collected += 1
        print(f'   YouTube: {len(videos)} 件取得\n')

    # Social (Twitter/X + Reddit via Web検索 - API不要)
    if 'social' in sources and SERPER_API_KEY:
        social_results = search_shoe_reviews_social(brand, model_name, max_results=10)
        
        # Twitter/X
        twitter_posts = social_results.get('twitter', [])
        for post in twitter_posts:
            source_id = create_curated_source(
                shoe_id=shoe_id,
                source_type='SNS',
                platform='twitter.com',
                title=post.title,
                url=post.url,
                author=post.author,
                excerpt=post.snippet[:200] if post.snippet else None,
                reliability=0.65,
            )
            if source_id:
                print(f'   ✅ 🐦 {post.author}: {post.title[:40]}...')
                total_collected += 1
        print(f'   X (Twitter): {len(twitter_posts)} 件取得')

        # Reddit
        reddit_posts = social_results.get('reddit', [])
        for post in reddit_posts:
            source_id = create_curated_source(
                shoe_id=shoe_id,
                source_type='COMMUNITY',
                platform='reddit.com',
                title=post.title,
                url=post.url,
                author=post.author,
                excerpt=post.snippet[:200] if post.snippet else None,
                reliability=0.6,
            )
            if source_id:
                print(f'   ✅ 📝 {post.author}: {post.title[:40]}...')
                total_collected += 1
        print(f'   Reddit: {len(reddit_posts)} 件取得\n')
    elif 'social' in sources:
        print('⚠️ SERPER_API_KEYが未設定のためソーシャル検索をスキップ\n')

    print(f'=== 完了: 合計 {total_collected} 件登録 ===')


def cmd_collect_all(args):
    """全シューズのレビューを収集"""
    limit = args.limit or 5
    sources = args.sources.split(',') if args.sources else ['youtube']

    print('=== 全シューズのレビュー収集 ===\n')
    
    shoes = get_all_shoes()
    if not shoes:
        print('シューズが登録されていません。先に shoes import を実行してください。')
        return

    shoes_to_process = shoes[:limit]
    print(f'{len(shoes_to_process)} 件のシューズを処理します\n')

    for i, shoe in enumerate(shoes_to_process, 1):
        print(f'[{i}/{len(shoes_to_process)}] {shoe["brand"]} {shoe["modelName"]}')
        
        # YouTube
        if 'youtube' in sources:
            videos = search_shoe_reviews(shoe['brand'], shoe['modelName'], max_results=5)
            for video in videos:
                create_curated_source(
                    shoe_id=shoe['id'],
                    source_type='VIDEO',
                    platform='youtube.com',
                    title=video.title,
                    url=video.url,
                    author=video.channel_name,
                    thumbnail_url=video.thumbnail_url,
                    reliability=0.8,
                    metadata={'video_id': video.video_id},
                )
            print(f'   YouTube: {len(videos)} 件')

        # Social (Web検索ベース - API不要)
        if 'social' in sources and SERPER_API_KEY:
            social_results = search_shoe_reviews_social(
                shoe['brand'], shoe['modelName'], max_results=5
            )
            
            twitter_count = 0
            for post in social_results.get('twitter', []):
                if create_curated_source(
                    shoe_id=shoe['id'],
                    source_type='SNS',
                    platform='twitter.com',
                    title=post.title,
                    url=post.url,
                    author=post.author,
                    reliability=0.65,
                ):
                    twitter_count += 1
            print(f'   X (Twitter): {twitter_count} 件')
            
            reddit_count = 0
            for post in social_results.get('reddit', []):
                if create_curated_source(
                    shoe_id=shoe['id'],
                    source_type='COMMUNITY',
                    platform='reddit.com',
                    title=post.title,
                    url=post.url,
                    author=post.author,
                    reliability=0.6,
                ):
                    reddit_count += 1
            print(f'   Reddit: {reddit_count} 件')

        print()

    print('=== 完了 ===')


def cmd_sources(args):
    """シューズのソースを表示"""
    shoe_id = args.shoe_id
    
    # シューズ情報を取得
    shoes = get_all_shoes()
    shoe = next((s for s in shoes if s['id'] == shoe_id), None)
    
    if not shoe:
        print(f'❌ シューズが見つかりません: {shoe_id}')
        return

    print(f'=== {shoe["brand"]} {shoe["modelName"]} のソース ===\n')
    
    sources = get_curated_sources_for_shoe(shoe_id)
    
    if not sources:
        print('ソースがありません')
        return

    for source in sources:
        emoji = {
            'VIDEO': '🎬',
            'ARTICLE': '📄',
            'SNS': '🐦',
            'COMMUNITY': '📝',
            'MARKETPLACE': '🛒',
            'OFFICIAL': '🏢',
        }.get(source['type'], '📌')
        
        print(f'{emoji} [{source["type"]}] {source["title"][:60]}')
        print(f'   プラットフォーム: {source["platform"]}')
        print(f'   信頼度: {source["reliability"]}')
        print(f'   URL: {source["url"]}')
        print()


def main():
    parser = argparse.ArgumentParser(description='レビュー収集ツール')
    subparsers = parser.add_subparsers(dest='command', help='コマンド')

    # config コマンド
    parser_config = subparsers.add_parser('config', help='設定状況を表示')
    parser_config.set_defaults(func=cmd_config)

    # shoes コマンド
    parser_shoes = subparsers.add_parser('shoes', help='シューズ管理')
    shoes_subparsers = parser_shoes.add_subparsers(dest='shoes_command')
    
    # shoes list
    parser_shoes_list = shoes_subparsers.add_parser('list', help='一覧表示')
    parser_shoes_list.set_defaults(func=cmd_shoes_list)
    
    # shoes add
    parser_shoes_add = shoes_subparsers.add_parser('add', help='追加')
    parser_shoes_add.add_argument('brand', help='ブランド名')
    parser_shoes_add.add_argument('model', help='モデル名')
    parser_shoes_add.add_argument('--category', '-c', help='カテゴリ')
    parser_shoes_add.set_defaults(func=cmd_shoes_add)
    
    # shoes import
    parser_shoes_import = shoes_subparsers.add_parser('import', help='事前定義リストからインポート')
    parser_shoes_import.set_defaults(func=cmd_shoes_import)

    # collect コマンド
    parser_collect = subparsers.add_parser('collect', help='特定シューズのレビュー収集')
    parser_collect.add_argument('shoe_id', help='シューズID')
    parser_collect.add_argument('--sources', '-s', help='ソース (youtube,social) ※socialはX+Reddit', default='youtube,social')
    parser_collect.set_defaults(func=cmd_collect)

    # collect-all コマンド
    parser_collect_all = subparsers.add_parser('collect-all', help='全シューズのレビュー収集')
    parser_collect_all.add_argument('--limit', '-l', type=int, help='処理するシューズ数', default=5)
    parser_collect_all.add_argument('--sources', '-s', help='ソース (youtube,social)', default='youtube')
    parser_collect_all.set_defaults(func=cmd_collect_all)

    # sources コマンド
    parser_sources = subparsers.add_parser('sources', help='シューズのソースを表示')
    parser_sources.add_argument('shoe_id', help='シューズID')
    parser_sources.set_defaults(func=cmd_sources)

    args = parser.parse_args()

    if hasattr(args, 'func'):
        args.func(args)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()

