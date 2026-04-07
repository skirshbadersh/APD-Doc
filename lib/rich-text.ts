/**
 * Convert markdown-style bold (**word**) to HTML <b> tags for display.
 * Preserves paragraph breaks as <br><br>.
 */
export function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

/**
 * Convert HTML back to markdown-style bold for storage.
 * Reverses <b>/<strong> to **word** and <br> to newlines.
 */
export function htmlToMarkdown(html: string): string {
  return html
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<[^>]+>/g, "") // strip any remaining tags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Convert markdown-style bold to an array of { text, bold } segments
 * for use with the docx library's TextRun objects.
 */
export function markdownToDocxRuns(text: string): Array<{ text: string; bold: boolean }> {
  const runs: Array<{ text: string; bold: boolean }> = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    runs.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex), bold: false });
  }

  if (runs.length === 0 && text.length > 0) {
    runs.push({ text, bold: false });
  }

  return runs;
}

/**
 * Copy text to clipboard as both rich text (HTML) and plain text.
 * Bold **markers** become actual <b> in the HTML version.
 */
export async function copyRichText(markdown: string): Promise<void> {
  const html = markdownToHtml(markdown);
  // Plain text version strips the ** markers
  const plain = markdown.replace(/\*\*(.+?)\*\*/g, "$1");

  try {
    const htmlBlob = new Blob([html], { type: "text/html" });
    const textBlob = new Blob([plain], { type: "text/plain" });
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      }),
    ]);
  } catch {
    // Fallback for browsers that don't support ClipboardItem
    await navigator.clipboard.writeText(plain);
  }
}
