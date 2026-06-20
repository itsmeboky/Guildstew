// Supabase Edge Function — alpha-admin
// Mutating actions for the alpha queue. Reads happen in the panel via RLS;
// only side-effecting actions live here because they need ADMIN_KEY + SendGrid,
// which must never reach the browser.
//
// Auth: caller must be an admin — verify JWT, then is_admin() RPC. No admin -> 403.
// Actions (POST JSON { action, email, first_name? }):
//   approve -> Netlify alpha-approve (mints + emails key), set status='approved', join_code, reviewed_*
//   resend  -> same Netlify call (deterministic key, re-emails); status unchanged
//   revoke  -> set status='revoked'
//   reject  -> set status='rejected'
//
// Edge Function secrets (Boky sets):  ADMIN_KEY, NETLIFY_APPROVE_URL
// Auto-injected:  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const normalizeEmail = (e: unknown) => String(e ?? "").trim().toLowerCase();
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method-not-allowed" });
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const ADMIN_KEY = Deno.env.get("ADMIN_KEY");
  const APPROVE_URL = Deno.env.get("NETLIFY_APPROVE_URL");
  if (!ADMIN_KEY || !APPROVE_URL) {
    console.error("alpha-admin: missing ADMIN_KEY or NETLIFY_APPROVE_URL secret");
    return json(500, { error: "server-misconfigured" });
  }
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json(401, { error: "unauthorized" });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) {
    console.error("alpha-admin: getUser failed", userErr);
    return json(401, { error: "unauthorized" });
  }
  const reviewerId = userRes.user.id;
  const { data: isAdmin, error: adminErr } = await userClient.rpc("is_admin");
  if (adminErr) {
    console.error("alpha-admin: is_admin rpc failed", adminErr);
    return json(500, { error: "admin-check-failed" });
  }
  if (!isAdmin) return json(403, { error: "forbidden" });
  let payload: { action?: string; email?: string; first_name?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "bad-json" });
  }
  const action = String(payload.action ?? "");
  const email = normalizeEmail(payload.email);
  const firstName = (payload.first_name ?? "").trim();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(400, { error: "bad-email" });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  try {
    switch (action) {
      case "approve":
      case "resend": {
        const r = await fetch(APPROVE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
          body: JSON.stringify({ email, first_name: firstName }),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok || !body.ok) {
          console.error("alpha-admin: alpha-approve failed", r.status, body);
          return json(502, { error: "approve-failed", detail: body?.detail ?? body?.error ?? r.status });
        }
        const code = body.code as string;
        const patch: Record<string, unknown> = {
          join_code: code,
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewerId,
        };
        if (action === "approve") patch.status = "approved";
        const { error: upErr } = await admin
          .from("alpha_applications").update(patch).eq("email", email);
        if (upErr) {
          console.error("alpha-admin: row update failed after approve", upErr);
          return json(207, { ok: true, code, warning: "key-issued-but-row-update-failed" });
        }
        return json(200, { ok: true, action, email, code });
      }
      case "revoke":
      case "reject": {
        const status = action === "revoke" ? "revoked" : "rejected";
        const { error: upErr } = await admin
          .from("alpha_applications")
          .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
          .eq("email", email);
        if (upErr) {
          console.error(`alpha-admin: ${action} update failed`, upErr);
          return json(500, { error: "update-failed", detail: upErr.message });
        }
        return json(200, { ok: true, action, email, status });
      }
      default:
        return json(400, { error: "unknown-action", detail: action });
    }
  } catch (err) {
    console.error("alpha-admin error:", err);
    return json(500, { error: "server", detail: String((err as Error)?.message ?? err) });
  }
});
