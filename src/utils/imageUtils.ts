/**
 * Converts an image URL (such as a local /texturas/... path) to a base64 Data URL
 */
export async function urlToDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = (e) => reject(new Error(`Failed to load image from ${url}: ${e}`));
    img.src = url;
  });
}

/**
 * Optimizes user room photos (e.g. 4000x3000 down to max 1600px)
 * Keeps aspect ratio and quality high, but avoids network timeout on cellular connections.
 */
export async function optimizeImageFile(file: File, maxDimension = 1600): Promise<{ dataUrl: string; width: number; height: number; aspectRatio: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not create canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.90);

        // Calculate closest standard aspect ratio for the model: "1:1", "3:4", "4:3", "9:16", "16:9"
        const ratio = width / height;
        let bestRatio = '4:3';
        if (ratio >= 1.6) bestRatio = '16:9';
        else if (ratio >= 1.2) bestRatio = '4:3';
        else if (ratio >= 0.9 && ratio <= 1.1) bestRatio = '1:1';
        else if (ratio >= 0.68 && ratio < 0.9) bestRatio = '3:4';
        else if (ratio < 0.68) bestRatio = '9:16';

        resolve({
          dataUrl,
          width,
          height,
          aspectRatio: bestRatio,
        });
      };
      img.onerror = () => reject(new Error('Failed to decode image file'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales an existing image data URL / path to a smaller JPEG for reliable multi-image API calls.
 */
export async function downscaleDataUrl(src: string, maxDimension = 1024, quality = 0.86): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
