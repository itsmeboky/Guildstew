import DOMPurify from "dompurify";

/**
 * Sanitize forum content HTML on save and on render.
 *
 * Forums are user-generated content with a much higher attack
 * surface than admin-authored blog posts, so DOMPurify runs even
 * on Quill output (which is mostly safe-by-construction). Same
 * helper is used at write time (sanitize before INSERT) and at
 * read time (sanitize before dangerouslySetInnerHTML) — defense in
 * depth for content authored before this commit shipped.
 *
 * Allow-list mirrors the Quill toolbar: paragraphs, inline marks,
 * H2-H4, lists, blockquote, code blocks, links, images. Strips
 * scripts, iframes, embeds, style tags, and inline event handlers.
 */
const FORUM_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "s", "u",
    "h2", "h3", "h4",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a", "img",
    "span", "div",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class"],
  FORBID_TAGS: ["script", "iframe", "object", "embed", "style", "form", "input"],
  FORBID_ATTR: [
    "onerror", "onload", "onclick", "onmouseover", "onfocus",
    "onblur", "onchange", "onsubmit", "onkeydown", "onkeypress",
  ],
};

export function sanitizeForumHtml(html) {
  if (!html) return "";
  return DOMPurify.sanitize(String(html), FORUM_SANITIZE_CONFIG);
}

/**
 * Sanitize World Lore rich-text content on save and on render.
 *
 * Lore uses the same DOMPurify wrapper as forums (one sanitizer, not
 * two) but needs a wider allow-list because the lore TipTap editor can
 * emit things the forum Quill toolbar can't: H1, tables, highlight
 * (`<mark>`), horizontal rules, and inline `style` for the full-wheel
 * text color + highlight background. DOMPurify still runs its built-in
 * CSS filter on `style`, so only safe declarations survive.
 *
 * Used at write time (sanitize TipTap's getHTML() before INSERT) and at
 * read time (sanitize legacy content before dangerouslySetInnerHTML).
 */
const LORE_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "hr", "strong", "em", "s", "u", "mark",
    "h1", "h2", "h3", "h4",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col",
    "span", "div",
  ],
  ALLOWED_ATTR: [
    "href", "target", "rel", "src", "alt", "title", "class",
    "style", "colspan", "rowspan", "colwidth", "data-colwidth",
    "data-color", "data-background-color", "align", "width",
  ],
  FORBID_TAGS: ["script", "iframe", "object", "embed", "style", "form", "input"],
  FORBID_ATTR: [
    "onerror", "onload", "onclick", "onmouseover", "onfocus",
    "onblur", "onchange", "onsubmit", "onkeydown", "onkeypress",
  ],
};

export function sanitizeLoreHtml(html) {
  if (!html) return "";
  return DOMPurify.sanitize(String(html), LORE_SANITIZE_CONFIG);
}
