"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDropzone, type Accept } from "react-dropzone";
import GuestNamePrompt from "@/components/ui/GuestNamePrompt";
import { extractTakenAt } from "@/lib/exif";
import { isVideoFile, mimeFromFilename, resolveVideoMimeType } from "@/lib/mime-from-url";
import { MAX_PHOTOS_PER_POST } from "@/lib/upload-limits";
import { fetchWithRetry, runWithConcurrency } from "@/lib/upload-queue";
import type { S3UploadMode } from "@/lib/s3-upload-mode";
import { prepareVideoForUpload, prefetchFfmpeg } from "@/lib/video-transcode";
import { useGuestName } from "@/lib/use-guest-name";
import { EventMoment, EventPrompt } from "@/components/gallery/types";
import MediaUploadTab from "./MediaUploadTab";
import TextMemoryTab from "./TextMemoryTab";
import VoiceMemoTab from "./VoiceMemoTab";
import MemoryTypePicker, { type MemoryType } from "./MemoryTypePicker";
import UploadContextBar from "./UploadContextBar";
import UploadStickyBar from "./UploadStickyBar";
import UploadSuccessPanel from "./UploadSuccessPanel";
import UploadErrorBanner from "./UploadErrorBanner";
import { FileUploadItem } from "./types";

const UPLOAD_CONCURRENCY = 3;

type ItemPatch = Partial<
  Pick<
    FileUploadItem,
    | "status"
    | "progress"
    | "errorMessage"
    | "objectKey"
    | "takenAt"
    | "thumbnailObjectKey"
    | "uploadFile"
    | "uploadMimeType"
    | "compressed"
    | "compressionNote"
  >
>;

function isMediaFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/") ||
    isVideoFile(file) ||
    mimeFromFilename(file.name, "image") !== null
  );
}

function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/");
}

interface UploadClientProps {
  token: string;
  eventId: string;
  uploadMode?: S3UploadMode;
}

