// Google Drive এবং Imgur-এর সাধারণ "শেয়ার লিংক" গুলো সরাসরি <img> এ দেখানো যায় না।
// এই ফাংশনটা সেই লিংকগুলো স্বয়ংক্রিয়ভাবে সরাসরি-দেখানো-যায় এমন ফরম্যাটে রূপান্তর করে।
export function toDirectImageUrl(url) {
  if (!url) return url;
  const trimmed = url.trim();

  // Google Drive: https://drive.google.com/file/d/FILE_ID/view?...  বা  ...open?id=FILE_ID
  const driveFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  const driveOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([^&]+)/);
  const driveId = driveFileMatch?.[1] || driveOpenMatch?.[1];
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  // Imgur পেজ লিংক (imgur.com/xxxx) -কে সরাসরি ইমেজ লিংকে (i.imgur.com/xxxx.jpg) বদলানো
  const imgurPageMatch = trimmed.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)$/);
  if (imgurPageMatch) {
    return `https://i.imgur.com/${imgurPageMatch[1]}.jpg`;
  }

  return trimmed;
}


/** ফাইল → base64 data URL */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** ফোনের ক্যামেরার আসল ছবি অনেক বড় (কয়েক MB) হয় — ব্রাউজারেই ছোট করে (সর্বোচ্চ
 *  maxDim px, JPEG quality) পাঠালে আপলোড অনেক দ্রুত হয়। */
export function compressImage(dataUrl, maxDim = 1400, quality = 0.72) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
