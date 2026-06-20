/**
 * World Lore Import — Phase 2A core logic (pure, dependency-free).
 *
 * This module is deliberately framework-free and import-free so the
 * same code runs in two places:
 *   - the Deno edge function `functions/importGoogleDoc.ts` (relative
 *     import — no bare specifier to resolve in the Base44/Supabase
 *     Deno runtime), and
 *   - `node --test` unit tests under src/.
 *
 * It does NOT fetch, NOT touch Supabase, and NOT sanitize. The edge
 * function wires fetch + service-role upload around these helpers; the
 * Phase 2B wizard sanitizes the returned HTML via `sanitizeLoreHtml`
 * at write time. Keeping fetch/parse/upload outside this module is what
 * lets a future OAuth + Google Docs API path swap in without touching
 * split/guess/chip logic.
 *
 * Parsing note: Google Docs' HTML export is well-formed and predictable,
 * so heading-splitting and <img> rewriting are done with targeted string
 * scanning rather than a DOM dependency. That keeps this one module
 * usable verbatim in both runtimes.
 */

// The five entry-backed import targets. These ids are the Phase 2A
// contract (2B maps them onto the live category keys). Order doubles as
// tie-break priority for ambiguous headings.
export const IMPORT_CATEGORY_IDS = ["regions", "politics", "religion", "history", "artifacts"];

// Deterministic keyword → category map on heading text. Lowercased,
// matched as whole words so "warden" doesn't trip "war".
const CATEGORY_KEYWORDS = {
  politics:  ["faction", "factions", "guild", "guilds", "order", "house", "houses",
              "court", "courts", "council", "throne", "politics", "political",
              "alliance", "kingdom", "empire", "senate", "noble", "nobles", "clan"],
  history:   ["year", "years", "era", "eras", "war", "wars", "battle", "battles",
              "founding", "fall", "age", "ages", "chronicle", "chronicles",
              "history", "timeline", "dynasty", "reign", "conquest"],
  regions:   ["city", "cities", "region", "regions", "realm", "realms", "land", "lands",
              "map", "maps", "port", "forest", "mountain", "mountains", "isle", "isles",
              "island", "village", "town", "kingdom", "geography", "river", "desert"],
  religion:  ["god", "gods", "goddess", "temple", "temples", "faith", "saint", "saints",
              "sect", "sects", "prayer", "prayers", "divine", "religion", "religious",
              "deity", "deities", "pantheon", "cult", "church", "holy", "scripture"],
  artifacts: ["relic", "relics", "artifact", "artifacts", "blade", "sword", "swords",
              "crown", "crowns", "amulet", "tome", "tomes", "ring", "rings",
              "weapon", "weapons", "treasure", "wand", "staff", "grimoire"],
};

/**
 * Pull the Google Doc id out of a pasted share link (or a bare id).
 * Handles /document/d/{id}/…, /document/u/0/d/{id}/…, export URLs, and
 * a raw id. Returns null when nothing id-shaped is found.
 */
export function extractDocId(input) {
  if (!input || typeof input !== "string") return null;
  const s = input.trim();

  // /document/d/{id} or /document/u/N/d/{id}
  const pathMatch = s.match(/\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/);
  if (pathMatch) return pathMatch[1];

  // ?id={id} (legacy)
  const queryMatch = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];

  // Bare id: a long token with no slashes/spaces.
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;

  return null;
}

/** Build the HTML-export URL for a doc id. */
export function buildExportUrl(docId) {
  return `https://docs.google.com/document/d/${docId}/export?format=html`;
}

/**
 * Validate a fetch result for the export URL. Throws a clean,
 * GM-actionable error when the doc isn't link-shared (Google redirects
 * to sign-in) or the response isn't HTML. Pure so the not-shared path
 * is unit-testable without the network.
 */
export function assertSharedHtmlResponse({ status, contentType }) {
  const NOT_SHARED =
    "Couldn't read this doc — set sharing to 'Anyone with the link can view' and try again.";

  // redirect:'manual' surfaces Google's sign-in bounce as a 3xx.
  if (status >= 300 && status < 400) throw new Error(NOT_SHARED);
  if (status === 401 || status === 403) throw new Error(NOT_SHARED);
  if (status === 404) {
    throw new Error("Couldn't find that document — double-check the link.");
  }
  if (status < 200 || status >= 300) {
    throw new Error(`Couldn't read this doc (HTTP ${status}). Check the link and sharing settings.`);
  }
  const ct = (contentType || "").toLowerCase();
  if (!ct.includes("text/html")) {
    // A signed-in HTML page would still be text/html; a non-HTML body
    // here means the export didn't return the doc.
    throw new Error(NOT_SHARED);
  }
}

