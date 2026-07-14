export const MAX_CLIENT_UPLOAD_SIZE = 25 * 1024 * 1024;

export const CLIENT_ALLOWED_SUFFIXES = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".log",
  ".yaml",
  ".yml",
  ".xml",
  ".json",
  ".csv",
  ".tsv",
  ".html",
  ".htm",
  ".rtf",
  ".pdf",
  ".docx",
  ".xlsx",
  ".xlsm",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
]);

export function formatBytes(size) {
  const value = Number(size || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function fileSuffix(filename) {
  const name = String(filename || "");
  const dotIndex = name.lastIndexOf(".");
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : "";
}

export function validateClientUploadFile(file) {
  if (!file?.name) throw new Error("\u8bf7\u9009\u62e9\u6587\u4ef6");
  const suffix = fileSuffix(file.name);
  if (!CLIENT_ALLOWED_SUFFIXES.has(suffix)) {
    throw new Error(`\u6682\u4e0d\u652f\u6301 ${suffix || "\u65e0\u6269\u5c55\u540d"} \u6587\u4ef6`);
  }
  if (file.size > MAX_CLIENT_UPLOAD_SIZE) {
    throw new Error(`\u6587\u4ef6\u4e0d\u80fd\u8d85\u8fc7 ${formatBytes(MAX_CLIENT_UPLOAD_SIZE)}`);
  }
}