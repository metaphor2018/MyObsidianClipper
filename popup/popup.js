// State management
let currentState = 'initial';
let videoData = null;
let generatedMarkdown = null;
let generatedFilename = null;
let apiKey = null;
let selectedModel = 'gemini-2.0-flash';

// DOM selectors
const states = {
  initial: document.getElementById('state-initial'),
  loading: document.getElementById('state-loading'),
  preview: document.getElementById('state-preview'),
  error: document.getElementById('state-error')
};

const elements = {
  videoInfo: document.getElementById('video-info'),
  videoTitle: document.getElementById('video-title'),
  videoChannel: document.getElementById('video-channel'),
  notYoutube: document.getElementById('not-youtube'),
  noConfig: document.getElementById('no-config'),
  generateBtn: document.getElementById('generate-btn'),
  settingsLink: document.getElementById('settings-link'),
  gotoSettingsBtn: document.getElementById('goto-settings-btn'),
  modelSelector: document.getElementById('model-selector'),
  filenameInput: document.getElementById('filename-input'),
  previewContent: document.getElementById('preview-content'),
  saveObsidianBtn: document.getElementById('save-obsidian-btn'),
  downloadBtn: document.getElementById('download-btn'),
  backBtn: document.getElementById('back-btn'),
  retryBtn: document.getElementById('retry-btn'),
  errorMessage: document.getElementById('error-message'),
  editFilenameBtn: document.getElementById('edit-filename-btn')
};

// State transitions
function setState(newState) {
  states[currentState].classList.add('hidden');
  states[newState].classList.remove('hidden');
  currentState = newState;
}

// Initialize
console.log('[MyObsidianClipper] Script loaded, document.readyState:', document.readyState);

function initializeApp() {
  console.log('[MyObsidianClipper] Initializing app...');
  initialize();
}

// Handle both ready and already-loaded cases
if (document.readyState === 'loading') {
  console.log('[MyObsidianClipper] DOM still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  console.log('[MyObsidianClipper] DOM already loaded, initializing immediately...');
  // Use setTimeout to ensure all scripts are loaded
  setTimeout(initializeApp, 0);
}

async function initialize() {
  try {
    // Load settings
    console.log('[MyObsidianClipper] Loading settings from storage...');
    const settingsResult = await chrome.storage.sync.get(['geminiApiKey', 'geminiModel']);
    console.log('[MyObsidianClipper] Storage result:', settingsResult);
    console.log('[MyObsidianClipper] Keys in result:', Object.keys(settingsResult));

    apiKey = settingsResult.geminiApiKey;
    selectedModel = settingsResult.geminiModel || 'gemini-2.0-flash';

    console.log('[MyObsidianClipper] Loaded:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyStartsWith: apiKey?.substring(0, 10) || 'N/A',
      selectedModel
    });

    elements.modelSelector.value = selectedModel;
  } catch (error) {
    console.error('[MyObsidianClipper] Error loading settings:', error);
  }

  // Check if on YouTube
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const isYouTube = tabs[0]?.url?.includes('youtube.com/watch');
  console.log('[MyObsidianClipper] Current tab URL:', tabs[0]?.url);
  console.log('[MyObsidianClipper] Is YouTube:', isYouTube);

  if (!isYouTube) {
    console.log('[MyObsidianClipper] Not on YouTube, showing error');
    elements.videoInfo.classList.add('hidden');
    elements.notYoutube.classList.remove('hidden');
    return;
  }

  if (!apiKey || apiKey.trim() === '') {
    console.error('[MyObsidianClipper] API key is missing or empty. apiKey type:', typeof apiKey, 'value:', apiKey);
    elements.videoInfo.classList.add('hidden');
    elements.noConfig.classList.remove('hidden');
    return;
  }

  console.log('[MyObsidianClipper] Initialization complete, extracting YouTube content...');
  // Extract YouTube content
  await extractAndDisplay();
}

