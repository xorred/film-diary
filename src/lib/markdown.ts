// Just enough Markdown for personal notes: paragraphs, quotes, *italic*, **bold**, line breaks.
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const inline = (s: string) =>
  escape(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");

export function renderNote(md: string) {
  return md
    .replace(/\r\n/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      if (/^\s*>/.test(block)) return `<blockquote>${inline(block.replace(/^\s*>\s?/gm, ""))}</blockquote>`;
      return `<p>${inline(block)}</p>`;
    })
    .join("\n");
}
