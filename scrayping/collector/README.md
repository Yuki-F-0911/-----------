# レビュー収集ツール

サイトから切り離して実行できるスタンドアロンのレビュー収集スクリプトです。

## 機能

- 🔍 **シューズ名抽出**: 競合サイトや検索結果からシューズ名を自動抽出
- 🎬 **YouTube収集**: レビュー動画のメタデータを収集
- 🐦 **X (Twitter) 収集**: Web検索経由で収集（**API不要！**）
- 📝 **Reddit収集**: Web検索経由で収集（**API不要！**）
- 💾 **データベース登録**: 収集データをPostgreSQLに直接登録

### ✨ 新機能: API不要のソーシャル収集

X (Twitter) と Reddit の投稿は、**Serper API（Web検索）経由**で取得できます。
各サービスの公式APIを取得する必要がありません！

## セットアップ

### 1. 依存関係のインストール

```bash
cd scrayping/collector
pip install -r requirements.txt
```

### 2. 環境変数の設定

プロジェクトルートの `.env.local` に以下を設定:

```env
# 必須: データベース
DATABASE_URL="postgresql://username:password@localhost:5432/shoereview"

# YouTube API（動画検索用）
YOUTUBE_API_KEY="AIza..."

# Web検索 + ソーシャル収集（X + Reddit を API なしで取得）
SERPER_API_KEY="..."
```

#### 最小構成
- `DATABASE_URL` + `YOUTUBE_API_KEY` + `SERPER_API_KEY` の3つだけでOK！
- Reddit API、X (Twitter) API は不要

### 3. 設定確認

```bash
python config.py
```

## 使い方

### 基本コマンド

```bash
# ヘルプを表示
python main.py --help

# 設定状況を確認
python main.py config

# シューズ一覧を表示
python main.py shoes list

# 事前定義リストからシューズをインポート
python main.py shoes import

# シューズを手動追加
python main.py shoes add "Nike" "Pegasus 41"
```

### レビュー収集

```bash
# 特定シューズのレビューを収集（YouTube + X + Reddit）
python main.py collect <shoe_id>

# YouTubeのみ収集
python main.py collect <shoe_id> --sources youtube

# YouTube + ソーシャル（X + Reddit）
python main.py collect <shoe_id> --sources youtube,social

# 全シューズのレビューを収集
python main.py collect-all --limit 10

# 全シューズを全ソースで収集
python main.py collect-all --limit 5 --sources youtube,social
```

#### ソースオプション
- `youtube` - YouTube動画（YouTube API使用）
- `social` - X (Twitter) + Reddit（Serper API使用、各サービスのAPI不要）

### ソース確認

```bash
# シューズの収集済みソースを表示
python main.py sources <shoe_id>
```

## 個別モジュールのテスト

各モジュールは単独でテストできます:

```bash
# 設定確認
python config.py

# シューズ検索テスト
python shoe_finder.py

# YouTube検索テスト
python youtube_collector.py

# Reddit検索テスト
python reddit_collector.py

# X (Twitter) 検索テスト
python twitter_collector.py

# データベース接続テスト
python db_handler.py
```

## APIキー取得方法

### YouTube API

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成
3. 「APIとサービス」→「ライブラリ」→「YouTube Data API v3」を有効化
4. 「認証情報」→「APIキーを作成」

### Reddit API

1. [Reddit App Preferences](https://www.reddit.com/prefs/apps) にアクセス
2. 「create app」をクリック
3. 「script」タイプを選択
4. Client IDとSecretを取得

### X (Twitter) API

1. [Twitter Developer Portal](https://developer.twitter.com/) にアクセス
2. アプリを作成
3. Bearer Tokenを取得
   - ※ 無料プランは検索機能に制限があります

### Serper API (Web検索)

1. [Serper.dev](https://serper.dev/) にアクセス
2. アカウント作成
3. APIキーを取得（月2,500回まで無料）

## 著作権について

このツールは以下の方針で設計されています:

- ✅ **メタデータのみ収集**: タイトル、URL、著者名など
- ✅ **出典を明記**: すべてのソースにURLを保持
- ❌ **全文転載しない**: コンテンツ本文は収集対象外
- ❌ **スクレイピングしない**: 公式APIのみを使用

詳細なレビュー内容は、各プラットフォームの元ページで確認してください。

## ファイル構成

```
collector/
├── __init__.py
├── config.py            # 設定ファイル
├── shoe_finder.py       # シューズ名抽出
├── youtube_collector.py # YouTube収集（YouTube API）
├── web_collector.py     # X + Reddit収集（Web検索経由、API不要）★推奨
├── reddit_collector.py  # Reddit収集（Reddit API）※オプション
├── twitter_collector.py # X収集（Twitter API）※オプション
├── db_handler.py        # データベース操作
├── main.py              # メインスクリプト
├── requirements.txt     # 依存関係
└── README.md            # このファイル
```

★ `web_collector.py` を使えば、X/Reddit の公式APIは不要です！

## トラブルシューティング

### データベース接続エラー

```
❌ DATABASE_URLが設定されていません
```

→ `.env.local` にDATABASE_URLを設定してください

### YouTube APIエラー

```
❌ YouTube API HTTPエラー: API key not valid
```

→ APIキーを確認し、YouTube Data API v3が有効になっているか確認

### Reddit認証エラー

```
⚠️ Reddit API認証情報が設定されていません
```

→ REDDIT_CLIENT_IDとREDDIT_CLIENT_SECRETを設定

### Twitter APIエラー

```
❌ Twitter APIアクセス拒否
```

→ APIプラン（Free/Basic/Pro）を確認。検索機能には上位プランが必要な場合があります

