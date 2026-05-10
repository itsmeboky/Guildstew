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
