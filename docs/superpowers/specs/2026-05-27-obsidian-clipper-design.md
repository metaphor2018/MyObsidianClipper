# MyObsidianClipper Chrome拡張 — 設計書

**日付:** 2026-05-27  
**バージョン:** 0.1.0  
**ステータス:** 実装完了

## 概要

YouTubeの動画ページで1クリックするだけで、Gemini APIが動画を要約して指定フォーマットのMarkdownを生成し、Obsidianに保存するChrome拡張。

## 確定仕様

| 項目 | 仕様 |
|------|------|
| **字幕取得方式** | YouTube内部API（timedtext）認証不要 + 説明文フォールバック |
| **Gemini認証** | ユーザーが設定画面でAPIキーを入力 |
| **UXフロー** | 生成 → プレビュー表示 → 保存（3ステップ） |
| **Obsidian保存** | URIプロトコル（`obsidian://new`）+ ダウンロード両対応 |
| **Vault設定** | ユーザーが自由に指定（設定画面） |
| **Markdown形式** | YAML frontmatter + メタデータ + 3000字詳細要約 |

## アーキテクチャ

### Manifest V3構成

```
MyObsidianClipper/
├── manifest.json                          # 権限・権限定義
├── popup/
│   ├── popup.html                         # メインUI（3ステート）
│   ├── popup.js                           # ロジック・状態管理
│   └── popup.css                          # ダークテーマスタイル
├── content/
│   └── content.js                         # DOM抽出 + 字幕URL取得
├── background/
│   └── background.js                      # Service Worker（最小限）
├── settings/
│   ├── settings.html                      # 設定ページUI
│   ├── settings.js                        # 設定の読み書き
│   └── settings.css                       # スタイル
├── utils/
│   ├── transcript.js                      # YouTube字幕フェッチ・パース
│   ├── gemini.js                          # Gemini API呼び出し
│   └── markdown.js                        # フォーマット処理
└── docs/
    └── superpowers/specs/
        └── 2026-05-27-obsidian-clipper-design.md
```

### データフロー

```
YouTubeページ (watch?v=...)
    ↓
[拡張アイコンをクリック]
    ↓
popup.js: chrome.tabs.sendMessage()
    ↓
content.js: 3つの処理を並行
    ├── DOM抽出: title, channel, url, description
    ├── ytInitialPlayerResponse解析
    └── captionTracks配列を返す
    ↓
popup.js: transcript.js呼び出し
    ├── captionTracks→baseUrl取得
    ├── fetchでXML取得
    └── DOMParser + XMLパース→テキスト化
    ↓
popup.js: generateYouTubeSummary()呼び出し
    ├── Gemini APIエンドポイント: /v1beta/models/{model}:generateContent
    ├── プロンプト: 指定フォーマット + ファイル名生成指示
    └── レスポンス: Markdown形式のテキスト
    ↓
popup.js: extractFilenameAndContent()
    ├── ファイル名を抽出（YYYYMMDD_...）
    └── Markdownコンテンツを分離
    ↓
[ユーザーがプレビューを確認]
    ↓
2つの保存選択肢:
    ├── 「Obsidianで開く」
    │   → obsidian://new?vault=...&file=...&content=...をクリック
    │   → Obsidian起動 & ノート自動作成
    │
    └── 「ダウンロード」
        → chrome.downloads.download()
        → Blobで.mdファイル保存
```

### 字幕取得ロジック（transcript.js）

```javascript
// 1. content.jsがYouTubeページのwindow.ytInitialPlayerResponseを取得
const captionTracks = ytInitialPlayerResponse.captions
  ?.playerCaptionsTracklistRenderer?.captionTracks

// 2. 優先度: 日本語 > 最初のトラック
const track = captionTracks?.find(t => t.languageCode === 'ja') 
           || captionTracks?.[0]

// 3. baseUrlはXML形式で取得（?fmt=xml）
const xml = await fetch(track.baseUrl).then(r => r.text())

// 4. <text>タグをパース → 空行除去 → 単一テキストに結合
const text = Array.from(xmlDoc.getElementsByTagName('text'))
  .map(el => el.textContent.trim())
  .filter(Boolean)
  .join(' ')
```

### Geminiプロンプト設計

