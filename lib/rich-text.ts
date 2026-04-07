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
