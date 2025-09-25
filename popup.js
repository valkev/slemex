const exportBtn = document.getElementById('exportBtn');
const status = document.getElementById('status');

function setStatus(text, type = 'info') {
  status.textContent = text;
  status.className = 'show';

  if (type === 'error') {
    status.classList.add('error');
  } else if (type === 'success') {
    status.classList.add('success');
  }

  // Auto-hide success messages after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      status.className = '';
    }, 5000);
  }
}

exportBtn.addEventListener('click', async () => {
  try {
    exportBtn.disabled = true;
    setStatus('Checking current tab...');

    // Execute the content script in the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      setStatus('No active tab found.', 'error');
      exportBtn.disabled = false;
      return;
    }

    // Check if we're on a Slack domain
    if (!tab.url || !tab.url.includes('.slack.com')) {
      setStatus('Please navigate to a Slack workspace first.', 'error');
      exportBtn.disabled = false;
      return;
    }

    // Check if we're on the emoji customization page
    if (!tab.url.includes('/customize/emoji')) {
      setStatus('Please go to the Slack emoji page (Settings → Customize → Emoji)', 'error');
      exportBtn.disabled = false;
      return;
    }

    setStatus('Processing emojis...');

    // Insert the content script which will perform the zip & download
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['jszip.min.js', 'content_script.js']
    });

    setStatus('Export started! Check your downloads folder.', 'success');

    // Re-enable button after a short delay
    setTimeout(() => {
      exportBtn.disabled = false;
    }, 2000);

  } catch (err) {
    console.error(err);
    setStatus('Error: ' + (err.message || err), 'error');
    exportBtn.disabled = false;
  }
});