/** Strip HTML tags and collapse whitespace to plain text. */
export function stripTags(html) {
  if (!html) return "";
  return decodeBasicEntities(String(html).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeBasicEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function slug(text) {
  return stripTags(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

/** Extract the document title from the export's <title> tag. */
export function extractDocTitle(html) {
  const m = String(html || "").match(/<title>([\s\S]*?)<\/title>/i);
  if (!m) return "Untitled document";
  const t = stripTags(m[1]).replace(/\s*-\s*Google Docs\s*$/i, "").trim();
  return t || "Untitled document";
}

/** Return the chips a section's HTML should display in 2B. */
export function detectFormatChips(html) {
  const s = String(html || "");
  const chips = [];
  if (/<h[1-6]\b/i.test(s)) chips.push("Heading");
  if (/<table\b/i.test(s)) chips.push("Table");
  if (/<img\b/i.test(s)) chips.push("Image");
  if (/<(ul|ol|li)\b/i.test(s)) chips.push("List");
  return chips;
}

/**
 * Deterministic category guess from heading text.
 * - exactly one category matches  → that category, confidence "high"
 * - two or more match (ambiguous) → best guess (most hits, then
 *   IMPORT_CATEGORY_IDS order), confidence "low"
 * - nothing matches               → guessedCategory null, confidence "low"
 */
export function guessCategory(title) {
  const text = ` ${stripTags(title).toLowerCase()} `;
  const hits = {};
  for (const cat of IMPORT_CATEGORY_IDS) {
    let count = 0;
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      // whole-word match
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (re.test(text)) count++;
    }
    if (count > 0) hits[cat] = count;
  }

  const matched = Object.keys(hits);
  if (matched.length === 1) {
    return { guessedCategory: matched[0], confidence: "high" };
  }
  if (matched.length >= 2) {
    // most hits wins; ties broken by canonical order
    const best = matched.sort((a, b) => {
      if (hits[b] !== hits[a]) return hits[b] - hits[a];
      return IMPORT_CATEGORY_IDS.indexOf(a) - IMPORT_CATEGORY_IDS.indexOf(b);
    })[0];
    return { guessedCategory: best, confidence: "low" };
  }
  return { guessedCategory: null, confidence: "low" };
}

/**
 * Split export HTML into sections at the chosen heading level.
 * Each section = { id, title, html } where html is everything between
 * this heading and the next heading at the same level (the heading tag
 * itself is excluded — its text is the title). Content before the first
 * heading at that level becomes an intro section flagged isIntro.
 *
 * @param {string} html
 * @param {"h1"|"h2"} level
 */
export function splitSections(html, level) {
  const tag = level === "h2" ? "h2" : "h1";
  const src = String(html || "");

  // Restrict to <body> when present so the <head>/<style> block Google
  // emits doesn't leak into the intro section.
  const bodyMatch = src.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : src;

  const headingRe = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const heads = [];
  let m;
  while ((m = headingRe.exec(body)) !== null) {
    heads.push({ start: m.index, end: m.index + m[0].length, title: stripTags(m[1]) });
  }

  const sections = [];

  // Intro: content before the first heading at this level.
  const introEnd = heads.length ? heads[0].start : body.length;
  const introHtml = body.slice(0, introEnd).trim();
  if (hasMeaningfulContent(introHtml)) {
    sections.push({
      id: "section-0-intro",
      title: "Intro / untitled",
      html: introHtml,
      isIntro: true,
    });
  }

  for (let i = 0; i < heads.length; i++) {
    const bodyStart = heads[i].end;
    const bodyEnd = i + 1 < heads.length ? heads[i + 1].start : body.length;
    const sectionHtml = body.slice(bodyStart, bodyEnd).trim();
    const title = heads[i].title || "Untitled section";
    sections.push({
      id: `section-${i + 1}-${slug(title) || "untitled"}`,
      title,
      html: sectionHtml,
      isIntro: false,
    });
  }

  return sections;
}

function hasMeaningfulContent(html) {
  if (!html) return false;
  if (/<(img|table)\b/i.test(html)) return true;
  return stripTags(html).length > 0;
}

/**
 * Rewrite every <img src> in `html` using an async `uploader(srcUrl)`
 * that returns the re-hosted URL. Failures (or a missing uploader)
 * leave the original src in place and add a message to `warnings` —
 * sections are never dropped.
 *
 * @param {string} html
 * @param {(src:string)=>Promise<string>} uploader
 * @returns {Promise<{ html: string, warnings: string[] }>}
 */
export async function rewriteImageSrcs(html, uploader) {
  const warnings = [];
  const src = String(html || "");
  if (!src || !/<img\b/i.test(src)) return { html: src, warnings };

  // Collect unique srcs first so each is re-hosted once.
  const srcRe = /<img\b[^>]*?\ssrc\s*=\s*("([^"]*)"|'([^']*)')/gi;
  const found = [];
  let m;
  while ((m = srcRe.exec(src)) !== null) {
    const url = m[2] !== undefined ? m[2] : m[3];
    if (url) found.push(url);
  }
  const unique = [...new Set(found)];

  const map = new Map();
  for (const url of unique) {
    if (!uploader) {
      warnings.push(`Image not re-hosted (image storage unavailable): ${url}`);
      continue;
    }
    try {
      const newUrl = await uploader(url);
      if (newUrl) map.set(url, newUrl);
      else warnings.push(`Image re-host returned no URL, kept original: ${url}`);
    } catch (err) {
      warnings.push(`Image failed to re-host, kept original: ${url}${err?.message ? ` (${err.message})` : ""}`);
    }
  }

  let out = src;
  for (const [oldUrl, newUrl] of map.entries()) {
    out = out.split(oldUrl).join(newUrl);
  }
  return { html: out, warnings };
}
