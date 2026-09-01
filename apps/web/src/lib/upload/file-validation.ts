export type UploadFileType = "pdf" | "docx" | "jpg" | "png";

export const MAX_UPLOAD_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_UPLOAD_FILE_SIZE_MB = 50;

const FILE_TYPES: Record<
  UploadFileType,
  { extensions: string[]; mimeTypes: string[] }
> = {
  pdf: {
    extensions: ["pdf"],
    mimeTypes: ["application/pdf"],
  },
  docx: {
    extensions: ["docx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  jpg: {
    extensions: ["jpg", "jpeg"],
    mimeTypes: ["image/jpeg", "image/jpg"],
  },
  png: {
    extensions: ["png"],
    mimeTypes: ["image/png"],
  },
};

function getExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

export function getUploadFileType(
  fileName: string,
  mimeType: string
): UploadFileType | null {
  const extension = getExtension(fileName);
  const normalizedMimeType = mimeType.toLowerCase().trim();

  for (const [fileType, definition] of Object.entries(FILE_TYPES) as Array<
    [UploadFileType, (typeof FILE_TYPES)[UploadFileType]]
  >) {
    if (!definition.extensions.includes(extension)) continue;

    // Some browsers omit the MIME type for files selected from cloud drives.
    if (
      !normalizedMimeType ||
      normalizedMimeType === "application/octet-stream" ||
      definition.mimeTypes.includes(normalizedMimeType)
    ) {
      return fileType;
    }
  }

  return null;
}

export function getUploadMimeType(fileType: UploadFileType): string {
  return FILE_TYPES[fileType].mimeTypes[0];
}

export function validateUploadFileMetadata(input: {
  fileName: string;
  fileSize: number;
  mimeType: string;
}): string | null {
  if (!input.fileName.trim()) return "File name is required";

  if (!Number.isFinite(input.fileSize) || input.fileSize <= 0) {
    return "The selected file is empty";
  }

  if (input.fileSize > MAX_UPLOAD_FILE_SIZE) {
    return `File too large. Maximum size is ${MAX_UPLOAD_FILE_SIZE_MB}MB`;
  }

  if (!getUploadFileType(input.fileName, input.mimeType)) {
    return "Invalid file type. Upload a PDF, DOCX, JPG, or PNG file";
  }

  return null;
}

export function sanitizeUploadFileName(fileName: string): string {
  const basename = fileName.split(/[\\/]/).pop() || "contract";
  const extension = getExtension(basename);
  const extensionSuffix = extension ? `.${extension}` : "";
  const stem = extensionSuffix
    ? basename.slice(0, -extensionSuffix.length)
    : basename;
  const safeStem = stem
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 100) || "contract";

  return `${safeStem}${extensionSuffix}`;
}

export function isOwnedUploadPath(filePath: string, userId: string): boolean {
  return filePath.startsWith(`${userId}/`) && !filePath.split("/").includes("..");
}
