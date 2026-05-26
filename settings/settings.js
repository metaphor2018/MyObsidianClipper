const STORAGE_KEYS = {
  geminiApiKey: 'geminiApiKey',
  geminiModel: 'geminiModel',
  obsidianVaultName: 'obsidianVaultName',
  obsidianFolder: 'obsidianFolder',
  downloadFolder: 'downloadFolder'
};

const DEFAULT_VALUES = {
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  obsidianVaultName: '',
  obsidianFolder: 'YouTube',
  downloadFolder: ''
};

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_VALUES);
  document.getElementById('gemini-api-key').value = settings.geminiApiKey || '';
  document.getElementById('gemini-model').value = settings.geminiModel || DEFAULT_VALUES.geminiModel;
  document.getElementById('obsidian-vault').value = settings.obsidianVaultName || '';
  document.getElementById('obsidian-folder').value = settings.obsidianFolder || DEFAULT_VALUES.obsidianFolder;
  document.getElementById('download-folder').value = settings.downloadFolder || '';
}

async function saveSettings() {
  const settings = {
    geminiApiKey: document.getElementById('gemini-api-key').value.trim(),
    geminiModel: document.getElementById('gemini-model').value,
    obsidianVaultName: document.getElementById('obsidian-vault').value.trim(),
    obsidianFolder: document.getElementById('obsidian-folder').value.trim(),
    downloadFolder: document.getElementById('download-folder').value.trim()
  };

  if (!settings.geminiApiKey) {
    showStatus('Gemini APIキーを入力してください', 'error');
    return;
  }

  if (!settings.obsidianVaultName) {
    showStatus('Obsidian Vault名を入力してください', 'error');
    return;
  }

  await chrome.storage.sync.set(settings);
  showStatus('設定を保存しました ✓', 'success');
}

function resetSettings() {
  document.getElementById('gemini-api-key').value = '';
  document.getElementById('gemini-model').value = DEFAULT_VALUES.geminiModel;
  document.getElementById('obsidian-vault').value = '';
  document.getElementById('obsidian-folder').value = DEFAULT_VALUES.obsidianFolder;
  document.getElementById('download-folder').value = '';
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      statusEl.textContent = '';
      statusEl.className = 'status-message';
    }, 3000);
  }
}

document.getElementById('save-btn').addEventListener('click', saveSettings);
document.getElementById('reset-btn').addEventListener('click', resetSettings);

loadSettings();
