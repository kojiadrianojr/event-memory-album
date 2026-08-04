"use client";

import { useEffect, useMemo } from "react";
import type { DropzoneInputProps, DropzoneRootProps } from "react-dropzone";
import { MAX_PHOTOS_PER_POST } from "@/lib/upload-limits";
import UploadErrorBanner from "./UploadErrorBanner";
import UploadSuccessPanel from "./UploadSuccessPanel";
import { FileUploadItem } from "./types";

interface MediaUploadTabProps {
  token: string;
  items: FileUploadItem[];
  dropError: string | null;
  isDragActive: boolean;
  getRootProps: (props?: DropzoneRootProps) => DropzoneRootProps;
  getInputProps: (props?: DropzoneInputProps) => DropzoneInputProps;
  uploading: boolean;
  onRemoveItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onRetryFailed: () => void;
  onAddAnother: () => void;
}

function statusDotClass(status: FileUploadItem["status"], hasError: boolean) {
  if (hasError) return "bg-red-500";
  switch (status) {
    case "done":
      return "bg-green-500";
    case "compressing":
    case "uploading":
    case "stored":
      return "bg-amber-400 animate-pulse";
    case "error":
      return "bg-red-500";
    default:
      return "bg-zinc-300";
  }
}

function MediaGridItem({
  item,
  previewUrl,
  uploading,
  onRemove,
  onRetry,
}: {
  item: FileUploadItem;
  previewUrl: string | null;
  uploading: boolean;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const isVideo = item.file.type.startsWith("video/");
  const inProgress =
    item.status === "compressing" ||
    item.status === "uploading" ||
    (item.status === "stored" && uploading);
  const canRemove =
    item.status === "pending" ||
    (item.status === "error" && !uploading);
  const showError = item.status === "error" || Boolean(item.errorMessage);

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
      {previewUrl && !isVideo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={item.file.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-400">
          {isVideo ? (
            <>
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="text-[10px] font-medium">Video</span>
            </>
          ) : (
            <span className="text-[10px] font-medium">File</span>
          )}
        </div>
      )}

      <span
        className={`absolute left-1.5 top-1.5 h-2 w-2 rounded-full ${statusDotClass(item.status, showError)}`}
        aria-hidden
      />

      {inProgress && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-zinc-200">
          <div
            className="h-full bg-zinc-800 transition-all"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}

      {item.status === "compressing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="text-[10px] font-medium text-white">
            {item.progress}%
          </span>
        </div>
      )}

      {canRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${item.file.name}`}
          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white hover:bg-black/70"
        >
          ✕
        </button>
      )}

      {showError && item.status !== "pending" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          disabled={uploading}
          className="absolute inset-0 flex items-end justify-center bg-black/30 pb-2 disabled:opacity-50"
        >
          <span className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-red-600">
            Retry
          </span>
        </button>
      )}
    </div>
  );
}

export default function MediaUploadTab({
  token,
  items,
  dropError,
  isDragActive,
  getRootProps,
  getInputProps,
  uploading,
  onRemoveItem,
  onRetryItem,
  onRetryFailed,
  onAddAnother,
}: MediaUploadTabProps) {
  const pendingCount = items.filter(
    (i) => i.status === "pending" || i.status === "stored"
  ).length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter(
    (i) => i.status === "error" || Boolean(i.errorMessage)
  ).length;
  const batchFinished = !uploading && pendingCount === 0 && items.length > 0;
  const canAddMore = items.length < MAX_PHOTOS_PER_POST;

  const previewUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (item.file.type.startsWith("image/")) {
        map.set(item.id, URL.createObjectURL(item.file));
      }
    }
    return map;
  }, [items]);

  useEffect(() => {
    return () => {
      for (const url of previewUrls.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, [previewUrls]);

  if (batchFinished && errorCount === 0) {
    return (
      <UploadSuccessPanel
        token={token}
        addAnotherLabel="Add more photos"
        onAddAnother={onAddAnother}
      />
    );
  }

  if (batchFinished && errorCount > 0) {
    return (
      <div className="space-y-4">
        <UploadErrorBanner
          message={
            doneCount > 0
              ? `Posted ${doneCount} of ${items.length}. ${errorCount} failed.`
              : "Post failed. Please try again."
          }
          onRetry={onRetryFailed}
        />
        {doneCount > 0 && (
          <UploadSuccessPanel
            token={token}
            message={`${doneCount} item${doneCount === 1 ? "" : "s"} posted`}
            addAnotherLabel="Add more photos"
            onAddAnother={onAddAnother}
          />
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
            isDragActive
              ? "border-zinc-500 bg-zinc-100"
              : "border-zinc-300 bg-white hover:border-zinc-400"
          }`}
        >
          <input {...getInputProps()} />
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path d="M12 16V4m0 0L8 8m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-700">
            {isDragActive ? "Drop files here" : "Add photos or videos"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Drag & drop or tap to browse · up to {MAX_PHOTOS_PER_POST} per post
          </p>
        </div>
        {dropError && (
          <p className="text-sm text-amber-700">{dropError}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {items.length} / {MAX_PHOTOS_PER_POST} selected
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {items.map((item) => (
          <MediaGridItem
            key={item.id}
            item={item}
            previewUrl={previewUrls.get(item.id) ?? null}
            uploading={uploading}
            onRemove={() => onRemoveItem(item.id)}
            onRetry={() => onRetryItem(item.id)}
          />
        ))}

        {canAddMore && (
          <div
            {...getRootProps()}
            className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
              isDragActive
                ? "border-zinc-500 bg-zinc-100"
                : "border-zinc-300 bg-white hover:border-zinc-400"
            }`}
          >
            <input {...getInputProps()} />
            <span className="text-2xl text-zinc-400">+</span>
            <span className="text-[10px] text-zinc-400">Add more</span>
          </div>
        )}
      </div>

      {dropError && (
        <p className="text-sm text-amber-700">{dropError}</p>
      )}
    </div>
  );
}
