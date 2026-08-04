import exifr from "exifr";

export async function extractTakenAt(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return undefined;
  try {
    const date = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
    const raw = date?.DateTimeOriginal ?? date?.CreateDate;
    if (!raw) return undefined;
    const parsed = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
  } catch {
    return undefined;
  }
}