export default function UploadClient({
  token,
  eventId,
  uploadMode = "presigned",
}: UploadClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPromptId = searchParams.get("promptId");

  const guestName = useGuestName(eventId);
  const [memoryType, setMemoryType] = useState<MemoryType>(
    initialPromptId ? "media" : "media"
  );
  const [mediaItems, setMediaItems] = useState<FileUploadItem[]>([]);
  const [audioFileItems, setAudioFileItems] = useState<FileUploadItem[]>([]);
  const [sharedCaption, setSharedCaption] = useState("");
  const [dropError, setDropError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [moments, setMoments] = useState<EventMoment[]>([]);
  const [prompts, setPrompts] = useState<EventPrompt[]>([]);
  const [selectedMomentId, setSelectedMomentId] = useState<string>("");
  const [selectedPromptId, setSelectedPromptId] = useState<string>(
    initialPromptId ?? ""
  );
  const [textMemory, setTextMemory] = useState("");
  const [textSubmitting, setTextSubmitting] = useState(false);
  const [textUploadSuccess, setTextUploadSuccess] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [audioUploadSuccess, setAudioUploadSuccess] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioCaption, setAudioCaption] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaBatchKeyRef = useRef<string | null>(null);
  const textMemoryKeyRef = useRef<string | null>(null);
  const audioPostKeyRef = useRef<string | null>(null);

  function newIdempotencyKey(): string {
    return crypto.randomUUID();
  }

  const activePrompt =
    prompts.find((p) => p.id === selectedPromptId) ?? null;

  useEffect(() => {
    fetch(`/api/events/${token}/moments`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setMoments)
      .catch(() => {});
    fetch(`/api/events/${token}/prompts`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setPrompts)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!recording) {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      return;
    }
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [recording]);

  function patchMediaItem(id: string, patch: ItemPatch) {
    setMediaItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function patchAudioItem(id: string, patch: ItemPatch) {
    setAudioFileItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setDropError(null);

      if (memoryType === "media") {
        const currentCount = mediaItems.length;
        const remaining = MAX_PHOTOS_PER_POST - currentCount;

        if (remaining <= 0) {
          setDropError(`Maximum ${MAX_PHOTOS_PER_POST} items per post.`);
          return;
        }

        const mediaFiles = acceptedFiles.filter(isMediaFile);
        const toAdd = mediaFiles.slice(0, remaining);
        if (toAdd.length < mediaFiles.length) {
          setDropError(
            `Only ${remaining} more item${remaining === 1 ? "" : "s"} can be added (max ${MAX_PHOTOS_PER_POST} per post).`
          );
        }

        const newItems = toAdd.map((file) => ({
          id: `${Date.now()}-${Math.random()}`,
          file,
          status: "pending" as const,
          progress: 0,
        }));
        if (toAdd.some((file) => isVideoFile(file))) {
          prefetchFfmpeg();
        }
        setMediaItems((prev) => [...prev, ...newItems]);
        return;
      }

      if (memoryType === "audio") {
        const audioFiles = acceptedFiles.filter(isAudioFile);
        if (audioFiles.length === 0) return;
        const file = audioFiles[0];
        setAudioFileItems([
          {
            id: `${Date.now()}-${Math.random()}`,
            file,
            status: "pending",
            progress: 0,
          },
        ]);
        setAudioBlob(null);
      }
    },
    [memoryType, mediaItems.length]
  );

  const acceptMap: Accept =
    memoryType === "audio"
      ? { "audio/*": [] }
      : { "image/*": [], "video/*": [] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptMap,
    multiple: memoryType === "media",
    maxFiles: memoryType === "media" ? MAX_PHOTOS_PER_POST : 1,
    noClick: memoryType === "text",
    noDrag: memoryType === "text",
  });

  function removeMediaItem(id: string) {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
    setDropError(null);
  }

  function removeAudioFileItem(id: string) {
    setAudioFileItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function uploadBlobViaApp(
    blob: File | Blob,
    filename: string,
    mimeType: string,
    itemId: string,
    patchItem: (id: string, patch: ItemPatch) => void
  ): Promise<string | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const objectKey = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          const file =
            blob instanceof File
              ? blob
              : new File([blob], filename, { type: mimeType });
          formData.append("file", file);
          formData.append("token", token);
          formData.append("mimeType", mimeType);
          formData.append("filename", filename);

          xhr.open("POST", "/api/upload/direct");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              patchItem(itemId, {
                status: "uploading",
                progress: Math.round((e.loaded / e.total) * 90),
              });
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText) as {
                  objectKey?: string;
                };
                if (data.objectKey) resolve(data.objectKey);
                else reject(new Error("Upload response missing objectKey."));
              } catch {
                reject(new Error("Invalid upload response."));
              }
            } else {
              reject(new Error(`Upload returned ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Network error during upload."));
          xhr.send(formData);
        });
        return objectKey;
      } catch (err) {
        const isNetworkError =
          err instanceof Error &&
          err.message === "Network error during upload.";
        if (attempt === 0 && isNetworkError) continue;
        patchItem(itemId, {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Upload failed.",
        });
        return null;
      }
    }
    return null;
  }

  async function putBlobToStorage(
    blob: File | Blob,
    mimeType: string,
    presignedUrl: string,
    itemId: string,
    patchItem: (id: string, patch: ItemPatch) => void
  ): Promise<boolean> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presignedUrl);
          xhr.setRequestHeader("Content-Type", mimeType);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              patchItem(itemId, {
                status: "uploading",
                progress: Math.round((e.loaded / e.total) * 90),
              });
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`Storage returned ${xhr.status}`));
          };
          xhr.onerror = () => reject(new Error("Network error during upload."));
          xhr.send(blob);
        });
        return true;
      } catch (err) {
        const isNetworkError =
          err instanceof Error &&
          err.message === "Network error during upload.";
        if (attempt === 0 && isNetworkError) continue;
        patchItem(itemId, {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Upload failed.",
        });
        return false;
      }
    }
    return false;
  }

  async function uploadToStorage(
    item: FileUploadItem,
    patchItem: (id: string, patch: ItemPatch) => void,
    skipVideoTranscode = false
  ): Promise<FileUploadItem | null> {
    let uploadFile = item.uploadFile ?? item.file;
    const video = isVideoFile(item.file);
    let mimeType =
      item.uploadMimeType ??
      (video ? resolveVideoMimeType(item.file) : item.file.type);
    let thumbnailObjectKey = item.thumbnailObjectKey;
    let compressed = item.compressed ?? false;
    let compressionNote = item.compressionNote;
    let pendingPoster: File | undefined;

    if (
      !skipVideoTranscode &&
      video &&
      !item.uploadFile
    ) {
      patchItem(item.id, {
        status: "compressing",
        progress: 0,
        errorMessage: undefined,
        compressionNote: undefined,
      });
      try {
        const result = await prepareVideoForUpload(item.file, (progress) => {
          patchItem(item.id, {
            status: "compressing",
            progress: Math.max(1, progress.progress),
          });
        });
        uploadFile = result.video;
        mimeType = result.compressed ? "video/mp4" : resolveVideoMimeType(item.file);
        compressed = result.compressed;
        compressionNote = result.compressionNote;
        pendingPoster = result.poster;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Video preparation failed";
        console.warn("Video preparation failed, uploading original:", err);
        uploadFile = item.file;
        mimeType = resolveVideoMimeType(item.file);
        compressed = false;
        compressionNote = `Compression skipped (${message}). Uploaded original format.`;
      }
    }

    patchItem(item.id, {
      status: "uploading",
      progress: 0,
      errorMessage: undefined,
      uploadFile,
      uploadMimeType: mimeType,
      thumbnailObjectKey,
      compressed,
      compressionNote,
    });

    const takenAt =
      item.takenAt ?? (isMediaFile(item.file) ? await extractTakenAt(item.file) : undefined);

    let objectKey: string;

    if (uploadMode === "direct") {
      const directKey = await uploadBlobViaApp(
        uploadFile,
        uploadFile.name,
        mimeType,
        item.id,
        patchItem
      );
      if (!directKey) return null;
      objectKey = directKey;
    } else {
      const presignedResult = await fetchWithRetry("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: uploadFile.name,
          mimeType,
          token,
        }),
      });
      if (!presignedResult.ok) {
        patchItem(item.id, {
          status: "error",
          errorMessage: presignedResult.errorMessage,
        });
        return null;
      }
      if (!presignedResult.response.ok) {
        patchItem(item.id, {
          status: "error",
          errorMessage: "Failed to get upload URL.",
        });
        return null;
      }

      const presignedData = await presignedResult.response.json();
      objectKey = presignedData.objectKey;
      const stored = await putBlobToStorage(
        uploadFile,
        mimeType,
        presignedData.presignedUrl,
        item.id,
        patchItem
      );
      if (!stored) return null;
    }

    if (pendingPoster) {
      if (uploadMode === "direct") {
        const thumbKey = await uploadBlobViaApp(
          pendingPoster,
          pendingPoster.name,
          "image/jpeg",
          item.id,
          patchItem
        );
        if (thumbKey) thumbnailObjectKey = thumbKey;
      } else {
        const posterPresigned = await fetchWithRetry("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: pendingPoster.name,
            mimeType: "image/jpeg",
            token,
          }),
        });
        if (posterPresigned.ok && posterPresigned.response.ok) {
          const { presignedUrl: posterUrl, objectKey: thumbKey } =
            await posterPresigned.response.json();
          const posterOk = await putBlobToStorage(
            pendingPoster,
            "image/jpeg",
            posterUrl,
            item.id,
            patchItem
          );
          if (posterOk) thumbnailObjectKey = thumbKey;
        }
      }
    }

    patchItem(item.id, {
      status: "stored",
      progress: 100,
      objectKey,
      takenAt,
      uploadFile,
      uploadMimeType: mimeType,
      thumbnailObjectKey,
      compressed,
      compressionNote,
    });

    return {
      ...item,
      status: "stored",
      progress: 100,
      objectKey,
      takenAt,
      uploadFile,
      uploadMimeType: mimeType,
      thumbnailObjectKey,
      compressed,
      compressionNote,
    };
  }

  async function createPostFromStored(
    storedItems: FileUploadItem[],
    name: string,
    idempotencyKey: string
  ): Promise<boolean> {
    const postResult = await fetchWithRetry("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        eventId,
        uploaderName: name,
        caption: sharedCaption.trim() || undefined,
        momentId: selectedMomentId || undefined,
        promptId: selectedPromptId || undefined,
        idempotencyKey,
        items: storedItems.map((item) => ({
          objectKey: item.objectKey,
          type:
            isVideoFile(item.file) ||
            (item.uploadMimeType ?? "").startsWith("video/")
              ? "VIDEO"
              : "PHOTO",
          takenAt: item.takenAt,
          thumbnailObjectKey: item.thumbnailObjectKey,
        })),
      }),
    });

    if (!postResult.ok) {
      for (const item of storedItems) {
        patchMediaItem(item.id, {
          status: "stored",
          errorMessage: postResult.errorMessage,
        });
      }
      return false;
    }
    if (!postResult.response.ok) {
      for (const item of storedItems) {
        patchMediaItem(item.id, {
          status: "stored",
          errorMessage: "Failed to save post.",
        });
      }
      return false;
    }

    for (const item of storedItems) {
      patchMediaItem(item.id, { status: "done", errorMessage: undefined });
    }
    mediaBatchKeyRef.current = null;
    return true;
  }

  async function postAudioMedia(
    objectKey: string,
    caption: string | undefined,
    name: string,
    idempotencyKey: string
  ): Promise<{ ok: boolean; errorMessage?: string }> {
    const mediaResult = await fetchWithRetry("/api/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        objectKey,
        type: "AUDIO",
        caption: caption || undefined,
        uploaderName: name,
        eventId,
        momentId: selectedMomentId || undefined,
        promptId: selectedPromptId || undefined,
        idempotencyKey,
      }),
    });

    if (!mediaResult.ok) {
      return { ok: false, errorMessage: mediaResult.errorMessage };
    }
    if (!mediaResult.response.ok) {
      return { ok: false, errorMessage: "Failed to save voice message." };
    }
    audioPostKeyRef.current = null;
    return { ok: true };
  }

  async function uploadMediaBatch(selected: FileUploadItem[], name: string) {
    if (selected.length === 0) return;

    if (!mediaBatchKeyRef.current) {
      mediaBatchKeyRef.current = newIdempotencyKey();
    }

    setUploading(true);

    const needsStorage = selected.filter(
      (item) => item.status === "pending" || item.status === "error"
    );
    const alreadyStored = selected.filter((item) => item.status === "stored");

    const storedFromUpload = await runWithConcurrency(
      needsStorage.map(
        (item) => () => uploadToStorage(item, patchMediaItem)
      ),
      UPLOAD_CONCURRENCY
    );

    const allStored = [
      ...alreadyStored,
      ...storedFromUpload.filter((item): item is FileUploadItem => item !== null),
    ];

    const expectedCount = selected.length;
    if (allStored.length < expectedCount) {
      setUploading(false);
      return;
    }

    await createPostFromStored(
      allStored,
      name,
      mediaBatchKeyRef.current
    );
    setUploading(false);
  }

  async function handleUploadAll() {
    if (!guestName) return;
    const pending = mediaItems.filter(
      (item) =>
        item.status === "pending" ||
        item.status === "stored" ||
        item.status === "error"
    );
    await uploadMediaBatch(pending, guestName);
  }

  async function retryMediaItem(id: string) {
    if (!guestName || uploading) return;
    const item = mediaItems.find((entry) => entry.id === id);
    if (!item) return;
    if (item.status !== "error" && item.status !== "stored") return;

    const pendingBatch = mediaItems.filter(
      (i) =>
        i.status === "pending" ||
        i.status === "stored" ||
        i.status === "error"
    );

    if (item.status === "error" && !item.objectKey) {
      patchMediaItem(id, {
        status: "pending",
        errorMessage: undefined,
        progress: 0,
      });
    }

    await uploadMediaBatch(pendingBatch, guestName);
  }

  async function retryFailed() {
    if (!guestName) return;
    const retryable = mediaItems.filter(
      (item) => item.status === "error" || item.status === "stored"
    );
    if (retryable.length === 0) return;

    for (const item of retryable) {
      if (item.status === "error" && !item.objectKey) {
        patchMediaItem(item.id, {
          status: "pending",
          errorMessage: undefined,
          progress: 0,
        });
      }
    }

    const batch = mediaItems.filter(
      (i) =>
        i.status === "pending" ||
        i.status === "stored" ||
        i.status === "error"
    );
    await uploadMediaBatch(batch, guestName);
  }

  function resetMediaComposer() {
    setMediaItems([]);
    setSharedCaption("");
    setDropError(null);
    mediaBatchKeyRef.current = null;
  }

  function resetTextComposer() {
    setTextMemory("");
    setTextUploadSuccess(false);
    setTextError(null);
    textMemoryKeyRef.current = null;
  }

  function resetAudioComposer() {
    setAudioBlob(null);
    setAudioCaption("");
    setAudioFileItems([]);
    setAudioUploadSuccess(false);
    setAudioError(null);
    setMicError(null);
    setRecording(false);
    setRecordingSeconds(0);
    audioPostKeyRef.current = null;
  }

  function clearPrompt() {
    setSelectedPromptId("");
    router.replace(`/event/${token}/upload`);
  }

  async function submitTextMemory() {
    if (!guestName || !textMemory.trim() || textSubmitting) return;
    if (!textMemoryKeyRef.current) {
      textMemoryKeyRef.current = newIdempotencyKey();
    }
    setTextSubmitting(true);
    setTextError(null);
    try {
      const result = await fetchWithRetry("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          type: "TEXT",
          caption: textMemory.trim(),
          uploaderName: guestName,
          eventId,
          momentId: selectedMomentId || undefined,
          promptId: selectedPromptId || undefined,
          idempotencyKey: textMemoryKeyRef.current,
        }),
      });
      if (result.ok && result.response.ok) {
        setTextMemory("");
        setTextUploadSuccess(true);
        textMemoryKeyRef.current = null;
      } else {
        setTextError(
          !result.ok ? result.errorMessage : "Failed to post memory."
        );
      }
    } finally {
      setTextSubmitting(false);
    }
  }

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        setAudioFileItems([]);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingSeconds(0);
      setRecording(true);
    } catch {
      setMicError(
        "Microphone access is required to record voice messages. Check your browser permissions."
      );
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function uploadAudioBlob(blob: Blob, caption: string) {
    if (!guestName) return false;

    const file = new File(
      [blob],
      `voice-${Date.now()}.webm`,
      { type: blob.type || "audio/webm" }
    );
    const item: FileUploadItem = {
      id: `audio-${Date.now()}`,
      file,
      status: "pending",
      progress: 0,
    };

    setUploading(true);
    setAudioError(null);

    const stored = await uploadToStorage(item, patchAudioItem, true);
    if (!stored?.objectKey) {
      setUploading(false);
      setAudioError("Failed to upload audio file.");
      return false;
    }

    if (!audioPostKeyRef.current) {
      audioPostKeyRef.current = newIdempotencyKey();
    }

    const result = await postAudioMedia(
      stored.objectKey,
      caption,
      guestName,
      audioPostKeyRef.current
    );
    setUploading(false);

    if (result.ok) {
      setAudioBlob(null);
      setAudioCaption("");
      setAudioFileItems([]);
      setAudioUploadSuccess(true);
      return true;
    }

    setAudioError(result.errorMessage ?? "Failed to post voice message.");
    return false;
  }

  async function uploadRecordedAudio() {
    if (!audioBlob) return;
    await uploadAudioBlob(audioBlob, audioCaption);
  }

  async function uploadAudioFileItem(item: FileUploadItem) {
    if (!guestName) return;

    setUploading(true);
    setAudioError(null);

    let stored: FileUploadItem | null = item;
    if (item.status === "pending" || item.status === "error") {
      if (item.status === "error" && !item.objectKey) {
        patchAudioItem(item.id, {
          status: "pending",
          errorMessage: undefined,
          progress: 0,
        });
      }
      stored = await uploadToStorage(item, patchAudioItem, true);
    }

    if (!stored?.objectKey) {
      setUploading(false);
      setAudioError("Failed to upload audio file.");
      return;
    }

    if (!audioPostKeyRef.current) {
      audioPostKeyRef.current = newIdempotencyKey();
    }

    const result = await postAudioMedia(
      stored.objectKey,
      audioCaption,
      guestName,
      audioPostKeyRef.current
    );
    setUploading(false);

    if (result.ok) {
      setAudioFileItems([]);
      setAudioCaption("");
      setAudioUploadSuccess(true);
    } else {
      patchAudioItem(item.id, {
        status: "error",
        errorMessage: result.errorMessage,
      });
      setAudioError(result.errorMessage ?? "Failed to post voice message.");
    }
  }

  async function handleUploadAudio() {
    if (audioBlob) {
      await uploadRecordedAudio();
      return;
    }
    const pending = audioFileItems.find(
      (i) => i.status === "pending" || i.status === "error" || i.status === "stored"
    );
    if (pending) {
      await uploadAudioFileItem(pending);
    }
  }

  async function retryAudioFileItem(id: string) {
    const item = audioFileItems.find((i) => i.id === id);
    if (item) await uploadAudioFileItem(item);
  }

  const uploadInProgress =
    uploading ||
    textSubmitting ||
    recording ||
    mediaItems.some(
      (i) => i.status === "compressing" || i.status === "uploading"
    ) ||
    audioFileItems.some(
      (i) => i.status === "compressing" || i.status === "uploading"
    );

  useEffect(() => {
    if (!uploadInProgress) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
      } catch {
        return;
      }

      if (!window.confirm("Upload in progress. Leave anyway?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [uploadInProgress]);

  const mediaPendingCount = mediaItems.filter(
    (i) => i.status === "pending" || i.status === "stored"
  ).length;
  const mediaBatchFinished =
    !uploading &&
    mediaPendingCount === 0 &&
    mediaItems.length > 0 &&
    memoryType === "media";
  const hasAudioToPost = Boolean(audioBlob) || audioFileItems.some(
    (i) => i.status === "pending" || i.status === "error" || i.status === "stored"
  );

  if (!guestName) {
    return <GuestNamePrompt token={token} eventId={eventId} />;
  }

  return (
    <div className="px-4 py-5 pb-32 md:pb-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <h1 className="text-xl font-semibold text-zinc-900">Add a memory</h1>

        <MemoryTypePicker value={memoryType} onChange={setMemoryType} />

        <UploadContextBar
          moments={moments}
          selectedMomentId={selectedMomentId}
          onSelectMoment={setSelectedMomentId}
          activePrompt={activePrompt}
          onClearPrompt={clearPrompt}
        />

        {memoryType === "media" && (
          <MediaUploadTab
            token={token}
            items={mediaItems}
            dropError={dropError}
            isDragActive={isDragActive}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            uploading={uploading}
            onRemoveItem={removeMediaItem}
            onRetryItem={retryMediaItem}
            onRetryFailed={retryFailed}
            onAddAnother={resetMediaComposer}
          />
        )}

        {memoryType === "text" && (
          <>
            {textUploadSuccess ? (
              <UploadSuccessPanel
                token={token}
                message="Memory posted"
                addAnotherLabel="Write another"
                onAddAnother={resetTextComposer}
              />
            ) : (
              <>
                {textError && (
                  <UploadErrorBanner
                    message={textError}
                    onRetry={submitTextMemory}
                  />
                )}
                <TextMemoryTab
                  textMemory={textMemory}
                  onChangeTextMemory={setTextMemory}
                />
              </>
            )}
          </>
        )}

        {memoryType === "audio" && (
          <VoiceMemoTab
            token={token}
            audioFileItems={audioFileItems}
            recording={recording}
            recordingSeconds={recordingSeconds}
            micError={micError}
            audioBlob={audioBlob}
            audioCaption={audioCaption}
            onChangeAudioCaption={setAudioCaption}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onDiscardAudio={() => setAudioBlob(null)}
            onDiscardFileItem={removeAudioFileItem}
            onRetryFileItem={retryAudioFileItem}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            uploading={uploading}
            uploadSuccess={audioUploadSuccess}
            uploadError={audioError}
            onAddAnother={resetAudioComposer}
          />
        )}

        <UploadStickyBar
          visible={
            memoryType === "media" &&
            mediaPendingCount > 0 &&
            !mediaBatchFinished
          }
          caption={sharedCaption}
          onChangeCaption={setSharedCaption}
          captionPlaceholder="Add a caption for this post (optional)"
          ctaLabel={`Post ${mediaPendingCount} item${mediaPendingCount === 1 ? "" : "s"}`}
          onSubmit={handleUploadAll}
          submitting={uploading}
        />

        <UploadStickyBar
          visible={memoryType === "text" && !textUploadSuccess}
          showCaption={false}
          ctaLabel="Post memory"
          onSubmit={submitTextMemory}
          submitting={textSubmitting}
          disabled={!textMemory.trim()}
        />

        <UploadStickyBar
          visible={
            memoryType === "audio" &&
            !audioUploadSuccess &&
            hasAudioToPost &&
            !recording
          }
          caption={audioCaption}
          onChangeCaption={setAudioCaption}
          captionPlaceholder="Add a caption (optional)"
          showCaption={false}
          ctaLabel="Post voice message"
          onSubmit={handleUploadAudio}
          submitting={uploading}
        />
      </div>
    </div>
  );
}
