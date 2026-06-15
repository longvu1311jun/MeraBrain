export function chunkText(text: string, maxChars = 1800, overlap = 200): string[] {
  const clean = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + maxChars, clean.length);
    let slice = clean.slice(i, end);
    const lastBreak = slice.lastIndexOf("\n\n");
    if (lastBreak > maxChars * 0.55 && end < clean.length) slice = slice.slice(0, lastBreak);
    chunks.push(slice.trim());
    i += Math.max(slice.length - overlap, 1);
  }
  return chunks.filter(Boolean);
}
