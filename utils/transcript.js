async function fetchTranscript(captionTracks) {
  if (!captionTracks || captionTracks.length === 0) {
    return {
      success: false,
      error: 'No caption tracks available'
    };
  }

  // Prefer Japanese, fallback to first available
  const track = captionTracks.find(t => t.languageCode === 'ja') || captionTracks[0];

  if (!track || !track.baseUrl) {
    return {
      success: false,
      error: 'Invalid caption track'
    };
  }

  try {
    const response = await fetch(track.baseUrl);
    const xmlText = await response.text();
    const text = parseTranscriptXML(xmlText);

    return {
      success: true,
      data: {
        text,
        languageCode: track.languageCode,
        languageName: track.languageName
      }
    };
  } catch (error) {
    console.error('Failed to fetch transcript:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function parseTranscriptXML(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Failed to parse XML');
  }

  const textElements = xmlDoc.getElementsByTagName('text');
  const lines = [];

  for (let i = 0; i < textElements.length; i++) {
    const text = textElements[i].textContent.trim();
    if (text) {
      lines.push(text);
    }
  }

  return lines.join(' ');
}

async function getTranscriptWithFallback(captionTracks, fallbackDescription) {
  const result = await fetchTranscript(captionTracks);

  if (result.success) {
    return result.data.text;
  }

  console.warn('Transcript fetch failed, using fallback description');
  return fallbackDescription || '';
}
