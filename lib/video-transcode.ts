import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export const MAX_SKIP_BYTES = 40 * 1024 * 1024;
export const MAX_SKIP_EDGE = 1280;

export interface VideoMeta {
  width: number;
  height: number;
  duration: number;
}

export interface PrepareVideoResult {
  video: File;
  poster?: File;
  compressed: boolean;
  compressionNote?: string;
}

export interface TranscodeProgress {
  phase: "loading" | "preparing" | "compressing";
  progress: number;
  message: string;
}

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;
let ffmpegExecQueue: Promise<unknown> = Promise.resolve();

function fileExtension(name: string): string {
  const match = name.match(/\.[^.]+$/);
  return match?.[0] ?? ".mp4";
}

function coreBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/ffmpeg`;
}

function baseNameFromFile(file: File): string {
  return file.name.replace(/\.[^.]+$/, "") || "video";
}

function toFile(data: Uint8Array | string, name: string, type: string): File {
  return new File([new Blob([data as BlobPart])], name, { type });
}

function isMp4Like(file: File): boolean {
  if (file.type === "video/mp4") return true;
  const ext = file.name?.split(".").pop()?.toLowerCase();
  return ext === "mp4" || ext === "m4v";
}

export function shouldCompressVideo(
  file: File,
  meta: VideoMeta | null
): boolean {
  if (!isMp4Like(file)) return true;
  if (file.size > MAX_SKIP_BYTES) return true;
  // Probe failed — optimistic skip for in-limit mp4; poster/upload still work.
  if (!meta) return false;
  if (meta.width > MAX_SKIP_EDGE || meta.height > MAX_SKIP_EDGE) return true;
  return false;
}

export async function probeVideoMeta(file: File): Promise<VideoMeta | null> {
  if (typeof window === "undefined") return null;

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (meta: VideoMeta | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(meta);
    };

    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (width > 0 && height > 0) {
        finish({ width, height, duration });
      } else {
        finish(null);
      }
    };

    video.onerror = () => finish(null);
    setTimeout(() => finish(null), 5_000);

    video.src = objectUrl;
    video.load();
  });
}

function reportProgress(
  onProgress: ((progress: TranscodeProgress) => void) | undefined,
  progress: number,
  message: string,
  phase: TranscodeProgress["phase"] = "preparing"
) {
  onProgress?.({ phase, progress, message });
}

const POSTER_TIMEOUT_MS = 5_000;

export async function extractVideoPoster(
  file: File | Blob
): Promise<File | null> {
  if (typeof window === "undefined") return null;

  const blob = file instanceof File ? file : file;
  const baseName =
    file instanceof File ? baseNameFromFile(file) : "video";

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(blob);
    let settled = false;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (poster: File | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(poster);
    };

    const captureFrame = () => {
      if (settled) return;

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width <= 0 || height <= 0) {
        finish(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        finish(null);
        return;
      }

      try {
        ctx.drawImage(video, 0, 0, width, height);
      } catch {
        finish(null);
        return;
      }

      canvas.toBlob(
        (posterBlob) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (!posterBlob) {
            resolve(null);
            return;
          }
          resolve(
            new File([posterBlob], `${baseName}-poster.jpg`, {
              type: "image/jpeg",
            })
          );
        },
        "image/jpeg",
        0.85
      );
    };

    video.onloadedmetadata = () => {
      const target =
        video.duration > 0 ? Math.min(0.1, video.duration * 0.05) : 0.001;
      video.currentTime = target;
    };

    video.onseeked = captureFrame;
    video.onerror = () => finish(null);
    setTimeout(() => finish(null), POSTER_TIMEOUT_MS);

    video.src = objectUrl;
    video.load();
  });
}

async function extractVideoPosterWithTimeout(
  file: File | Blob
): Promise<File | null> {
  return Promise.race([
    extractVideoPoster(file),
    new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), POSTER_TIMEOUT_MS)
    ),
  ]);
}

async function getFfmpeg(
  onProgress?: (progress: TranscodeProgress) => void
): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (!ffmpegLoading) {
    ffmpegLoading = (async () => {
      reportProgress(onProgress, 10, "Loading compressor…", "loading");

      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message }) => {
        if (message.toLowerCase().includes("error")) {
          console.warn("[ffmpeg]", message);
        }
      });
      ffmpeg.on("progress", ({ progress }) => {
        const pct = Math.min(100, Math.round(progress * 100));
        onProgress?.({
          phase: "compressing",
          progress: Math.max(25, pct),
          message: `Compressing… ${pct}%`,
        });
      });

      try {
        const baseURL = coreBaseUrl();
        await ffmpeg.load({
          coreURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript"
          ),
          wasmURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm"
          ),
        });

        ffmpegInstance = ffmpeg;
        return ffmpeg;
      } catch (err) {
        ffmpegLoading = null;
        throw err;
      }
    })();
  }

  return ffmpegLoading;
}

export function prefetchFfmpeg(): void {
  if (typeof window === "undefined") return;
  void getFfmpeg().catch(() => {});
}

function runFfmpegExec(ffmpeg: FFmpeg, args: string[]): Promise<number> {
  const task = ffmpegExecQueue.then(() => ffmpeg.exec(args));
  ffmpegExecQueue = task.catch(() => {});
  return task;
}

async function compressVideo(
  file: File,
  onProgress?: (progress: TranscodeProgress) => void
): Promise<File> {
  const ffmpeg = await getFfmpeg(onProgress);
  const inputName = `input${fileExtension(file.name)}`;
  const outputName = "output.mp4";

  reportProgress(onProgress, 20, "Reading video…", "compressing");
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  reportProgress(onProgress, 25, "Compressing…", "compressing");

  const exitCode = await runFfmpegExec(ffmpeg, [
    "-i",
    inputName,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-vf",
    "scale=1280:-2:force_original_aspect_ratio=decrease",
    "-c:v",
    "libx264",
    "-crf",
    "28",
    "-preset",
    "ultrafast",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    outputName,
  ]);

  if (exitCode !== 0) {
    throw new Error(`Video compression failed (ffmpeg exit ${exitCode})`);
  }

  const videoData = await ffmpeg.readFile(outputName);
  const baseName = baseNameFromFile(file);
  return toFile(videoData, `${baseName}.mp4`, "video/mp4");
}

export async function prepareVideoForUpload(
  file: File,
  onProgress?: (progress: TranscodeProgress) => void
): Promise<PrepareVideoResult> {
  reportProgress(onProgress, 5, "Preparing video…");

  const meta = await probeVideoMeta(file);
  reportProgress(onProgress, 15, "Preparing video…");

  const needsCompress = shouldCompressVideo(file, meta);

  let uploadFile = file;
  let compressed = false;

  if (needsCompress) {
    uploadFile = await compressVideo(file, onProgress);
    compressed = true;
  } else {
    reportProgress(onProgress, 50, "Preparing video…");
  }

  reportProgress(onProgress, 80, "Creating preview…");
  const poster = await extractVideoPosterWithTimeout(uploadFile);
  reportProgress(onProgress, 100, "Ready to upload");

  return {
    video: uploadFile,
    ...(poster ? { poster } : {}),
    compressed,
  };
}

/** @deprecated Use prepareVideoForUpload instead. */
export async function transcodeVideo(
  file: File,
  onProgress?: (progress: TranscodeProgress) => void
): Promise<{ video: File; poster: File }> {
  const result = await prepareVideoForUpload(file, onProgress);
  if (!result.poster) {
    throw new Error("Poster extraction failed.");
  }
  return { video: result.video, poster: result.poster };
}
