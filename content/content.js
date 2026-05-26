async function extractYouTubeContent() {
  try {
    const title = document.querySelector('h1.title yt-formatted-string')?.textContent.trim() ||
                  document.querySelector('yt-formatted-string.title')?.textContent.trim() ||
                  document.title.replace(' - YouTube', '');

    const channel = document.querySelector('ytd-channel-name a')?.textContent.trim() ||
                   document.querySelector('yt-formatted-string.ytd-channel-name')?.textContent.trim() ||
                   'Unknown Channel';

    const url = window.location.href;

    const description = document.querySelector('yt-formatted-string#eow-description')?.textContent.trim() ||
                       document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                       '';

    let captionTracks = [];
    if (window.ytInitialPlayerResponse?.captions) {
      const tracks = window.ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer?.captionTracks;
      if (tracks) {
        captionTracks = tracks.map(track => ({
          languageCode: track.languageCode,
          languageName: track.name?.simpleText || track.languageCode,
          baseUrl: track.baseUrl
        }));
      }
    }

    return {
      success: true,
      data: {
        title,
        channel,
        url,
        description,
        captionTracks
      }
    };
  } catch (error) {
    console.error('Failed to extract YouTube content:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractYouTubeContent') {
    extractYouTubeContent().then(sendResponse);
    return true;
  }
});
