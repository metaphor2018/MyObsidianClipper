async function generateYouTubeSummary(apiKey, model, videoData, transcriptText) {
  if (!apiKey) {
    return {
      success: false,
      error: 'APIキーが設定されていません'
    };
  }

  if (!transcriptText) {
    return {
      success: false,
      error: '字幕またはテキストがありません'
    };
  }

  const prompt = buildSummaryPrompt(videoData, transcriptText);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || 'APIエラーが発生しました';
      console.error('[Gemini API Error]', data.error);
      return {
        success: false,
        error: errorMessage
      };
    }

    if (!data.candidates || data.candidates.length === 0) {
      return {
        success: false,
        error: 'AIからの応答がありません'
      };
    }

    const content = data.candidates[0]?.content?.parts?.[0]?.text || '';

    if (!content) {
      return {
        success: false,
        error: '要約の生成に失敗しました'
      };
    }

    return {
      success: true,
      content
    };
  } catch (error) {
    console.error('[Gemini Request Error]', error);
    return {
      success: false,
      error: `ネットワークエラー: ${error.message}`
    };
  }
}

function buildSummaryPrompt(videoData, transcriptText) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  const truncatedTranscript = transcriptText.substring(0, 8000);

  return `YouTubeの動画をGemini AIで自動要約してください。以下のフォーマットで回答してください：

【動画情報】
- タイトル: ${videoData.title}
- チャンネル: ${videoData.channel}
- URL: ${videoData.url}
- 説明文: ${videoData.description || '記載なし'}

【字幕テキスト】
${truncatedTranscript}

---

以下の形式で、Markdownの\`\`\`ブロック内に、完全な要約ドキュメントを生成してください：

\`\`\`markdown
---
category: IT・AIツール
tags:
  - tag1
  - tag2
  - tag3
  - tag4
  - tag5
---

## １．メタデータ

- **要約日時:** ${dateStr}
- **タイトル:** ${videoData.title}
- **チャンネル名:** ${videoData.channel}
- **動画URL:** ${videoData.url}
- **概要:** [200字程度で、この動画の内容を簡潔に説明してください]
- **評価:** ★★★★★ [生活への有益性で判定（★1個から5個）]
- **評価理由:** [100字程度で、なぜこの評価にしたか説明してください]

## 動画の詳細要約

[以下の構成で、3000字程度の詳細要約を記述してください]

### 全体構成
[動画全体の流れと構成を説明（200～300字）]

### 主要ポイント
[動画の主要な内容を箇条書きで説明（500～800字）]

### 技術的詳細
[動画に含まれる技術内容や実装方法があれば詳しく説明（500～800字）]

### 実践的な応用
[この動画の内容をどのように実生活・仕事に活かせるか（300～500字）]

### まとめ
[全体をまとめて、重要なポイントを強調（200～300字）]
\`\`\`

重要な指示：
1. Markdownの\`\`\`ブロックで囲んでください（このブロックが抽出されます）
2. 日本語で正確に記述してください
3. 字数は目安です、内容が重要です
4. カテゴリーとタグは適切なものに変更してください`;
}