```
You are a YouTube video summarization assistant...

Video Information:
- Title: ...
- Channel: ...
- URL: ...
- Description: ...

Video Transcript:
[全文字幕テキスト または 説明文]

Please generate a markdown file:

1. Filename: YYYYMMDD_<20文字日本語要約>
   - 記号・特殊文字なし
   - アルファベット・数字・アンダースコアのみ

2. Content format:
   - YAML frontmatter (category + tags 20個、重複なし)
   - メタデータセクション (要約日時/タイトル/チャンネル/URL/概要/おすすめ度)
   - 動画詳細要約 (3000字、項目分け・表形式)
   - 製品・サービス紹介部分はスキップ
   - 全て日本語で出力

Output: markdown code blockのみ
```

### 設定項目（chrome.storage.sync）

```javascript
{
  // Gemini API
  geminiApiKey: string,           // 必須
  geminiModel: string,            // "gemini-2.0-flash" | "gemini-1.5-flash"

  // Obsidian
  obsidianVaultName: string,      // 必須
  obsidianFolder: string,         // 例: "YouTube" or "YouTube/要約"

  // Download
  downloadFolder: string          // 空白 = Chromeデフォルト
}
```

## UIの3ステート

### State 1: Initial（初期表示）
- 動画情報表示（タイトル・チャンネル）
- Geminiモデル選択ドロップダウン
- 「Geminiで要約する」ボタン
- エラー状態の場合:
  - 「YouTubeの動画ページで開いてください」
  - 「設定画面でAPIキーを登録してください」

### State 2: Loading（生成中）
- スピナー表示
- 「Geminiが要約中...」メッセージ
- キャンセル不可（生成完了まで待つ）

### State 3: Preview（プレビュー表示）
- ファイル名入力ボックス（編集可能）
- Markdownプレビュー（スクロール可）
- 「Obsidianで開く」ボタン
- 「ダウンロード」ボタン
- 「← 戻って再生成」リンク

### State 4: Error（エラー）
- エラーメッセージ表示
- 「再試行」ボタン

## エラーハンドリング

| 条件 | 表示 | アクション |
|------|------|----------|
| YouTubeページ以外 | 「YouTubeの動画ページで開いてください」 | 設定できない状態 |
| APIキー未設定 | 「設定画面でAPIキーを登録してください」 + 設定へのリンク | 設定ページを開く |
| 字幕取得失敗 | 自動フォールバック（説明文のみ） | 警告表示なし |
| Gemini API エラー | エラーメッセージ表示 | 「再試行」ボタン |
| Obsidian URI失敗 | 「Obsidianが起動していることを確認してください」 | 再試行 |
| ネットワークエラー | 「ネットワークエラーが発生しました」 | 再試行 |

## 実装チェックリスト

- [x] manifest.json（Manifest V3）
- [x] 設定ページ（settings.html/js/css）
- [x] content.js（DOM抽出 + 字幕URL取得）
- [x] transcript.js（XML fetch + パース）
- [x] gemini.js（generateContent API）
- [x] markdown.js（ファイル名・コンテンツ抽出）
- [x] popup.html（3ステートUI）
- [x] popup.css（ダークテーマ）
- [x] popup.js（状態管理・イベントハンドラ）
- [x] background.js（Service Worker最小限）
- [x] .gitignore（.superpowers/除外）

## 動作検証

1. **環境準備**
   - Gemini APIキー取得（aistudio.google.com）
   - Obsidian Vault作成
   - Chrome拡張フォルダ配置

2. **手動テスト**
   - YouTubeで字幕付き動画を開く
   - 拡張アイコンをクリック → 動画情報表示確認
   - 「Geminiで要約する」クリック → 生成確認
   - プレビュー表示確認（YAML frontmatter + tags確認）
   - ファイル名形式確認（YYYYMMDD_...）
   - 「Obsidianで開く」→ Obsidian起動・ノート作成確認
   - 「ダウンロード」→ .md保存確認
   - 字幕なし動画 → 説明文フォールバック動作確認
   - APIキー未設定 → エラー表示確認

## セキュリティ考慮事項

- APIキーは `chrome.storage.sync` に暗号化されて保存
- Gemini API呼び出しはクライアント側（ブラウザ）で実行
- Content-Type: application/json（XSS対策）
- Obsidian URI は encodeURIComponent() でエスケープ
- ユーザー入力（ファイル名）はバリデーション未実装（今後追加）

## 今後の拡張案

1. **ファイル名自動生成をカスタマイズ可能に**
   - テンプレート形式で選択

2. **複数Vault対応**
   - ドロップダウンで選択

3. **自動保存（プレビュースキップ）**
   - 設定で有効化

4. **ブックマーク機能**
   - 生成したMarkdownを拡張ローカルストレージに保存

5. **プロンプト編集UI**
   - Geminiプロンプトをカスタマイズ可能に
