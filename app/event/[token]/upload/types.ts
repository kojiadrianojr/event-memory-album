export interface FileUploadItem {
  id: string;
  file: File;
  status: "pending" | "compressing" | "uploading" | "stored" | "done" | "error";
  progress: number;
  errorMessage?: string;
  objectKey?: string;
  thumbnailObjectKey?: string;
  /** Set after compression; defaults to `file` when uploading. */
  uploadFile?: File;
  uploadMimeType?: string;
  /** True when the stored file is a compressed H.264 MP4. */
  compressed?: boolean;
  /** Shown when compression was skipped and the original file was uploaded. */
  compressionNote?: string;
}
