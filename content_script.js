// content_script.js
(async () => {
  if (typeof JSZip === 'undefined') {
    console.error('JSZip not loaded');
    return;
  }

  const zip = new JSZip();

  // Extract workspace name from URL (e.g., "myworkspace" from "myworkspace.slack.com")
  const workspaceName = location.hostname.split('.')[0];
  const baseName = `slemex-${workspaceName}`;

  // Function to fetch image as blob using fetch API (works with CORS)
  async function fetchImageAsBlob(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}`);
      return await response.blob();
    } catch (err) {
      console.error('Error fetching image:', url, err);
      throw err;
    }
  }

  function findEmojiElements() {
    const emojiMap = new Map();

    // Target the specific structure from the provided HTML
    // Look for rows in the emoji list table
    const rows = document.querySelectorAll('.c-virtual_list__item .p-customize_emoji_list__row');

    rows.forEach(row => {
      // Find the image element
      const imgElement = row.querySelector('.p-customize_emoji_list__image');
      if (!imgElement || !imgElement.src) return;

      // Extract emoji name from the bold text containing :emoji_name:
      const nameElement = row.querySelector('b.black');
      let emojiName = '';

      if (nameElement) {
        const nameText = nameElement.textContent.trim();
        // Remove surrounding colons
        emojiName = nameText.replace(/^:|:$/g, '').trim();
      }

      // Fallback to alt text if name not found
      if (!emojiName && imgElement.alt) {
        emojiName = imgElement.alt.replace(/^:|:$/g, '').trim();
      }

      // Skip if we still don't have a name
      if (!emojiName) {
        emojiName = 'emoji_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      }

      // Add to map if not already present (avoid duplicates)
      if (!emojiMap.has(imgElement.src)) {
        emojiMap.set(imgElement.src, {
          name: emojiName,
          url: imgElement.src,
          element: imgElement
        });
      }
    });

    // Also check for any other emoji images on the page as fallback
    if (emojiMap.size === 0) {
      const fallbackImages = document.querySelectorAll('.p-customize_emoji_list__image, [data-qa="customize_emoji_row"] img');
      fallbackImages.forEach(img => {
        if (!img.src) return;
        let name = img.alt || img.getAttribute('aria-label') || '';
        name = name.replace(/^:|:$/g, '').trim() || 'emoji';

        if (!emojiMap.has(img.src)) {
          emojiMap.set(img.src, {
            name: name,
            url: img.src,
            element: img
          });
        }
      });
    }

    return Array.from(emojiMap.values());
  }

  console.log('Starting emoji export...');
  const emojis = findEmojiElements();

  if (!emojis.length) {
    alert('No emojis found. Please make sure you are on the Slack emoji customization page (/customize/emoji).');
    return;
  }

  console.log(`Found ${emojis.length} emojis to export`);

  // Create emojis folder in zip
  const folder = zip.folder('emojis');

  let successCount = 0;
  let failCount = 0;

  // Process emojis
  for (let i = 0; i < emojis.length; i++) {
    const emoji = emojis[i];
    try {
      console.log(`Processing emoji ${i + 1}/${emojis.length}: ${emoji.name}`);

      // Fetch the image as blob
      const blob = await fetchImageAsBlob(emoji.url);

      // Determine file extension from URL or default to png
      let ext = 'png';
      const urlParts = emoji.url.split('.');
      if (urlParts.length > 1) {
        const possibleExt = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(possibleExt)) {
          ext = possibleExt;
        }
      }

      // Sanitize filename
      const safeName = emoji.name.replace(/[\/\\<>:"|?*\x00-\x1F]/g, '_');
      const filename = `${safeName}.${ext}`;

      // Add file to zip
      folder.file(filename, blob);
      successCount++;
    } catch (err) {
      console.warn(`Failed to process emoji ${emoji.name}:`, err);
      failCount++;
    }
  }

  if (successCount === 0) {
    alert('Failed to export any emojis. There might be CORS restrictions.');
    return;
  }

  console.log(`Export complete: ${successCount} successful, ${failCount} failed`);

  // Generate and download zip
  console.log('Generating zip file...');
  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  });

  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  console.log(`Downloaded ${baseName}.zip with ${successCount} emojis`);
})();
