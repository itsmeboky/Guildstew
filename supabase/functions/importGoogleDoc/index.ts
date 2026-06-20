// Supabase Edge Function — importGoogleDoc (World Lore import, Phase 2A)
//
// Turns a link-shared Google Doc into category-guessed, image-rehosted
// sections (JSON) for the import wizard. Writes ZERO world_lore_entries
// rows — the wizard sanitizes (sanitizeLoreHtml) and writes. GM/Co-GM only.
//
// This is the deployable Supabase port of the original Base44-format
// function. Parsing logic is shared with the client + Node tests via
// src/utils/googleDocImport.js (dependency-free, bundled by deploy).
//
// Deploy:  supabase functions deploy importGoogleDoc
// Auto-injected secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
//
// Input  (POST JSON): { docLink, campaignId, splitLevel: "h1" | "h2" }
// Output (JSON): { docTitle, splitLevel, sections:[...], warnings:[...] }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  extractDocId,
  buildExportUrl,
  assertSharedHtmlResponse,
  extractDocTitle,
  splitSections,
  resolveSectionCategory,
  detectFormatChips,
  rewriteImageSrcs,
} from "../../../src/utils/googleDocImport.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method-not-allowed" });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  // ── Auth: verify the caller's JWT ─────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json(401, { error: "Unauthorized" });
  const userId = userRes.user.id;

  // ── Input ─────────────────────────────────────────────────────────
  let payload: { docLink?: string; campaignId?: string; splitLevel?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid request body." });
  }
  const docLink = String(payload.docLink ?? "");
  const campaignId = String(payload.campaignId ?? "");
  const splitLevel = payload.splitLevel === "h2" ? "h2" : "h1";
  if (!docLink || !campaignId) {
    return json(400, { error: "docLink and campaignId are required." });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ── GM / Co-GM gate ───────────────────────────────────────────────
  const { data: campaign, error: campErr } = await admin
    .from("campaigns")
    .select("game_master_id, co_dm_ids")
    .eq("id", campaignId)
    .single();
  if (campErr || !campaign) return json(404, { error: "Campaign not found" });
  const coDms: string[] = Array.isArray(campaign.co_dm_ids) ? campaign.co_dm_ids : [];
  if (campaign.game_master_id !== userId && !coDms.includes(userId)) {
    return json(403, { error: "Only the GM or a Co-GM can import lore into this campaign." });
  }

  // ── Resolve + fetch the doc (share-link HTML export) ──────────────
  const docId = extractDocId(docLink);
  if (!docId) {
    return json(400, { error: "That doesn't look like a Google Docs link. Paste the document's share URL." });
  }

  let res: Response;
  try {
    res = await fetch(buildExportUrl(docId), { redirect: "manual" });
  } catch {
    return json(502, { error: "Could not reach Google Docs. Try again in a moment." });
  }
  try {
    assertSharedHtmlResponse({ status: res.status, contentType: res.headers.get("content-type") || "" });
  } catch (err) {
    return json(400, { error: (err as Error).message });
  }
  const html = await res.text();

  // ── Split + per-section guess / chips / image re-host ─────────────
  const uploader = makeImageUploader(admin, campaignId);
  const rawSections = splitSections(html, splitLevel);
  const warnings: string[] = [];

  const sections = [];
  for (const sec of rawSections) {
    const { html: rehostedHtml, warnings: imgWarnings } = await rewriteImageSrcs(sec.html, uploader);
    if (imgWarnings.length) warnings.push(...imgWarnings);
    const { guessedCategory, confidence } = resolveSectionCategory(sec, splitLevel);
    sections.push({
      id: sec.id,
      title: sec.title,
      html: rehostedHtml, // images re-hosted; NOT sanitized — wizard sanitizes at write time
      guessedCategory: sec.isIntro ? null : guessedCategory,
      confidence: sec.isIntro ? "low" : confidence,
      formatChips: detectFormatChips(rehostedHtml),
      isIntro: !!sec.isIntro,
    });
  }

  return json(200, {
    docTitle: extractDocTitle(html),
    splitLevel,
    sections,
    warnings,
  });
});

/**
 * Async uploader that fetches an image by URL and re-hosts the bytes
 * into `user-assets` via the service-role client, returning the public
 * URL. Throws on failure so rewriteImageSrcs records a warning and keeps
 * the original src.
 */
function makeImageUploader(admin: ReturnType<typeof createClient>, campaignId: string) {
  return async (src: string): Promise<string> => {
    const resp = await fetch(src);
    if (!resp.ok) throw new Error(`fetch ${resp.status}`);
    const contentType = resp.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) throw new Error("not an image");
    const bytes = new Uint8Array(await resp.arrayBuffer());

    const ext = extFromContentType(contentType);
    const rand = Math.random().toString(36).slice(2, 10);
    const path = `worldlore/imports/${campaignId}/${Date.now()}_${rand}.${ext}`;

    const { error } = await admin.storage
      .from("user-assets")
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw error;

    const { data } = admin.storage.from("user-assets").getPublicUrl(path);
    return data.publicUrl;
  };
}

function extFromContentType(ct: string): string {
  const map: Record<string, string> = {
    "image/png": "png", "image/jpeg": "jpg", "image/jpg": "jpg",
    "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg",
  };
  return map[ct.split(";")[0].trim().toLowerCase()] || "png";
}
