// Small helper to turn a canvas (or already-rendered PNG data URL) into a
// downloaded file without leaking object URLs.

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadDataUrlPng(dataUrl: string | null, filename: string): boolean {
  if (!dataUrl || dataUrl === "data:,") return false;
  triggerDownload(dataUrl, filename);
  return true;
}

export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): boolean {
  if (canvas.width === 0 || canvas.height === 0) return false;
  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch {
    return false;
  }
  return downloadDataUrlPng(dataUrl, filename);
}
