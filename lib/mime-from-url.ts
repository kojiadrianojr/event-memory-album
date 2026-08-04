const IMAGE_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

const VIDEO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  m4v: "video/mp4",
  ogv: "video/ogg",
};

const AUDIO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
};

function mimeMapForKind(kind: "image" | "video" | "audio") {
  return kind === "image" ? IMAGE_MIME : kind === "video" ? VIDEO_MIME : AUDIO_MIME;
}

function extensionFromName(name: string): string | undefined {
  return name.split(".").pop()?.split("?")[0]?.toLowerCase();
}

export function mimeFromFilename(
  filename: string,
  kind: "image" | "video" | "audio"
): string | null {
  const ext = extensionFromName(filename);
  if (!ext) return null;
  return mimeMapForKind(kind)[ext] ?? null;
}

export function mimeFromUrl(
  url: string,
  kind: "image" | "video" | "audio",
  fallback: string
): string {
  return mimeFromFilename(url, kind) ?? fallback;
}

export function resolveVideoMimeType(file: File): string {
  if (file.type.startsWith("video/")) return file.type;
  return mimeFromFilename(file.name, "video") ?? "video/mp4";
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || mimeFromFilename(file.name, "video") !== null;
}
