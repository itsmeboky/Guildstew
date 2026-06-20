// World Lore Import — Phase 2A core-logic tests.
//
// Covers the pure ingestion logic that the `importGoogleDoc` edge
// function depends on (doc-id extraction, section splitting at h1/h2,
// deterministic category guessing incl. ambiguous/low-confidence, the
// not-shared fetch error path, image-src rewriting with a mocked
// uploader, and format chips). No network, no Deno, no browser.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  extractDocId,
  buildExportUrl,
  assertSharedHtmlResponse,
  extractDocTitle,
  splitSections,
  guessCategory,
  detectFormatChips,
  rewriteImageSrcs,
  IMPORT_CATEGORY_IDS,
} from "../../../functions/googleDocImport.lib.js";

// ── doc-id extraction ───────────────────────────────────────────────
test("extractDocId pulls the id from assorted link shapes", () => {
  const id = "1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvWx";
  assert.equal(extractDocId(`https://docs.google.com/document/d/${id}/edit`), id);
  assert.equal(extractDocId(`https://docs.google.com/document/d/${id}/edit?usp=sharing`), id);
  assert.equal(extractDocId(`https://docs.google.com/document/d/${id}/export?format=html`), id);
  assert.equal(extractDocId(`https://docs.google.com/document/u/0/d/${id}/edit`), id);
  assert.equal(extractDocId(`https://docs.google.com/open?id=${id}`), id);
  assert.equal(extractDocId(id), id, "bare id accepted");
});

test("extractDocId returns null for non-doc input", () => {
  assert.equal(extractDocId("https://example.com/not-a-doc"), null);
  assert.equal(extractDocId("hello world"), null);
  assert.equal(extractDocId(""), null);
  assert.equal(extractDocId(null), null);
});

test("buildExportUrl targets the HTML export endpoint", () => {
  assert.equal(
    buildExportUrl("ABC123"),
    "https://docs.google.com/document/d/ABC123/export?format=html",
  );
});

// ── not-shared / error path ─────────────────────────────────────────
test("assertSharedHtmlResponse flags the not-shared redirect with an actionable error", () => {
  assert.throws(
    () => assertSharedHtmlResponse({ status: 302, contentType: "text/html" }),
    /Anyone with the link can view/,
  );
  assert.throws(
    () => assertSharedHtmlResponse({ status: 403, contentType: "text/html" }),
    /Anyone with the link can view/,
  );
});

test("assertSharedHtmlResponse rejects non-HTML and 404, accepts 200 html", () => {
  assert.throws(() => assertSharedHtmlResponse({ status: 200, contentType: "application/json" }),
    /Anyone with the link can view/);
  assert.throws(() => assertSharedHtmlResponse({ status: 404, contentType: "text/html" }),
    /double-check the link/);
  assert.doesNotThrow(() =>
    assertSharedHtmlResponse({ status: 200, contentType: "text/html; charset=UTF-8" }));
});

// ── doc title ───────────────────────────────────────────────────────
test("extractDocTitle strips the ' - Google Docs' suffix", () => {
  assert.equal(
    extractDocTitle("<html><head><title>Realm of Eldoria - Google Docs</title></head></html>"),
    "Realm of Eldoria",
  );
  assert.equal(extractDocTitle("<html><head></head></html>"), "Untitled document");
});

// ── section splitting ───────────────────────────────────────────────
const FIXTURE = `<html><head><title>World - Google Docs</title></head><body>
<p>Welcome to the world.</p>
<h1>The Iron Court</h1>
<p>The court rules the north.</p>
<h2>House Vega</h2>
<p>A minor house.</p>
<h1>The Long War</h1>
<p>It lasted a century.</p>
</body></html>`;

test("splitSections at h1 yields intro + two top-level sections", () => {
  const secs = splitSections(FIXTURE, "h1");
  assert.equal(secs.length, 3);
  assert.equal(secs[0].isIntro, true);
  assert.match(secs[0].html, /Welcome to the world/);
  assert.equal(secs[1].title, "The Iron Court");
  // h1 split keeps the nested h2 + its text inside the section body
  assert.match(secs[1].html, /House Vega/);
  assert.match(secs[1].html, /A minor house/);
  assert.equal(secs[2].title, "The Long War");
  assert.match(secs[2].html, /lasted a century/);
  // the heading tag itself is not duplicated into the body
  assert.doesNotMatch(secs[1].html, /<h1/i);
});

