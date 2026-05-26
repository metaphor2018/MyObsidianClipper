async function callGeminiAPI(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
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
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content in response');
    }

    return {
      success: true,
      content
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function generateYouTubeSummary(apiKey, model, videoData, transcript) {
  const prompt = buildSummaryPrompt(videoData, transcript);
  return callGeminiAPI(apiKey, model, prompt);
}

function buildSummaryPrompt(videoData, transcript) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

  return `
You are a YouTube video summarization assistant. Please analyze the following video information and generate a markdown file summary in Japanese.

Video Information:
- Title: ${videoData.title}
- Channel: ${videoData.channel}
- URL: ${videoData.url}
- Description: ${videoData.description}

Video Transcript:
${transcript || '(No transcript available - use description only)'}

Please generate a markdown file with the following structure:

1. **Filename format**: ${dateStr}_<Japanese title summary (max 20 chars, no special characters)>
   Example: ${dateStr}_ClaudeCodeとCloudFlare接続方法

2. **Content format** (MUST include these sections in Japanese):

\`\`\`markdown
---
category: <Appropriate category in Japanese>
tags:
  - <tag 1>
  - <tag 2>
  - ... (approximately 20 tags, no duplicates)
---

## １．メタデータ
- **要約日時：** YYYY/MM/DD HH:mm
- **タイトル：** ${videoData.title}
- **チャンネル名：** ${videoData.channel}
- **動画URL：** [${videoData.url}]
- **概要：** <200-character summary>
- **評価：** <★ to ★★★★★> based on life value
- **評価理由：** <100-character reason>

## 動画の詳細要約
<3000-character summary with:
- Section headers (### format)
- Tables where appropriate
- Bullet points for clarity
- Skip any product/service promotion sections
- Use only Japanese even for foreign videos>
\`\`\`

Important rules:
- Generate ONLY the markdown content (no explanation before/after)
- Use proper Japanese throughout
- Filename uses alphanumeric + underscore only
- Tags should be relevant to content (no duplicates)
- Rating should reflect life value (low for low-quality content)
- Skip product/service promotional parts
- All content in Japanese regardless of source language
`;
}
