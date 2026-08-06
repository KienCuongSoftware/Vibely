import { uploadApi } from "@/features/upload/api/uploadApi.js";
import { uploadToPresignedPutUrl } from "@/shared/api/http.js";

/** Files at or above this size use S3 multipart (parallel parts). */
export const MULTIPART_THRESHOLD_BYTES = 16 * 1024 * 1024;
const DEFAULT_PART_SIZE_BYTES = 16 * 1024 * 1024;
const CONCURRENCY = 4;
const PRESIGN_BATCH_SIZE = 20;
const PART_MAX_RETRIES = 3;

/**
 * Upload a video File to S3 (single PUT if &lt;16MB, else multipart with parallel parts).
 * @returns {Promise<{ playbackUrl: string, objectKey?: string }>}
 */
export async function uploadVideoFile({
  token,
  file,
  contentType,
  onProgress,
  signal,
}) {
  if (!token) {
    throw new Error("Bạn cần đăng nhập.");
  }
  if (!file) {
    throw new Error("Thiếu tệp video.");
  }
  const ct =
    contentType ||
    (file.type && String(file.type).trim()) ||
    "video/mp4";

  if (file.size < MULTIPART_THRESHOLD_BYTES) {
    const presign = await uploadApi.presignVideoUpload(token, {
      contentType: ct,
      fileName: file.name,
      fileSizeBytes: file.size,
    });
    await uploadToPresignedPutUrl(
      presign.uploadUrl,
      file,
      presign.contentType,
      onProgress,
      { signal },
    );
    return {
      playbackUrl: presign.playbackUrl,
      objectKey: presign.objectKey,
    };
  }

  return uploadVideoMultipart({
    token,
    file,
    contentType: ct,
    onProgress,
    signal,
  });
}