async function extractAndDisplay() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tabs[0].id;

  try {
    videoData = await chrome.tabs.sendMessage(tabId, { action: 'extractYouTubeContent' });

    if (!videoData.success) {
      throw new Error(videoData.error || 'Failed to extract video data');
    }

    videoData = videoData.data;
    elements.videoTitle.textContent = videoData.title;
    elements.videoChannel.textContent = videoData.channel;
    elements.videoInfo.classList.remove('hidden');
  } catch (error) {
    console.error('Extraction error:', error);
    elements.videoInfo.classList.add('hidden');
    elements.noConfig.classList.remove('hidden');
  }
}

// Event listeners
elements.settingsLink.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

elements.gotoSettingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

elements.generateBtn.addEventListener('click', generateSummary);
elements.backBtn.addEventListener('click', () => setState('initial'));
elements.retryBtn.addEventListener('click', generateSummary);

elements.saveObsidianBtn.addEventListener('click', saveToObsidian);
elements.downloadBtn.addEventListener('click', downloadFile);

elements.editFilenameBtn.addEventListener('click', () => {
  elements.filenameInput.focus();
  elements.filenameInput.select();
});

elements.modelSelector.addEventListener('change', (e) => {
  selectedModel = e.target.value;
});

// Generate summary
async function generateSummary() {
  setState('loading');

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0].id;

    // Get transcript
    const transcriptResult = await getTranscriptWithFallback(
      videoData.captionTracks,
      videoData.description
    );

    // Call Gemini
    const geminiResult = await generateYouTubeSummary(
      apiKey,
      selectedModel,
      videoData,
      transcriptResult
    );

    if (!geminiResult.success) {
      throw new Error(geminiResult.error);
    }

    // Extract filename and content
    const { filename, content } = extractFilenameAndContent(geminiResult.content);
    generatedMarkdown = content;
    generatedFilename = filename;

    elements.filenameInput.value = filename;
    elements.previewContent.textContent = content;

    setState('preview');
  } catch (error) {
    console.error('Generation error:', error);
    elements.errorMessage.textContent = error.message || 'エラーが発生しました';
    setState('error');
  }
}

// Save to Obsidian
async function saveToObsidian() {
  try {
    const settings = await chrome.storage.sync.get([
      'obsidianVaultName',
      'obsidianFolder'
    ]);

    const vaultName = settings.obsidianVaultName;
    const folder = settings.obsidianFolder || '';

    if (!vaultName) {
      throw new Error('Obsidian Vault名が設定されていません');
    }

    let filePath = elements.filenameInput.value;
    if (!filePath.endsWith('.md')) {
      filePath += '.md';
    }

    // Remove extension for URI
    const fileNameWithoutExt = filePath.replace('.md', '');

    // Build Obsidian URI
    let uri = `obsidian://new?vault=${encodeURIComponent(vaultName)}`;
    uri += `&file=${encodeURIComponent(folder ? folder + '/' + fileNameWithoutExt : fileNameWithoutExt)}`;
    uri += `&content=${encodeURIComponent(generatedMarkdown)}`;

    // Open URI
    window.location.href = uri;

    // Reset after short delay
    setTimeout(() => {
      setState('initial');
      generatedMarkdown = null;
      generatedFilename = null;
    }, 1000);
  } catch (error) {
    elements.errorMessage.textContent = error.message;
    setState('error');
  }
}

// Download file
async function downloadFile() {
  try {
    let filename = elements.filenameInput.value;
    if (!filename.endsWith('.md')) {
      filename += '.md';
    }

    const { blob } = formatForDownload(filename, generatedMarkdown);
    const url = URL.createObjectURL(blob);

    const settings = await chrome.storage.sync.get(['downloadFolder']);
    const downloadFolder = settings.downloadFolder || '';

    chrome.downloads.download({
      url,
      filename: downloadFolder ? downloadFolder + '/' + filename : filename,
      saveAs: false
    });

    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);

    // Reset
    setState('initial');
    generatedMarkdown = null;
    generatedFilename = null;
  } catch (error) {
    console.error('Download error:', error);
    elements.errorMessage.textContent = 'ダウンロードに失敗しました';
    setState('error');
  }
}
