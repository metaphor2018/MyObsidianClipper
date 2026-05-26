function extractFilenameAndContent(geminiResponse) {
  const lines = geminiResponse.split('\n');
  let filename = '';
  let content = '';
  let inMarkdown = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Look for markdown code block
    if (line.startsWith('```')) {
      inMarkdown = !inMarkdown;
      if (inMarkdown) {
        continue;
      }
    }

    if (inMarkdown) {
      content += lines[i] + '\n';
    }
  }

  // Clean content
  content = content.trim();

  // Extract filename from first line if not found
  if (!filename && content) {
    const firstLine = content.split('\n')[0];
    // Look for date pattern YYYYMMDD_...
    const match = content.match(/(\d{8}_[\w\s]+?)[\n$]/);
    if (match) {
      filename = match[1].replace(/\s+/g, '');
    }
  }

  // Generate filename if still not found
  if (!filename) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    filename = `${dateStr}_youtube_summary`;
  }

  // Ensure .md extension
  if (!filename.endsWith('.md')) {
    filename += '.md';
  }

  return {
    filename,
    content: content || geminiResponse
  };
}

function validateMarkdownFormat(content) {
  // Check for required sections
  const hasFrontmatter = /^---\ncategory:/m.test(content);
  const hasMetadata = /## １．メタデータ/m.test(content);
  const hasSummary = /## 動画の詳細要約/m.test(content);

  return {
    isValid: hasFrontmatter && hasMetadata && hasSummary,
    issues: [
      !hasFrontmatter && 'Missing frontmatter with category and tags',
      !hasMetadata && 'Missing metadata section',
      !hasSummary && 'Missing summary section'
    ].filter(Boolean)
  };
}

function formatForObsidianURI(content) {
  // Encode content for URI
  return encodeURIComponent(content);
}

function formatForDownload(filename, content) {
  // Ensure proper line endings and encoding
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  return {
    blob,
    filename
  };
}
