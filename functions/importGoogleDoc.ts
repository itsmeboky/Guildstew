import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  extractDocId,
  buildExportUrl,
  assertSharedHtmlResponse,
  extractDocTitle,
  splitSections,
  guessCategory,
  detectFormatChips,
  rewriteImageSrcs,
} from './googleDocImport.lib.js';

/**
 * World Lore Import — Phase 2A ingestion.
 *
 * Turns a link-shared Google Doc into category-guessed, image-rehosted
 * sections (JSON). Writes ZERO world_lore_entries rows — the Phase 2B
 * wizard sanitizes (via sanitizeLoreHtml) and writes. GM/Co-GM only.
 *
 * Input  : { docLink, campaignId, splitLevel: "h1" | "h2" }
 * Output : see the contract assembled at the bottom.
 *
 * The fetch + service-role upload live here; all split/guess/chip/rewrite
 * logic is in googleDocImport.lib.js so a future OAuth + Docs API path
 * can replace just the fetch step.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { docLink, campaignId } = body;
    const splitLevel = body.splitLevel === 'h2' ? 'h2' : 'h1';

    if (!docLink || !campaignId) {
      return Response.json(
        { error: 'docLink and campaignId are required.' },
        { status: 400 },
      );
    }

    // ── GM / Co-GM gate (mirrors exportCampaignData) ──────────────
    const campaign = await base44.asServiceRole.entities.Campaign
      .filter({ id: campaignId }).then((c: any[]) => c[0]);
    if (!campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.game_master_id !== user.id && !campaign.co_dm_ids?.includes(user.id)) {
      return Response.json(
        { error: 'Only the GM or a Co-GM can import lore into this campaign.' },
        { status: 403 },
      );
    }

    // ── Resolve + fetch the doc (share-link HTML export) ──────────
    const docId = extractDocId(docLink);
    if (!docId) {
      return Response.json(
        { error: "That doesn't look like a Google Docs link. Paste the document's share URL." },
        { status: 400 },
      );
    }

    let res: Response;
    try {
      res = await fetch(buildExportUrl(docId), { redirect: 'manual' });
    } catch (_err) {
      return Response.json(
        { error: 'Could not reach Google Docs. Try again in a moment.' },
        { status: 502 },
      );
    }

    try {
      assertSharedHtmlResponse({
        status: res.status,
        contentType: res.headers.get('content-type') || '',
      });
    } catch (err: any) {
      // Not-shared / redirect / non-HTML → clean, actionable 400.
      return Response.json({ error: err.message }, { status: 400 });
    }

    const html = await res.text();

    // ── Split + per-section guess / chips / image re-host ─────────
    const uploader = makeImageUploader(campaignId);
    const rawSections = splitSections(html, splitLevel);

    const warnings: string[] = [];
    if (!uploader) {
      warnings.push('Image re-hosting is unavailable (storage not configured); original image links were kept.');
    }

    const sections = [];
    for (const sec of rawSections) {
      const { html: rehostedHtml, warnings: imgWarnings } = await rewriteImageSrcs(sec.html, uploader);
      if (imgWarnings.length) warnings.push(...imgWarnings);
      const { guessedCategory, confidence } = guessCategory(sec.title);
      sections.push({
        id: sec.id,
        title: sec.title,
        html: rehostedHtml, // images re-hosted; NOT sanitized — 2B sanitizes at write time
        guessedCategory: sec.isIntro ? null : guessedCategory,
        confidence: sec.isIntro ? 'low' : confidence,
        formatChips: detectFormatChips(rehostedHtml),
        isIntro: !!sec.isIntro, // 2B flags intro sections for naming/skipping
      });
    }

    return Response.json({
      docTitle: extractDocTitle(html),
      splitLevel,
      sections,
      warnings,
    }, { status: 200 });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Import failed.' }, { status: 500 });
  }
});

/**
 * Build an async uploader that fetches an image by URL and re-hosts the
 * bytes into the `user-assets` bucket via the service role, returning the
 * public URL. Returns null when storage env isn't configured so the
 * caller degrades to warnings instead of crashing.
 */
function makeImageUploader(campaignId: string): ((src: string) => Promise<string>) | null {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return null;

  const sb = createClient(url, serviceKey);

  return async (src: string): Promise<string> => {
    const resp = await fetch(src);
    if (!resp.ok) throw new Error(`fetch ${resp.status}`);
    const contentType = resp.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) throw new Error('not an image');
    const bytes = new Uint8Array(await resp.arrayBuffer());

    const ext = extFromContentType(contentType);
    const rand = Math.random().toString(36).slice(2, 10);
    const path = `worldlore/imports/${campaignId}/${Date.now()}_${rand}.${ext}`;

    const { error } = await sb.storage
      .from('user-assets')
      .upload(path, bytes, { contentType, upsert: false });
    if (error) throw error;

    const { data } = sb.storage.from('user-assets').getPublicUrl(path);
    return data.publicUrl;
  };
}

function extFromContentType(ct: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  return map[ct.split(';')[0].trim().toLowerCase()] || 'png';
}
