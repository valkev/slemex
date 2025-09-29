// background.js - handles CORS-free image fetching
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchImage') {
    fetch(request.url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => blob.arrayBuffer())
      .then(arrayBuffer => {
        // Convert ArrayBuffer to base64 string for message passing
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        sendResponse({ success: true, data: base64 });
      })
      .catch(error => {
        console.error('Background fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });

    // Return true to indicate we'll send the response asynchronously
    return true;
  }
});