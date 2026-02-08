/**
 * Client-side video utilities for thumbnail capture and metadata extraction.
 * Uses HTML5 Video + Canvas APIs — no external dependencies required.
 */

const VIDEO_SIZE_WARNING_MB = 50;

/**
 * Captures the first frame of a video file as a JPEG data URL.
 *
 * Creates a temporary <video> element, seeks to the first frame,
 * draws it onto a <canvas>, and returns the result as a data URL.
 *
 * @param file - A video File object
 * @returns A Promise resolving to a JPEG data URL string of the first frame
 */
export async function captureVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load(); // release resources
    };

    video.onloadeddata = () => {
      // Seek to a tiny offset so the first rendered frame is available
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video for thumbnail capture'));
    };

    video.src = objectUrl;
  });
}

/**
 * Extracts the dimensions (width, height) and duration of a video file.
 *
 * @param file - A video File object
 * @returns A Promise resolving to an object with width, height, and duration (in seconds)
 */
export async function getVideoDimensions(
  file: File
): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    video.onloadedmetadata = () => {
      const result = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      };
      cleanup();
      resolve(result);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };

    video.src = objectUrl;
  });
}

/**
 * Checks whether a video file exceeds the given size limit.
 *
 * @param file - A File object to check
 * @param maxMB - Maximum allowed size in megabytes (defaults to 50 MB)
 * @returns `true` if the file size exceeds `maxMB`, `false` otherwise
 */
export function isVideoTooLarge(file: File, maxMB: number = VIDEO_SIZE_WARNING_MB): boolean {
  const maxBytes = maxMB * 1024 * 1024;
  return file.size > maxBytes;
}

/**
 * Formats a file size in bytes into a human-readable string (e.g. "12.5 MB").
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
