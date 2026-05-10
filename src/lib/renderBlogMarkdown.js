/**
 * Minimal Markdown → HTML converter for blog posts + version notes.
 *
 * Scope: legacy admin posts stored Markdown; the reader surface
 * still renders those. New posts are authored in ReactQuill which
 * produces HTML directly — those pass through untouched (see
 * looksLikeHtml below). Adding a real Markdown parser (remark,
 * markdown-it) would bloat the bundle for legacy content, so we
 * keep the small sanitizing converter that covers headings, bold,
 * italic, links, images, inline code, code blocks, ordered/
 * unordered lists, and paragraphs.
 *
 * For Markdown content, HTML is escaped before transformation so
 * user-supplied Markdown can't inject arbitrary tags. The `<a>` /
 * `<img>` helpers only emit attribute-escaped URLs.
 *
 * For HTML content (ReactQuill output), the admin-only authoring
 * gate is the trust boundary; Quill's allow-list controls the tag
 * set. If non-admin authoring lands on this surface later, route
 * it through DOMPurify before this helper.
 */

/**
 * True when the source looks like authored HTML (ReactQuill output).
 * Block-level tag at the very start covers Quill's standard tags
 * (<p>, <h1>..<h6>, <ul>, <ol>, <blockquote>, <pre>, <figure>,
 * <div>). Anything else falls through to the Markdown converter.
 */
export function looksLikeHtml(source) {
  if (!source) return false;
  const trimmed = String(source).trim();
  if (!trimmed) return false;
  return /^<(p|h[1-6]|ul|ol|blockquote|pre|figure|div)\b/i.test(trimmed);
}

export function renderBlogMarkdown(source) {
  if (!source) return "";

  // Authored HTML passes through. Legacy Markdown drops to the
  // converter below.
  if (looksLikeHtml(source)) {
    return String(source);
  }

  const fences = [];
  let text = String(source).replace(/\r\n/g, "\n");

  // 1. Pull fenced code blocks out before anything else — their
  //    contents mustn't be transformed. We stash them by index and
  //    restore at the end.
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, body) => {
    const idx = fences.length;
    fences.push({ lang, body });
    return `\n\x00CODEBLOCK${idx}\x00\n`;
  });

  text = escapeHtml(text);

  // 2. Inline code — back-tick single lines. Runs on already-escaped
  //    text so the braces inside stay literal.
  text = text.replace(/`([^`\n]+)`/g, (_, code) => `<code>${code}</code>`);

  // 3. Images — ![alt](url) — must run before link so alt text
  //    doesn't accidentally match.
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, url) => {
    return `<img src="${attr(url)}" alt="${attr(alt)}" loading="lazy" />`;
  });

  // 4. Links — [text](url).
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    return `<a href="${attr(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  // 5. Bold + italic.
  text = text.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

  // 6. Block-level transforms, line by line.
  const lines = text.split("\n");
  const out = [];
  let listType = null; // 'ul' | 'ol' | null
  let listBuf = [];

  const flushList = () => {
    if (!listType) return;
    out.push(`<${listType}>${listBuf.map((i) => `<li>${i}</li>`).join("")}</${listType}>`);
    listType = null;
    listBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const head = /^(#{1,6})\s+(.*)$/.exec(line);
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);

    if (head) {
      flushList();
      const level = head[1].length;
      out.push(`<h${level}>${head[2]}</h${level}>`);
      continue;
    }
    if (ul) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listBuf.push(ul[1]);
      continue;
    }
    if (ol) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listBuf.push(ol[1]);
      continue;
    }
    if (!line.trim()) {
      flushList();
      continue;
    }
    flushList();
    out.push(`<p>${line}</p>`);
  }
  flushList();

  // 7. Restore fenced code blocks.
  let html = out.join("\n");
  html = html.replace(/\x00CODEBLOCK(\d+)\x00/g, (_, i) => {
    const { lang, body } = fences[Number(i)] || { lang: "", body: "" };
    return `<pre><code class="language-${attr(lang)}">${escapeHtml(body)}</code></pre>`;
  });

  return html;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function attr(s) {
  return escapeHtml(s).replace(/javascript:/gi, "");
}
