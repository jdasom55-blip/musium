export interface CompressedImageResult {
  dataUrl: string;
  compressedSizeBytes: number;
  originalSizeBytes: number;
  width: number;
  height: number;
  compressionRatio: number;
}

// Keep Data URL comfortably under Firestore's 1MB document limit (max ~880KB string -> ~660KB binary)
const MAX_DATA_URL_LENGTH = 880_000;
const MAX_DIMENSION = 1280;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러올 수 없습니다. 지원되는 이미지 파일인지 확인해 주세요.'));
    };
    img.src = objectUrl;
  });
}

function estimateBase64Bytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',');
  const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(1, Math.floor((base64.length * 3) / 4) - padding);
}

export async function compressImageUnder1MB(file: File): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일(JPG, PNG, WebP 등)만 업로드할 수 있습니다.');
  }

  const img = await loadImageFromFile(file);
  const originalWidth = img.naturalWidth || img.width;
  const originalHeight = img.naturalHeight || img.height;

  if (!originalWidth || !originalHeight) {
    throw new Error('유효한 이미지 크기를 확인할 수 없습니다.');
  }

  let scale = Math.min(1, MAX_DIMENSION / Math.max(originalWidth, originalHeight));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('브라우저 캔버스 컨텍스트를 초기화할 수 없습니다.');
  }

  let bestDataUrl = '';
  let bestWidth = originalWidth;
  let bestHeight = originalHeight;

  const qualitySteps = [0.86, 0.76, 0.66, 0.56, 0.46, 0.36];

  for (let pass = 0; pass < 5; pass++) {
    const targetWidth = Math.max(120, Math.round(originalWidth * scale));
    const targetHeight = Math.max(120, Math.round(originalHeight * scale));
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Fill warm alabaster background in case source PNG/WebP has transparency
    ctx.fillStyle = '#FBF9F5';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    for (const quality of qualitySteps) {
      const candidate = canvas.toDataURL('image/jpeg', quality);
      bestDataUrl = candidate;
      bestWidth = targetWidth;
      bestHeight = targetHeight;

      if (candidate.length <= MAX_DATA_URL_LENGTH) {
        const compressedSizeBytes = estimateBase64Bytes(candidate);
        return {
          dataUrl: candidate,
          compressedSizeBytes,
          originalSizeBytes: file.size,
          width: targetWidth,
          height: targetHeight,
          compressionRatio: file.size > 0 ? Math.round((1 - compressedSizeBytes / file.size) * 100) : 0,
        };
      }
    }

    scale *= 0.75;
  }

  const fallbackBytes = estimateBase64Bytes(bestDataUrl);
  if (bestDataUrl.length > 920_000 || fallbackBytes > 1_048_576) {
    throw new Error('이미지를 1MB 이하로 압축하지 못했습니다. 조금 더 작은 이미지를 선택해 주세요.');
  }

  return {
    dataUrl: bestDataUrl,
    compressedSizeBytes: fallbackBytes,
    originalSizeBytes: file.size,
    width: bestWidth,
    height: bestHeight,
    compressionRatio: file.size > 0 ? Math.round((1 - fallbackBytes / file.size) * 100) : 0,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