test("splitSections at h2 breaks on the nested heading", () => {
  const secs = splitSections(FIXTURE, "h2");
  const titles = secs.map((s) => s.title);
  assert.ok(titles.includes("House Vega"), "h2 split surfaces House Vega as its own section");
  const vega = secs.find((s) => s.title === "House Vega");
  assert.match(vega.html, /A minor house/);
});

test("splitSections gives stable ids", () => {
  const a = splitSections(FIXTURE, "h1").map((s) => s.id);
  const b = splitSections(FIXTURE, "h1").map((s) => s.id);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length, "ids are unique within a doc");
});

test("splitSections with no intro content omits the intro section", () => {
  const secs = splitSections("<body><h1>Only Heading</h1><p>body</p></body>", "h1");
  assert.equal(secs.length, 1);
  assert.equal(secs[0].title, "Only Heading");
});

// ── category guessing ───────────────────────────────────────────────
test("guessCategory high-confidence single-category matches", () => {
  assert.deepEqual(guessCategory("The Thieves Guild"), { guessedCategory: "politics", confidence: "high" });
  assert.deepEqual(guessCategory("The Hundred Year War"), { guessedCategory: "history", confidence: "high" });
  assert.deepEqual(guessCategory("The City of Brass"), { guessedCategory: "regions", confidence: "high" });
  assert.deepEqual(guessCategory("Temple of the Sun God"), { guessedCategory: "religion", confidence: "high" });
  assert.deepEqual(guessCategory("The Sunblade Relic"), { guessedCategory: "artifacts", confidence: "high" });
});

test("guessCategory marks no-match as null + low", () => {
  assert.deepEqual(guessCategory("Miscellaneous Notes"), { guessedCategory: null, confidence: "low" });
});

test("guessCategory marks ambiguous (2+ categories) as low with a best guess", () => {
  // "Temple" (religion) + "City" (regions) → ambiguous
  const r = guessCategory("The Temple City");
  assert.equal(r.confidence, "low");
  assert.ok(["religion", "regions"].includes(r.guessedCategory), "still offers a best guess");
});

test("guessCategory whole-word matching avoids substring false positives", () => {
  // "warden" must not trip the history keyword "war"
  assert.deepEqual(guessCategory("The Warden's Duty"), { guessedCategory: null, confidence: "low" });
});

test("IMPORT_CATEGORY_IDS is the locked 5-id contract", () => {
  assert.deepEqual(IMPORT_CATEGORY_IDS, ["regions", "politics", "religion", "history", "artifacts"]);
});

// ── format chips ────────────────────────────────────────────────────
test("detectFormatChips reports present block types", () => {
  assert.deepEqual(
    detectFormatChips("<h2>x</h2><p>t</p><table><tr><td>c</td></tr></table><ul><li>a</li></ul><img src='x'>"),
    ["Heading", "Table", "Image", "List"],
  );
  assert.deepEqual(detectFormatChips("<p>just text</p>"), []);
});

// ── image rewriting ─────────────────────────────────────────────────
test("rewriteImageSrcs re-hosts each unique src via the uploader", async () => {
  const html = `<p><img src="https://orig/a.png"></p><img src='https://orig/b.jpg'><img src="https://orig/a.png">`;
  const calls = [];
  const uploader = async (src) => { calls.push(src); return `https://cdn/${src.split("/").pop()}`; };
  const { html: out, warnings } = await rewriteImageSrcs(html, uploader);

  assert.equal(calls.length, 2, "duplicate src uploaded once");
  assert.match(out, /https:\/\/cdn\/a\.png/);
  assert.match(out, /https:\/\/cdn\/b\.jpg/);
  assert.doesNotMatch(out, /orig/);
  assert.equal(warnings.length, 0);
});

test("rewriteImageSrcs keeps original src and warns on upload failure", async () => {
  const html = `<img src="https://orig/broken.png">`;
  const uploader = async () => { throw new Error("boom"); };
  const { html: out, warnings } = await rewriteImageSrcs(html, uploader);

  assert.match(out, /orig\/broken\.png/, "original src preserved");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /failed to re-host/);
  assert.match(warnings[0], /boom/);
});

test("rewriteImageSrcs warns (not crashes) when no uploader is available", async () => {
  const html = `<img src="https://orig/x.png">`;
  const { html: out, warnings } = await rewriteImageSrcs(html, null);
  assert.match(out, /orig\/x\.png/);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /storage unavailable/);
});

test("rewriteImageSrcs is a no-op for image-free html", async () => {
  const { html: out, warnings } = await rewriteImageSrcs("<p>no images</p>", async () => "x");
  assert.equal(out, "<p>no images</p>");
  assert.equal(warnings.length, 0);
});