async function uploadVideoMultipart({
  token,
  file,
  contentType,
  onProgress,
  signal,
}) {
  throwIfAborted(signal);

  const initiated = await uploadApi.initiateMultipartVideoUpload(token, {
    contentType,
    fileName: file.name,
    fileSizeBytes: file.size,
  });

  const uploadId = initiated.uploadId;
  const objectKey = initiated.objectKey;
  const partSize = Number(initiated.partSizeBytes) > 0
    ? Number(initiated.partSizeBytes)
    : DEFAULT_PART_SIZE_BYTES;
  const totalParts = Math.max(1, Math.ceil(file.size / partSize));

  const abortMultipartBestEffort = () => {
    void uploadApi
      .abortMultipartVideoUpload(token, { uploadId, objectKey })
      .catch(() => {});
  };

  const onAbort = () => {
    abortMultipartBestEffort();
  };
  if (signal) {
    if (signal.aborted) {
      abortMultipartBestEffort();
      throw new DOMException("Aborted", "AbortError");
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }

  const partLoaded = new Array(totalParts).fill(0);
  const reportProgress = () => {
    if (typeof onProgress !== "function") return;
    const loaded = partLoaded.reduce((sum, n) => sum + n, 0);
    const total = file.size || 0;
    const percent =
      total > 0
        ? Math.max(0, Math.min(100, Math.round((loaded / total) * 10000) / 100))
        : 0;
    onProgress(percent, { loaded, total });
  };

  try {
    const completedParts = new Array(totalParts);
    let nextPartIndex = 0;

    const presignCache = new Map();
    /** @type {Promise<void> | null} */
    let presignInflight = null;

    const ensurePresigned = async (partNumber) => {
      for (;;) {
        if (presignCache.has(partNumber)) {
          return presignCache.get(partNumber);
        }
        if (presignInflight) {
          await presignInflight;
          continue;
        }
        break;
      }

      const batchStart = partNumber;
      const batchEnd = Math.min(totalParts, batchStart + PRESIGN_BATCH_SIZE - 1);
      const partNumbers = [];
      for (let n = batchStart; n <= batchEnd; n += 1) {
        if (!presignCache.has(n)) partNumbers.push(n);
      }
      if (partNumbers.length === 0) {
        return presignCache.get(partNumber);
      }

      throwIfAborted(signal);
      presignInflight = (async () => {
        const res = await uploadApi.presignMultipartVideoParts(token, {
          uploadId,
          objectKey,
          partNumbers,
        });
        for (const part of res.parts || []) {
          presignCache.set(part.partNumber, part.uploadUrl);
        }
      })();
      try {
        await presignInflight;
      } finally {
        presignInflight = null;
      }
      return presignCache.get(partNumber);
    };

    const uploadOnePart = async (partNumber) => {
      const index = partNumber - 1;
      const start = index * partSize;
      const end = Math.min(file.size, start + partSize);
      const blob = file.slice(start, end);
      const partByteLength = end - start;

      let lastError;
      for (let attempt = 1; attempt <= PART_MAX_RETRIES; attempt += 1) {
        throwIfAborted(signal);
        try {
          const uploadUrl = await ensurePresigned(partNumber);
          if (!uploadUrl) {
            throw new Error(`Không ký được URL cho part ${partNumber}.`);
          }
          const etag = await putPartWithProgress({
            uploadUrl,
            blob,
            signal,
            onPartProgress: (loaded) => {
              partLoaded[index] = Math.min(partByteLength, loaded);
              reportProgress();
            },
          });
          partLoaded[index] = partByteLength;
          reportProgress();
          completedParts[index] = { partNumber, etag };
          return;
        } catch (err) {
          if (err?.name === "AbortError") throw err;
          lastError = err;
          partLoaded[index] = 0;
          reportProgress();
          // Drop stale URL so the next attempt re-presigns this part.
          presignCache.delete(partNumber);
          if (attempt < PART_MAX_RETRIES) {
            await sleep(250 * attempt);
          }
        }
      }
      throw lastError || new Error(`Tải part ${partNumber} thất bại.`);
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, totalParts) },
      async () => {
        while (true) {
          throwIfAborted(signal);
          const partNumber = ++nextPartIndex;
          if (partNumber > totalParts) return;
          await uploadOnePart(partNumber);
        }
      },
    );

    await Promise.all(workers);

    throwIfAborted(signal);
    const completed = await uploadApi.completeMultipartVideoUpload(token, {
      uploadId,
      objectKey,
      parts: completedParts,
    });

    if (typeof onProgress === "function") {
      onProgress(100, { loaded: file.size, total: file.size });
    }

    return {
      playbackUrl: completed.playbackUrl,
      objectKey: completed.objectKey || objectKey,
    };
  } catch (err) {
    if (err?.name === "AbortError") {
      throw err;
    }
    abortMultipartBestEffort();
    throw err;
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

function putPartWithProgress({ uploadUrl, blob, signal, onPartProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);

    const onAbort = () => {
      xhr.abort();
    };
    if (signal) {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onPartProgress?.(event.loaded);
    };

    xhr.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        const raw =
          xhr.getResponseHeader("ETag") ||
          xhr.getResponseHeader("etag") ||
          "";
        const etag = normalizeEtag(raw);
        if (!etag) {
          reject(
            new Error(
              "Thiếu ETag từ S3. Kiểm tra CORS ExposeHeaders gồm ETag.",
            ),
          );
          return;
        }
        resolve(etag);
        return;
      }
      reject(
        new Error(`Tải phần video lên kho lưu trữ thất bại (mã ${xhr.status}).`),
      );
    };
    xhr.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("Tải phần video lên kho lưu trữ thất bại."));
    };
    xhr.onabort = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("Aborted", "AbortError"));
    };
    // Do not set Content-Type — UploadPart signatures omit it.
    xhr.send(blob);
  });
}

function normalizeEtag(raw) {
  if (!raw) return "";
  let etag = String(raw).trim();
  if (etag.length >= 2 && etag.startsWith('"') && etag.endsWith('"')) {
    etag = etag.slice(1, -1);
  }
  return etag.trim();
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
