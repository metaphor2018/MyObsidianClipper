# MyObsidianClipper

YouTubeの動画をGemini AIで自動要約してObsidianに保存するChrome拡張機能

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 概要

YouTubeのページで拡張アイコンをクリックするだけで、Gemini AIが動画の字幕（またはフォールバックとして説明文）を要約し、指定フォーマットのMarkdownファイルを生成。ObsidianのVaultに直接保存するか、ダウンロードできます。

## 主な機能

- **自動要約**: Gemini 2.0 Flashで高精度な3000字の動画要約を生成
- **字幕対応**: YouTube内部APIから字幕を自動取得（認証不要）
- **フォールバック**: 字幕がない場合は説明文で自動対応
- **Obsidian連携**: 
  - URIプロトコルで直接Vaultに保存
  - またはMarkdownファイルをダウンロード
- **柔軟な設定**:
  - Gemini モデル選択（2.0 Flash / 1.5 Flash）
  - Vault名・保存先フォルダをカスタマイズ
- **プレビュー確認**: 生成後にMarkdownをプレビュー表示してから保存

## 出力フォーマット

生成されるMarkdownは以下の構造：

```markdown
---
category: IT・AIツール
tags:
  - tag1
  - tag2
  - ... (約20個)
---

## １．メタデータ
- **要約日時:** YYYY/MM/DD HH:mm
- **タイトル:** YouTube動画のタイトル
- **チャンネル名:** チャンネル名
- **動画URL:** https://...
- **概要:** (200字程度)
- **評価:** ★～★★★★★ (生活への有益性で判定)
- **評価理由:** (100字程度)

## 動画の詳細要約
(3000字、項目分け・表形式で構成)
```

## インストール方法

### 1. Gemini APIキーを取得

[Google AI Studio](https://aistudio.google.com/apikey) にアクセスしてAPIキーを取得

### 2. Chrome拡張として読み込む

```bash
# リポジトリをクローン
git clone https://github.com/metaphor2018/MyObsidianClipper.git
cd MyObsidianClipper
```

1. Chrome で `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. MyObsidianClipperフォルダを選択

### 3. 拡張の設定

1. 拡張アイコン右クリック → 「オプション」を選択
2. 以下を設定：
   - **Gemini APIキー**: 取得したAPIキー
   - **Geminiモデル**: Gemini 2.0 Flash（推奨）
   - **Obsidian Vault名**: Vaultの名前
   - **保存先フォルダ**: 例: `YouTube` または `YouTube/要約`

## 使い方

1. YouTubeで動画を開く
2. 拡張アイコンをクリック
3. 「Geminiで要約する」ボタンをクリック
4. 生成完了後、プレビューで内容を確認
5. 以下いずれかを選択：
   - **「Obsidianで開く」**: Vaultに直接保存（Obsidian起動時のみ）
   - **「ダウンロード」**: Markdownファイルをダウンロード

## アーキテクチャ

```
content.js (YouTube DOM抽出・字幕URL取得)
    ↓
popup.js (状態管理・UI制御)
    ├→ transcript.js (字幕フェッチ・パース)
    ├→ gemini.js (API呼び出し)
    └→ markdown.js (フォーマット処理)
    ↓
settings.js (APIキー・設定管理)
```

## ファイル構成

```
MyObsidianClipper/
├── manifest.json                    # Chrome拡張設定
├── content/content.js               # YouTube DOM抽出
├── popup/
│   ├── popup.html                   # メインUI
│   ├── popup.js                     # ロジック・状態管理
│   └── popup.css                    # スタイル
├── settings/
│   ├── settings.html                # 設定ページ
│   ├── settings.js                  # 設定管理
│   └── settings.css                 # スタイル
├── utils/
│   ├── transcript.js                # 字幕取得・パース
│   ├── gemini.js                    # Gemini API
│   └── markdown.js                  # フォーマット処理
├── background/background.js         # Service Worker
└── docs/
    └── superpowers/specs/
        └── 2026-05-27-obsidian-clipper-design.md
```

## エラーハンドリング

| エラー | 対応 |
|--------|------|
| YouTubeページ以外で開いた | 「YouTubeの動画ページで開いてください」と表示 |
| APIキー未設定 | 設定画面へのリンク付きで促促 |
| 字幕がない動画 | 説明文を使用（自動フォールバック） |
| Gemini APIエラー | エラーメッセージ表示 + 再試行ボタン |
| Obsidian未起動 | 「Obsidianが起動していることを確認してください」 |

## セキュリティ

- APIキーは `chrome.storage.sync` に保存（Chrome管理）
- API呼び出しはクライアント側で実行
- コンテンツはURLエンコードして送信
- 信頼できるドメインのみアクセス許可

## 対応環境

- **ブラウザ**: Chrome / Chromium系（Manifest V3対応）
- **Obsidian**: バージョン1.0以上（URI protocol対応）
- **API**: Gemini 2.0 Flash / 1.5 Flash

## 制限事項

- YouTubeの動画ページのみ対応
- ライブ配信・プレミア動画の字幕取得は未テスト
- 長時間の動画（4時間以上）は要約が途中で切れる可能性あり
- Obsidian URI方式はObsidianが起動している必要がある

## ロードマップ

- [ ] ファイル名フォーマットのカスタマイズ
- [ ] 複数Vault対応
- [ ] 自動保存モード（プレビュースキップ）
- [ ] ブックマーク機能
- [ ] プロンプトのカスタマイズUI
- [ ] 定期スケジュール実行
- [ ] YouTube再生リスト一括処理

## トラブルシューティング

### 拡張が表示されない
- `chrome://extensions/` で拡張を有効化してください
- デベロッパーモードをオン、フォルダを再度読み込みしてください

### APIエラーが出る
- APIキーが正しく入力されているか確認
- API使用額の上限に達していないか確認（無料枠: 月15回）
- インターネット接続を確認

### Obsidianで開かない
- Obsidianが起動していることを確認
- Obsidian Vault名が正しいか確認
- Chrome再起動を試してください

## 開発

```bash
# 開発時は chrome://extensions/ で「再読み込み」ボタンで更新
# popup.js 編集時は popup.html をリロード（Ctrl+Shift+R）
# 設定編集時は settings.js を修正後、設定ページをリロード
```

## ライセンス

MIT License - 詳しくは [LICENSE](LICENSE) を参照

## 作成者

Yukinori Kitano ([@metaphor2018](https://github.com/metaphor2018))

## 貢献

バグ報告・機能リクエストは [Issues](https://github.com/metaphor2018/MyObsidianClipper/issues) でお願いします

---

**注意:** このプロジェクトはPersonal Projectです。商用利用は自己責任でお願いします。
