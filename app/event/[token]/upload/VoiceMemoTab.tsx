"use client";

import { useEffect, useMemo, useState } from "react";
import type { DropzoneInputProps, DropzoneRootProps } from "react-dropzone";
import AudioPlayer from "@/components/media/AudioPlayer";
import UploadErrorBanner from "./UploadErrorBanner";
import UploadSuccessPanel from "./UploadSuccessPanel";
import { FileUploadItem } from "./types";

interface VoiceMemoTabProps {
  token: string;
  audioFileItems: FileUploadItem[];
  recording: boolean;
  recordingSeconds: number;
  micError: string | null;
  audioBlob: Blob | null;
  audioCaption: string;
  onChangeAudioCaption: (value: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDiscardAudio: () => void;
  onDiscardFileItem: (id: string) => void;
  onRetryFileItem: (id: string) => void;
  getRootProps: (props?: DropzoneRootProps) => DropzoneRootProps;
  getInputProps: (props?: DropzoneInputProps) => DropzoneInputProps;
  uploading: boolean;
  uploadSuccess: boolean;
  uploadError: string | null;
  onAddAnother: () => void;
}

function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceMemoTab({
  token,
  audioFileItems,
  recording,
  recordingSeconds,
  micError,
  audioBlob,
  audioCaption,
  onChangeAudioCaption,
  onStartRecording,
  onStopRecording,
  onDiscardAudio,
  onDiscardFileItem,
  onRetryFileItem,
  getRootProps,
  getInputProps,
  uploading,
  uploadSuccess,
  uploadError,
  onAddAnother,
}: VoiceMemoTabProps) {
  const [fileUploadExpanded, setFileUploadExpanded] = useState(false);
  const hasPreview = Boolean(audioBlob) || audioFileItems.length > 0;

  const audioPreviewUrl = useMemo(
    () => (audioBlob ? URL.createObjectURL(audioBlob) : null),
    [audioBlob]
  );

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, [audioPreviewUrl]);

  if (uploadSuccess) {
    return (
      <UploadSuccessPanel
        token={token}
        message="Voice message posted"
        addAnotherLabel="Record another"
        onAddAnother={onAddAnother}
      />
    );
  }

  return (
    <div className="space-y-4">
      {uploadError && (
        <UploadErrorBanner message={uploadError} />
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        {!hasPreview ? (
          <div className="flex flex-col items-center space-y-4 text-center">
            <button
              type="button"
              onClick={recording ? onStopRecording : onStartRecording}
              disabled={uploading}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white transition-colors disabled:opacity-50 ${
                recording ? "bg-red-600" : "bg-zinc-900 hover:bg-zinc-800"
              }`}
              aria-label={recording ? "Stop recording" : "Start recording"}
            >
              {recording && (
                <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-40" />
              )}
              <svg viewBox="0 0 24 24" className="relative h-8 w-8" fill="currentColor" aria-hidden>
                <rect x="9" y="3" width="6" height="11" rx="3" />
              </svg>
            </button>

            <div>
              <p className="text-sm font-medium text-zinc-800">
                {recording ? "Recording…" : "Tap to record"}
              </p>
              {recording && (
                <p className="mt-1 font-mono text-sm text-red-600">
                  {formatSeconds(recordingSeconds)}
                </p>
              )}
            </div>

            {micError && (
              <p className="text-sm text-red-600">{micError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {audioBlob && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Recording preview
                </p>
                {audioPreviewUrl && (
                  <AudioPlayer src={audioPreviewUrl} className="w-full" />
                )}
                <button
                  type="button"
                  onClick={onDiscardAudio}
                  disabled={uploading}
                  className="text-xs text-zinc-500 underline hover:no-underline disabled:opacity-50"
                >
                  Discard recording
                </button>
              </div>
            )}

            {audioFileItems.map((item) => (
              <div key={item.id} className="space-y-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-zinc-700">
                    {item.file.name}
                  </p>
                  {item.status === "pending" && !uploading && (
                    <button
                      type="button"
                      onClick={() => onDiscardFileItem(item.id)}
                      className="shrink-0 text-xs text-zinc-500 underline hover:no-underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {(item.status === "uploading" || item.status === "compressing") && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                    <div
                      className="h-full rounded-full bg-zinc-800 transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
                {item.status === "error" && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-red-600">{item.errorMessage}</p>
                    <button
                      type="button"
                      onClick={() => onRetryFileItem(item.id)}
                      disabled={uploading}
                      className="text-xs font-medium text-zinc-700 underline disabled:opacity-50"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            ))}

            <input
              type="text"
              value={audioCaption}
              onChange={(e) => onChangeAudioCaption(e.target.value)}
              placeholder="Add a caption (optional)"
              maxLength={500}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
            />
          </div>
        )}
      </div>

      {!hasPreview && (
        <div>
          <button
            type="button"
            onClick={() => setFileUploadExpanded((v) => !v)}
            className="text-sm text-zinc-500 underline hover:no-underline"
          >
            {fileUploadExpanded
              ? "Hide file upload"
              : "Upload an audio file instead"}
          </button>

          {fileUploadExpanded && (
            <div
              {...getRootProps()}
              className="mt-3 cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 bg-white px-6 py-8 text-center hover:border-zinc-400"
            >
              <input {...getInputProps()} />
              <p className="text-sm text-zinc-500">
                Drop an audio file or tap to browse
              </p>
              <p className="mt-1 text-xs text-zinc-400">MP3, M4A, WebM</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
