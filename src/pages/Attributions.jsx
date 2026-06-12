import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, ExternalLink, Image as ImageIcon, Mail, Send, Trash2,
  ChevronLeft, ChevronRight, Play, Layers,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

/**
 * Attributions & Studio — the tabbed "tavern-menu" page (a faithful
 * port of the prototype's brutalist parchment aesthetic, Fraunces +
 * Hanken Grotesk, hard offset shadows, sticky navy tab bar). One
 * URL-driven component, three views (shareable deep links):
 *
 *   (no params)                   → credits view (tabs)
 *   ?member=<id>                  → member profile
 *   ?view=gallery&artist=<id|all> → studio gallery
 *
 * Every word of content comes from the studio tables managed in
 * Admin → Studio — there are no hardcoded rosters, license blurbs, or
 * gallery arrays here (only static page chrome/headings, as in the
 * prototype). Reads use TanStack Query with explicit loading + error
 * handling (no silent `.catch(() => [])`). The /Attributions route
 * already existed in App.jsx.
 */

const STAFF_DOMAINS = ["@aetherianstudios.com", "@guildstew.com"];
const isStaffEmail = (email) =>
  STAFF_DOMAINS.some((d) => (email || "").toLowerCase().endsWith(d));

const monoGrad = (m) =>
  `linear-gradient(135deg, ${m?.avatar_color_1 || "#FF5300"}, ${m?.avatar_color_2 || "#ff8a4d"})`;
const initial = (name) => (name || "?").trim().charAt(0).toUpperCase();

// ─── gallery media ───
// `media` (jsonb) is canonical: [{ url, type:'image'|'video', sort }].
// Rows not yet backfilled fall back to a one-item list from image_url.
const VIDEO_EXT_RE = /\.(webm|mov|mp4|m4v|ogv)$/i;
const isVideoItem = (m) =>
  m?.type === "video" || (m?.type == null && VIDEO_EXT_RE.test(m?.url || ""));
function pieceMedia(piece) {
  const raw = Array.isArray(piece?.media) ? piece.media : [];
  const list = raw
    .filter((m) => m && m.url)
    .map((m, i) => ({ url: m.url, type: isVideoItem(m) ? "video" : "image", sort: m.sort ?? i }))
    .sort((a, b) => a.sort - b.sort);
  if (list.length) return list;
  return piece?.image_url ? [{ url: piece.image_url, type: "image", sort: 0 }] : [];
}

// Fraunces (display) + Hanken Grotesk (body), loaded once.
const FONT_LINK_ID = "attributions-fonts";
function useStudioFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=Hanken+Grotesk:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);
}

// Prototype CSS, namespaced under `.gs-attr` so nothing leaks into (or
// out of) the rest of the app's global styles.
const STYLES = `
.gs-attr{
  --orange:#FF5300; --navy:#1B2535; --teal:#04685A; --salmon:#F8A47C;
  --parchment:#FBF3E6; --parchment-2:#F4E9D5; --ink:#1B2535; --line:#E4D6BC; --white:#fff;
  font-family:'Hanken Grotesk',sans-serif; color:var(--ink); background:var(--parchment);
  background-image:
    radial-gradient(circle at 12% 18%, rgba(255,83,0,.06), transparent 30%),
    radial-gradient(circle at 88% 8%, rgba(4,104,90,.06), transparent 28%);
  min-height:100vh; padding:0 0 80px;
}
.gs-attr *{box-sizing:border-box}
.gs-attr a{color:inherit}
.gs-attr .wrap{max-width:1120px;margin:0 auto;padding:0 28px}

.gs-attr .hero{position:relative;padding:54px 28px 30px;text-align:center;overflow:hidden;border-bottom:3px solid var(--ink);background:linear-gradient(180deg,rgba(255,83,0,.10),transparent 70%)}
.gs-attr .kicker{font-weight:700;letter-spacing:.32em;text-transform:uppercase;font-size:12px;color:var(--teal)}
.gs-attr h1.title{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(46px,8vw,86px);line-height:.92;letter-spacing:-.02em;margin:6px 0 8px}
.gs-attr h1.title .hot{color:var(--orange);font-style:italic}
.gs-attr .sub{font-size:16px;color:#6a5c44;max-width:560px;margin:0 auto;font-weight:500}

.gs-attr nav.tabs{position:sticky;top:0;z-index:30;margin-top:22px;background:var(--ink);box-shadow:0 6px 0 rgba(27,37,53,.12)}
.gs-attr .tabs-inner{max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;gap:4px;padding:8px 24px}
.gs-attr .tab{appearance:none;border:0;cursor:pointer;background:transparent;color:#cdbfa9;font-weight:700;font-size:14px;letter-spacing:.04em;padding:12px 18px;border-radius:10px 10px 0 0;transition:.18s;position:relative}
.gs-attr .tab:hover{color:#fff;background:rgba(255,255,255,.06)}
.gs-attr .tab.active{color:var(--ink);background:var(--parchment)}
.gs-attr .tab.active::after{content:"";position:absolute;left:14px;right:14px;bottom:-3px;height:3px;background:var(--orange)}

.gs-attr .panel{padding-top:42px;animation:gsrise .5s ease both}
@keyframes gsrise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.gs-attr .section-label{display:flex;align-items:center;gap:14px;margin:6px 0 22px}
.gs-attr .section-label h2{font-family:'Fraunces',serif;font-weight:600;font-size:13px;letter-spacing:.34em;text-transform:uppercase;color:var(--teal);white-space:nowrap}
.gs-attr .section-label .rule{flex:1;height:2px;background:repeating-linear-gradient(90deg,var(--line) 0 8px,transparent 8px 14px)}
.gs-attr .group{margin-bottom:46px}

.gs-attr .crew-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}
.gs-attr .card{background:var(--white);border:2px solid var(--ink);border-radius:16px;padding:20px;position:relative;box-shadow:5px 5px 0 rgba(27,37,53,.12);transition:.18s}
.gs-attr .card:hover{transform:translate(-2px,-2px);box-shadow:8px 8px 0 rgba(255,83,0,.28)}
.gs-attr .avatar{width:58px;height:58px;border-radius:13px;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:900;font-size:24px;color:#fff;margin-bottom:14px;border:2px solid var(--ink);overflow:hidden}
.gs-attr .avatar img,.gs-attr .ava img,.gs-attr .big-ava img{width:100%;height:100%;object-fit:cover}
.gs-attr .card .name{font-family:'Fraunces',serif;font-weight:600;font-size:20px;line-height:1.05;cursor:pointer;transition:.15s;background:none;border:0;padding:0;text-align:left;color:inherit}
.gs-attr .card .name:hover{color:var(--orange);text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}
.gs-attr .card .role{font-size:13px;font-weight:600;color:#8a7a60;margin-top:3px}
.gs-attr .pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.gs-attr .badge-art{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);background:rgba(4,104,90,.1);padding:3px 9px;border-radius:99px}
.gs-attr .comm{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:99px}
.gs-attr .comm.open{color:#fff;background:var(--teal)}
.gs-attr .comm.closed{color:#8a7a60;background:var(--parchment-2)}
.gs-attr .gallery-btn{margin-top:15px;width:100%;cursor:pointer;border:2px solid var(--ink);background:var(--orange);color:#fff;font-weight:700;font-size:13.5px;letter-spacing:.03em;padding:10px;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:8px;transition:.16s}
.gs-attr .gallery-btn:hover{background:var(--ink);transform:translateY(-1px)}
.gs-attr .gallery-btn svg{width:16px;height:16px}

.gs-attr .stack{display:grid;gap:14px}
.gs-attr .lic{background:var(--white);border:2px solid var(--ink);border-left:8px solid var(--orange);border-radius:12px;padding:18px 20px;box-shadow:4px 4px 0 rgba(27,37,53,.1)}
.gs-attr .lic.teal{border-left-color:var(--teal)} .gs-attr .lic.salmon{border-left-color:var(--salmon)} .gs-attr .lic.navy{border-left-color:var(--navy)}
.gs-attr .lic h3{font-family:'Fraunces',serif;font-weight:600;font-size:18px;margin-bottom:5px}
.gs-attr .lic h3 a,.gs-attr .lic .lic-link{color:var(--orange);text-decoration:none;border-bottom:2px solid rgba(255,83,0,.3)}
.gs-attr .lic p{font-size:13.5px;color:#6a5c44;line-height:1.55;font-weight:500}
.gs-attr .lic .lic-link{display:inline-flex;align-items:center;gap:4px;font-weight:700;font-size:13px;margin-top:8px}
.gs-attr .lic .lic-inline{color:var(--orange);text-decoration:none;border-bottom:2px solid rgba(255,83,0,.3);font-weight:600;white-space:nowrap}
.gs-attr .lic .todo{display:inline-block;margin-top:7px;font-size:11px;font-weight:700;color:var(--orange);background:rgba(255,83,0,.1);padding:2px 8px;border-radius:6px}
.gs-attr .chips{display:flex;flex-wrap:wrap;gap:10px}
.gs-attr .chip{background:var(--white);border:2px solid var(--ink);border-radius:99px;padding:8px 16px;font-weight:700;font-size:13px;box-shadow:3px 3px 0 rgba(27,37,53,.1);text-decoration:none}
.gs-attr .chip span{color:var(--teal);font-weight:600}

.gs-attr .gal-head{padding:40px 0 14px}
.gs-attr .back{appearance:none;border:2px solid var(--ink);background:var(--white);cursor:pointer;font-weight:700;font-size:13px;padding:8px 15px;border-radius:10px;display:inline-flex;align-items:center;gap:7px;box-shadow:3px 3px 0 rgba(27,37,53,.12);margin-bottom:20px;color:inherit}
.gs-attr .back:hover{background:var(--ink);color:#fff}
.gs-attr .back svg{width:15px;height:15px}
.gs-attr .gal-head h1{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(38px,6vw,64px);line-height:.95}
.gs-attr .gal-head h1 .hot{color:var(--orange);font-style:italic}
.gs-attr .gal-head p{color:#6a5c44;font-weight:500;margin-top:6px;max-width:540px}
.gs-attr .filters{display:flex;flex-wrap:wrap;gap:9px;margin:24px 0 26px}
.gs-attr .fchip{cursor:pointer;border:2px solid var(--ink);background:var(--white);font-weight:700;font-size:13px;padding:8px 16px;border-radius:99px;transition:.15s;color:inherit}
.gs-attr .fchip.active{background:var(--orange);color:#fff}

.gs-attr .artist-banner{display:flex;gap:18px;align-items:center;background:var(--white);border:2px solid var(--ink);border-radius:16px;padding:18px 20px;box-shadow:5px 5px 0 rgba(27,37,53,.12);margin-bottom:26px;flex-wrap:wrap}
.gs-attr .artist-banner .ava{width:62px;height:62px;border-radius:14px;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:900;font-size:26px;color:#fff;border:2px solid var(--ink);flex-shrink:0;overflow:hidden}
.gs-attr .artist-banner .who{flex:1;min-width:170px}
.gs-attr .artist-banner .who .n{font-family:'Fraunces',serif;font-weight:600;font-size:22px;line-height:1;cursor:pointer;background:none;border:0;padding:0;color:inherit}
.gs-attr .artist-banner .who .n:hover{color:var(--orange)}
.gs-attr .artist-banner .who .r{color:#8a7a60;font-size:13px;font-weight:600;margin-top:3px}
.gs-attr .artist-banner .acts{display:flex;gap:9px;flex-wrap:wrap;align-items:center}
.gs-attr .ab-btn{cursor:pointer;border:2px solid var(--ink);border-radius:10px;font-weight:700;font-size:13px;padding:9px 14px;display:inline-flex;align-items:center;gap:7px;text-decoration:none;transition:.15s;color:inherit}
.gs-attr .ab-btn svg{width:15px;height:15px}
.gs-attr .ab-btn.outline{background:var(--white)} .gs-attr .ab-btn.outline:hover{background:var(--parchment-2)}
.gs-attr .ab-btn.solid{background:var(--orange);color:#fff} .gs-attr .ab-btn.solid:hover{background:var(--ink)}
.gs-attr .ab-btn.teal{background:var(--teal);color:#fff} .gs-attr .ab-btn.teal:hover{background:var(--ink)}
.gs-attr .ab-btn.navy{background:var(--navy);color:#fff} .gs-attr .ab-btn.navy:hover{background:var(--orange)}
.gs-attr .commbar{display:flex;align-items:center;gap:9px;background:var(--parchment-2);border:2px solid var(--ink);border-radius:10px;padding:6px 12px}
.gs-attr .commbar .lab{font-size:12px;font-weight:700}
.gs-attr .commbar .lab.open{color:var(--teal)} .gs-attr .commbar .lab.closed{color:#8a7a60}

/* decorative doodle layer — first-party inline SVG, never interactive */
.gs-attr #gallery-view{position:relative}
.gs-attr #gallery-view .gal-head,.gs-attr #gallery-view .grid,.gs-attr #gallery-view .state{position:relative;z-index:1}
.gs-attr .gal-decor{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.gs-attr .gal-decor .doodle{position:absolute}
.gs-attr .gal-decor .blob{position:absolute;border-radius:50%;filter:blur(64px);opacity:.16}
.gs-attr .hdr-squiggle{display:block;color:var(--orange);opacity:.6;margin:10px 0 2px}
@media(max-width:900px){.gs-attr .gal-decor{display:none}}
.gs-attr .grid{display:grid;grid-template-columns:repeat(6,1fr);grid-auto-flow:dense;grid-auto-rows:150px;gap:8px}
@media(max-width:900px){.gs-attr .grid{grid-template-columns:repeat(4,1fr)}}
@media(max-width:560px){.gs-attr .grid{grid-template-columns:repeat(2,1fr)}}
.gs-attr .piece--hero{grid-column:span 2;grid-row:span 2}
.gs-attr .piece--wide{grid-column:span 2}
.gs-attr .piece--tall{grid-row:span 2}
/* uniform variant — equal square cells, ignoring the span modifiers */
.gs-attr .grid--uniform{grid-auto-rows:auto}
.gs-attr .grid--uniform .piece{grid-column:auto!important;grid-row:auto!important;aspect-ratio:1/1}
.gs-attr .piece{position:relative;border:3px solid var(--frame,var(--orange));border-radius:14px;overflow:hidden;background:var(--white);box-shadow:5px 5px 0 rgba(27,37,53,.12);cursor:pointer;transition:.18s;display:block;width:100%;height:100%;padding:0;text-align:left;color:inherit}
.gs-attr .piece:hover{transform:translate(-2px,-2px);box-shadow:8px 8px 0 rgba(4,104,90,.28)}
.gs-attr .piece .art{position:relative;background:var(--parchment-2);width:100%;height:100%}
.gs-attr .piece .art img,.gs-attr .piece .art video{width:100%;height:100%;object-fit:cover;display:block}
.gs-attr .piece .art-empty{height:100%}
/* hover caption — Fraunces title + accent dot + artist name, over a scrim */
.gs-attr .piece .cap{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;gap:3px;padding:12px 13px;opacity:0;transition:.2s;color:#fff;background:linear-gradient(to top,rgba(27,37,53,.86),rgba(27,37,53,.18) 52%,transparent)}
.gs-attr .piece:hover .cap,.gs-attr .piece:focus-visible .cap{opacity:1}
.gs-attr .piece .cap .cap-t{font-family:'Fraunces',serif;font-weight:600;font-size:16px;line-height:1.12}
.gs-attr .piece .cap .cap-a{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:#f4e9d5}
.gs-attr .piece .cap .cap-a .dot{width:8px;height:8px;border-radius:50%;background:var(--frame,var(--orange));border:1px solid #fff;flex-shrink:0}
.gs-attr .piece .art .tag{position:absolute;top:10px;right:10px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:rgba(27,37,53,.82);color:#fff;padding:4px 9px;border-radius:99px}
.gs-attr .art-empty{display:grid;place-items:center;min-height:160px;color:#b7a98f}
.gs-attr .art-empty.big{min-height:340px;height:100%}
.gs-attr .art-empty svg{width:34px;height:34px}
.gs-attr .piece .art .vbadge{position:absolute;left:10px;bottom:10px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(27,37,53,.82);color:#fff;border:2px solid #fff}
.gs-attr .piece .art .vbadge svg{width:14px;height:14px}
.gs-attr .piece .art .multi{position:absolute;left:10px;top:10px;display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;background:rgba(255,255,255,.92);color:var(--ink);border:2px solid var(--ink);padding:3px 7px;border-radius:99px}
.gs-attr .piece .art .multi svg{width:13px;height:13px}
/* modal carousel */
.gs-attr .modal .art-big video{width:100%;height:100%;object-fit:contain;display:block;background:#000}
.gs-attr .modal .art-big .cnav{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;border:2px solid var(--ink);background:var(--white);cursor:pointer;display:grid;place-items:center;color:inherit;z-index:2}
.gs-attr .modal .art-big .cnav:hover{background:var(--orange);color:#fff}
.gs-attr .modal .art-big .cnav svg{width:20px;height:20px}
.gs-attr .modal .art-big .cnav.prev{left:12px} .gs-attr .modal .art-big .cnav.next{right:12px}
.gs-attr .modal .art-big .cdots{position:absolute;left:0;right:0;bottom:12px;display:flex;gap:7px;justify-content:center;z-index:2}
.gs-attr .modal .art-big .cdot{width:9px;height:9px;border-radius:50%;border:2px solid var(--ink);background:var(--white);cursor:pointer;padding:0}
.gs-attr .modal .art-big .cdot.on{background:var(--orange)}

.gs-attr .overlay{position:fixed;inset:0;background:rgba(27,37,53,.72);backdrop-filter:blur(3px);z-index:60;padding:30px;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center}
.gs-attr .modal{background:var(--parchment);border:3px solid var(--ink);border-radius:20px;width:min(880px,100%);box-shadow:0 24px 0 rgba(0,0,0,.25);overflow:hidden;display:grid;grid-template-columns:1.1fr 1fr;animation:gsrise .35s ease both}
@media(max-width:740px){.gs-attr .modal{grid-template-columns:1fr}}
.gs-attr .modal .art-big{min-height:340px;position:relative;background:var(--parchment-2)}
.gs-attr .modal .art-big img{width:100%;height:100%;object-fit:cover;display:block}
.gs-attr .modal .art-big .x{position:absolute;top:12px;left:12px;width:34px;height:34px;border-radius:50%;border:2px solid var(--ink);background:var(--white);cursor:pointer;font-size:18px;line-height:1;display:grid;place-items:center;color:inherit}
.gs-attr .modal .side{padding:24px;display:flex;flex-direction:column;max-height:78vh}
.gs-attr .modal .side h3{font-family:'Fraunces',serif;font-weight:900;font-size:26px;line-height:1}
.gs-attr .modal .side .by{font-weight:700;color:var(--teal);font-size:13.5px;margin:6px 0 12px}
.gs-attr .modal .side .desc{font-size:14px;color:#5c4f3a;line-height:1.55;font-weight:500;margin-bottom:14px}
.gs-attr .artist-strip{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--ink);color:#fff;border-radius:12px;padding:10px 14px;margin-bottom:16px}
.gs-attr .artist-strip .lab{font-size:12px;font-weight:600} .gs-attr .artist-strip .lab b{color:var(--salmon)}
.gs-attr .toggle{position:relative;width:48px;height:26px;border-radius:99px;background:#4a5568;cursor:pointer;border:2px solid #000;transition:.2s;flex-shrink:0}
.gs-attr .toggle.on{background:var(--orange)}
.gs-attr .toggle.readonly{cursor:default;opacity:.85}
.gs-attr .toggle::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:.2s}
.gs-attr .toggle.on::after{left:24px}
.gs-attr .comments{flex:1;overflow-y:auto;border-top:2px dashed var(--line);padding-top:14px}
.gs-attr .comments .ch{font-weight:700;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8a7a60;margin-bottom:12px}
.gs-attr .cmt{display:flex;gap:10px;margin-bottom:14px}
.gs-attr .cmt .ca{width:34px;height:34px;border-radius:9px;flex-shrink:0;display:grid;place-items:center;color:#fff;font-weight:800;font-size:13px;border:2px solid var(--ink)}
.gs-attr .cmt .cb{background:var(--white);border:2px solid var(--ink);border-radius:11px;padding:9px 12px;flex:1}
.gs-attr .cmt .cb .cn{font-weight:700;font-size:13px} .gs-attr .cmt .cb .ct{font-size:13px;color:#5c4f3a;margin-top:2px;line-height:1.4}
.gs-attr .cmt .del{background:none;border:0;cursor:pointer;color:#8B2C1E;opacity:.5;align-self:flex-start}
.gs-attr .cmt .del:hover{opacity:1}
.gs-attr .composer{display:flex;gap:8px;margin-top:10px;padding-top:12px;border-top:2px solid var(--line)}
.gs-attr .composer input{flex:1;border:2px solid var(--ink);border-radius:10px;padding:10px 12px;font-family:'Hanken Grotesk';font-size:13.5px;background:var(--white);color:var(--ink)}
.gs-attr .composer input:focus{outline:3px solid rgba(255,83,0,.3)}
.gs-attr .composer button{border:2px solid var(--ink);background:var(--orange);color:#fff;font-weight:700;font-size:13px;padding:0 16px;border-radius:10px;cursor:pointer}
.gs-attr .composer button:hover{background:var(--ink)}
.gs-attr .composer button:disabled{opacity:.5;cursor:default}
.gs-attr .locked{text-align:center;color:#8a7a60;font-weight:600;font-size:13.5px;padding:26px 10px;background:var(--white);border:2px dashed var(--line);border-radius:12px}
.gs-attr .locked .em{font-size:26px;display:block;margin-bottom:6px}
.gs-attr .footnote{text-align:center;color:#9a8b70;font-size:12.5px;font-weight:600;padding:30px 20px 0}

.gs-attr .profile{background:var(--white);border:2px solid var(--ink);border-radius:20px;padding:30px;box-shadow:6px 6px 0 rgba(27,37,53,.12);max-width:760px;margin:0 auto}
.gs-attr .member-back{margin-top:40px}
.gs-attr .profile-top{display:flex;gap:22px;align-items:center;flex-wrap:wrap}
.gs-attr .big-ava{width:104px;height:104px;border-radius:20px;border:3px solid var(--ink);overflow:hidden;display:grid;place-items:center;font-family:'Fraunces',serif;font-weight:900;font-size:44px;color:#fff;flex-shrink:0}
.gs-attr .pmeta{flex:1;min-width:200px}
.gs-attr .kicker-sm{font-weight:700;letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:var(--teal);margin-bottom:4px}
.gs-attr .pname{font-family:'Fraunces',serif;font-weight:900;font-size:clamp(30px,5vw,42px);line-height:.98}
.gs-attr .pname .known{color:#8a7a60;font-weight:600;font-size:.5em;font-style:italic}
.gs-attr .prole{color:#8a7a60;font-weight:600;font-size:14px;margin-top:5px}
.gs-attr .pbio{font-size:15.5px;line-height:1.65;color:#5c4f3a;font-weight:500;margin:22px 0 24px;border-top:2px dashed var(--line);padding-top:22px}
.gs-attr .pactions{display:flex;gap:10px;flex-wrap:wrap}

.gs-attr .state{padding:60px 20px;text-align:center;color:#8a7a60;font-weight:600}
.gs-attr .state.err{color:#8B2C1E}
.gs-attr .spinner{display:inline-block;width:24px;height:24px;border:3px solid currentColor;border-top-color:transparent;border-radius:50%;animation:gsspin .8s linear infinite}
@keyframes gsspin{to{transform:rotate(360deg)}}
`;

// ── Shared bits ──────────────────────────────────────────────────────
function AvatarFill({ member }) {
  return member?.avatar_url
    ? <img src={member.avatar_url} alt={member.name} />
    : <>{initial(member?.name)}</>;
}

function LoadingState() {
  return (
    <div className="state"><span className="spinner" /><p style={{ marginTop: 12 }}>Plating up…</p></div>
  );
}
function ErrorState({ error }) {
  return (
    <div className="state err">
      <p>Couldn't load this section.</p>
      <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{error?.message || String(error)}</p>
    </div>
  );
}
function EmptyState({ children }) {
  return <div className="state" style={{ fontStyle: "italic" }}>{children}</div>;
}
function SectionLabel({ children }) {
  return <div className="section-label"><h2>{children}</h2><span className="rule" /></div>;
}

// Render `text` with the first occurrence of `label` turned into a link.
function renderWithInlineLink(text, label, url) {
  const i = text.indexOf(label);
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <a className="lic-inline" href={url} target="_blank" rel="noopener noreferrer">{label}</a>
      {text.slice(i + label.length)}
    </>
  );
}

// ── Data hooks ───────────────────────────────────────────────────────
function useGroups() {
  return useQuery({
    queryKey: ["studioGroups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_groups").select("*").order("sort_order", { ascending: true });
      if (error) { console.error("Load team_groups", error); throw error; }
      return data || [];
    },
  });
}
function useMembers() {
  return useQuery({
    queryKey: ["studioMembers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").order("sort_order", { ascending: true });
      if (error) { console.error("Load team_members", error); throw error; }
      return data || [];
    },
  });
}
function useAttributionEntries() {
  return useQuery({
    queryKey: ["attributionEntries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("attribution_entries").select("*").order("sort_order", { ascending: true });
      if (error) { console.error("Load attribution_entries", error); throw error; }
      return data || [];
    },
  });
}
function useGalleryPieces() {
  return useQuery({
    queryKey: ["galleryPieces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_pieces")
        .select("*, artist:team_members(*)")
        .order("sort_order", { ascending: true });
      if (error) { console.error("Load gallery_pieces", error); throw error; }
      return data || [];
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
export default function Attributions() {
  useStudioFonts();
  const [params, setParams] = useSearchParams();
  const memberId = params.get("member");
  const view = params.get("view");

  return (
    <div className="gs-attr">
      <style>{STYLES}</style>
      {view === "gallery" ? (
        <GalleryView artistParam={params.get("artist") || "all"} setParams={setParams} />
      ) : memberId ? (
        <MemberProfile memberId={memberId} setParams={setParams} />
      ) : (
        <CreditsView setParams={setParams} />
      )}
    </div>
  );
}

// ═══════════════════════ Credits view (tabs) ════════════════════════
const TABS = [
  { id: "crew", label: "The Crew" },
  { id: "open_content", label: "Open Content" },
  { id: "tech", label: "Brewed With" },
  { id: "assets", label: "Art & Assets" },
];

function CreditsView({ setParams }) {
  const [tab, setTab] = useState("crew");
  return (
    <div id="attributions-view">
      <header className="hero">
        <div className="kicker">Made by the kitchen · Stirred with care</div>
        <h1 className="title">The <span className="hot">Credits</span> Counter</h1>
        <p className="sub">
          Everyone who chopped, simmered, and plated Guildstew — plus the
          open ingredients we built it on. Ladle says thanks.
        </p>
      </header>

      <nav className="tabs">
        <div className="tabs-inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${tab === t.id ? "active" : ""}`}
              onClick={() => { setTab(t.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="wrap">
        <div className="panel" key={tab}>
          {tab === "crew" && <CrewTab setParams={setParams} />}
          {tab === "open_content" && <EntriesTab section="open_content" label="Open Game Content" />}
          {tab === "tech" && <TechTab />}
          {tab === "assets" && <EntriesTab section="assets" label="Type, Art & Sundries" />}
        </div>
      </main>

      <p className="footnote">🥄 Built weird, built bold, built worlds — Aetherian Studios</p>
    </div>
  );
}

// ─────────────── The Crew ───────────────
function CrewTab({ setParams }) {
  const groups = useGroups();
  const members = useMembers();

  if (groups.isLoading || members.isLoading) return <LoadingState />;
  if (groups.error) return <ErrorState error={groups.error} />;
  if (members.error) return <ErrorState error={members.error} />;
  if (!members.data.length) return <EmptyState>No crew members yet. Add them in Admin → Studio.</EmptyState>;

  const openMember = (id) => setParams({ member: id });
  const openGallery = (artistId) => setParams({ view: "gallery", artist: artistId });
  const ungrouped = members.data.filter((m) => !m.group_id);

  const renderGroup = (key, name, list) => (
    <div className="group" key={key}>
      <SectionLabel>{name}</SectionLabel>
      <div className="crew-grid">
        {list.map((m) => <CrewCard key={m.id} member={m} onOpen={openMember} onGallery={openGallery} />)}
      </div>
    </div>
  );

  return (
    <>
      {groups.data.map((g) => {
        const list = members.data.filter((m) => m.group_id === g.id);
        return list.length ? renderGroup(g.id, g.name, list) : null;
      })}
      {ungrouped.length > 0 && renderGroup("_none", "The Crew", ungrouped)}
    </>
  );
}

function CrewCard({ member, onOpen, onGallery }) {
  return (
    <div className="card">
      <div className="avatar" style={{ background: monoGrad(member) }}><AvatarFill member={member} /></div>
      <button className="name" onClick={() => onOpen(member.id)} title="View profile">{member.name}</button>
      {member.role && <div className="role">{member.role}</div>}
      {member.is_artist && (
        <>
          <div className="pills">
            <span className="badge-art">Studio Artist</span>
            <span className={`comm ${member.commissions_open ? "open" : "closed"}`}>
              {member.commissions_open ? "Commissions open" : "Commissions closed"}
            </span>
          </div>
          <button className="gallery-btn" onClick={() => onGallery(member.id)}>
            <ImageIcon /> View Gallery
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────── Open Content / Art & Assets ───────────
function EntriesTab({ section, label }) {
  const { data, isLoading, error } = useAttributionEntries();
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  const rows = (data || []).filter((e) => e.section === section);
  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      {rows.length === 0 ? (
        <EmptyState>Nothing here yet. Add entries in Admin → Studio.</EmptyState>
      ) : (
        <div className="stack">
          {rows.map((e) => {
            const needsExact = (e.body || "").startsWith("REPLACE:");
            const bodyText = needsExact ? e.body.replace(/^REPLACE:\s*/, "") : e.body;
            const accentClass = e.accent && e.accent !== "orange" ? e.accent : "";
            // When the body mentions the link label (e.g. "…available from
            // Creative Commons."), render that phrase inline as the link
            // instead of tacking a separate link line on below.
            const inline = !!(e.link_url && e.link_label && bodyText?.includes(e.link_label));
            return (
              <div className={`lic ${accentClass}`} key={e.id}>
                <h3>{e.title}</h3>
                {bodyText && (
                  inline ? (
                    <p>{renderWithInlineLink(bodyText, e.link_label, e.link_url)}</p>
                  ) : (
                    <p>{bodyText}</p>
                  )
                )}
                {e.link_url && !inline && (
                  <a className="lic-link" href={e.link_url} target="_blank" rel="noopener noreferrer">
                    {e.link_label || e.link_url} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {needsExact && <span className="todo">⚑ Replace with exact license wording</span>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─────────────── Brewed With (tech chips) ───────────
function TechTab() {
  const { data, isLoading, error } = useAttributionEntries();
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  const rows = (data || []).filter((e) => e.section === "tech");
  return (
    <>
      <SectionLabel>The Tech Pantry</SectionLabel>
      <p style={{ color: "#6a5c44", fontWeight: 500, marginBottom: 20, maxWidth: 560 }}>
        Open-source tools we lean on. Hats off to the maintainers who keep these simmering.
      </p>
      {rows.length === 0 ? (
        <EmptyState>No tech listed yet. Add chips in Admin → Studio.</EmptyState>
      ) : (
        <div className="chips">
          {rows.map((e) => {
            const inner = <>{e.title} {e.tag && <span>· {e.tag}</span>}</>;
            return e.link_url ? (
              <a className="chip" key={e.id} href={e.link_url} target="_blank" rel="noopener noreferrer">{inner}</a>
            ) : (
              <div className="chip" key={e.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ═══════════════════════ Member profile ════════════════════════════
function MemberProfile({ memberId, setParams }) {
  const { data, isLoading, error } = useMembers();
  const groups = useGroups();

  if (isLoading || groups.isLoading) return <div className="wrap"><LoadingState /></div>;
  if (error) return <div className="wrap"><ErrorState error={error} /></div>;

  const member = (data || []).find((m) => m.id === memberId);
  const back = (
    <button className="back member-back" onClick={() => setParams({})}>
      <ArrowLeft /> Back to Credits
    </button>
  );
  if (!member) {
    return <div className="wrap" id="member-view">{back}<EmptyState>This crew member couldn't be found.</EmptyState></div>;
  }

  const group = (groups.data || []).find((g) => g.id === member.group_id);
  const display = member.full_name || member.name;
  const known = member.full_name ? ` ("${member.name}")` : "";

  return (
    <div className="wrap" id="member-view">
      {back}
      <div className="profile">
        <div className="profile-top">
          <div className="big-ava" style={{ background: monoGrad(member) }}><AvatarFill member={member} /></div>
          <div className="pmeta">
            {group && <div className="kicker-sm">{group.name}</div>}
            <h1 className="pname">{display}<span className="known">{known}</span></h1>
            {member.role && <div className="prole">{member.role}</div>}
            {member.is_artist && (
              <span className={`comm ${member.commissions_open ? "open" : "closed"}`} style={{ marginTop: 10, display: "inline-block" }}>
                {member.commissions_open ? "Commissions open" : "Commissions closed"}
              </span>
            )}
          </div>
        </div>
        <p className="pbio">{member.bio || "Bio coming soon."}</p>
        <div className="pactions">
          {member.is_artist && member.portfolio_url && (
            <a className="ab-btn outline" href={member.portfolio_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Portfolio
            </a>
          )}
          {member.is_artist && member.commission_email && (
            <a className="ab-btn solid" href={`mailto:${member.commission_email}?subject=${encodeURIComponent(`${member.commissions_open ? "Commission request for" : "Inquiry for"} ${member.name}`)}`}>
              <Mail /> {member.commissions_open ? "Commission Me" : "Get in Touch"}
            </a>
          )}
          {member.is_artist && (
            <button className="ab-btn teal" onClick={() => setParams({ view: "gallery", artist: member.id })}>
              <ImageIcon /> View Gallery
            </button>
          )}
          {member.business_inquiries && member.business_email && (
            <a className="ab-btn navy" href={`mailto:${member.business_email}?subject=${encodeURIComponent(`Business inquiry — ${member.name}`)}`}>
              <Mail /> Business Inquiries
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Grid cover: first media item (image, or muted video showing its first
// frame with a ▶ badge), plus a "multi" indicator for carousels.
function GalleryCover({ piece }) {
  const media = pieceMedia(piece);
  const cover = media[0];
  return (
    <div className="art">
      {cover ? (
        cover.type === "video" ? (
          <video src={cover.url} muted playsInline preload="metadata" tabIndex={-1} />
        ) : (
          <img src={cover.url} alt={piece.title} loading="lazy" />
        )
      ) : (
        <div className="art-empty"><ImageIcon /></div>
      )}
      {cover?.type === "video" && <span className="vbadge"><Play /></span>}
      {media.length > 1 && <span className="multi"><Layers /> {media.length}</span>}
      {!piece.comments_enabled && <span className="tag">Comments off</span>}
    </div>
  );
}

// Modal carousel over a piece's media in sort order. Images render as
// <img>; video as <video controls>. SVG is served via <img src> only —
// never inlined — so uploaded markup cannot execute.
function MediaCarousel({ piece }) {
  const media = pieceMedia(piece);
  const [i, setI] = useState(0);
  const n = media.length;
  if (!n) return <div className="art-empty big"><ImageIcon /></div>;
  const idx = Math.min(i, n - 1);
  const cur = media[idx];
  const go = (d) => setI((p) => (((Math.min(p, n - 1) + d) % n) + n) % n);
  return (
    <>
      {cur.type === "video" ? (
        <video src={cur.url} controls playsInline preload="metadata" />
      ) : (
        <img src={cur.url} alt={`${piece.title} — ${idx + 1} of ${n}`} />
      )}
      {n > 1 && (
        <>
          <button className="cnav prev" onClick={() => go(-1)} aria-label="Previous"><ChevronLeft /></button>
          <button className="cnav next" onClick={() => go(1)} aria-label="Next"><ChevronRight /></button>
          <div className="cdots">
            {media.map((_, k) => (
              <button
                key={k}
                className={`cdot ${k === idx ? "on" : ""}`}
                onClick={() => setI(k)}
                aria-label={`Go to item ${k + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

// Bento-mosaic tile sizing — a deterministic repeating cadence keyed off
// the piece's index in the (already sort_order'd) list. No schema field
// drives this; the same list always packs the same way, and `dense`
// auto-flow back-fills the gaps the larger tiles leave behind.
const SIZE_PATTERN = ["hero", "small", "tall", "wide", "small", "tall", "small", "hero", "wide", "small", "tall", "wide", "small"];
const SIZE_CLASS = SIZE_PATTERN.map(
  (s) => ({ hero: "piece--hero", wide: "piece--wide", tall: "piece--tall", small: "" }[s])
);

// First-party decorative doodles for the gallery wall. These are our own
// static markup (a d20, rune, sparkle, squiggle, plus, dots) plus two
// blurred colour blobs — not user media — so inlining the SVG is safe;
// the `<img src>`-only rule for uploaded art does not apply here. Purely
// presentational: pointer-events:none, low opacity, hidden under 900px.
function GalleryDecor() {
  const S = { strokeLinecap: "round", strokeLinejoin: "round", fill: "none", stroke: "currentColor" };
  return (
    <div className="gal-decor" aria-hidden="true">
      <span className="blob" style={{ width: 280, height: 280, top: -50, left: -70, background: "var(--orange)" }} />
      <span className="blob" style={{ width: 320, height: 320, bottom: 30, right: -90, background: "var(--teal)" }} />
      {/* d20 */}
      <svg className="doodle" style={{ top: 96, right: 30, width: 50, color: "var(--teal)", opacity: 0.18 }} viewBox="0 0 100 100" strokeWidth="4" {...S}>
        <polygon points="50,5 91,29 91,71 50,95 9,71 9,29" />
        <path d="M50,5 50,38 M9,29 50,38 91,29 M9,71 50,38 91,71 M50,38 50,95" />
      </svg>
      {/* rune */}
      <svg className="doodle" style={{ top: 260, left: 18, width: 38, color: "var(--salmon)", opacity: 0.5 }} viewBox="0 0 60 100" strokeWidth="6" {...S}>
        <path d="M30,4 30,96 M30,30 54,8 M30,30 6,8 M30,64 52,86" />
      </svg>
      {/* sparkle */}
      <svg className="doodle" style={{ top: 40, left: "42%", width: 30, color: "var(--orange)", opacity: 0.22 }} viewBox="0 0 100 100" strokeWidth="5" {...S}>
        <path d="M50,6 C54,38 62,46 94,50 C62,54 54,62 50,94 C46,62 38,54 6,50 C38,46 46,38 50,6Z" />
      </svg>
      {/* squiggle */}
      <svg className="doodle" style={{ bottom: 120, left: "30%", width: 110, color: "var(--teal)", opacity: 0.2 }} viewBox="0 0 160 40" strokeWidth="6" {...S}>
        <path d="M6,20 C26,2 36,2 56,20 C76,38 86,38 106,20 C126,2 136,2 154,20" />
      </svg>
      {/* plus */}
      <svg className="doodle" style={{ top: 420, right: 60, width: 26, color: "var(--navy)", opacity: 0.16 }} viewBox="0 0 40 40" strokeWidth="6" {...S}>
        <path d="M20,5 20,35 M5,20 35,20" />
      </svg>
      {/* dots */}
      <svg className="doodle" style={{ bottom: 60, left: 40, width: 60, color: "var(--orange)", opacity: 0.2 }} viewBox="0 0 100 30" fill="currentColor">
        <circle cx="10" cy="15" r="6" /><circle cx="38" cy="15" r="6" /><circle cx="66" cy="15" r="6" /><circle cx="94" cy="15" r="6" />
      </svg>
    </div>
  );
}

// ═══════════════════════ Gallery view ═══════════════════════════════
function GalleryView({ artistParam, setParams }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pieces = useGalleryPieces();
  const members = useMembers();
  const [activePiece, setActivePiece] = useState(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["galleryPieces"] });
    queryClient.invalidateQueries({ queryKey: ["studioMembers"] });
  };

  const toggleCommissions = useMutation({
    mutationFn: async ({ memberId, value }) => {
      const { error } = await supabase.from("team_members").update({ commissions_open: value }).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => { console.error("Toggle commissions", err); toast.error(err?.message || "Failed to update"); },
  });

  const toggleComments = useMutation({
    mutationFn: async ({ pieceId, value }) => {
      const { error } = await supabase.from("gallery_pieces").update({ comments_enabled: value }).eq("id", pieceId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidate();
      setActivePiece((p) => (p && p.id === vars.pieceId ? { ...p, comments_enabled: vars.value } : p));
    },
    onError: (err) => { console.error("Toggle comments", err); toast.error(err?.message || "Failed to update"); },
  });

  if (pieces.isLoading || members.isLoading) return <div className="wrap"><LoadingState /></div>;
  if (pieces.error) return <div className="wrap"><ErrorState error={pieces.error} /></div>;
  if (members.error) return <div className="wrap"><ErrorState error={members.error} /></div>;

  const artists = (members.data || []).filter((m) => m.is_artist);
  const filtered = artistParam === "all" ? pieces.data : pieces.data.filter((p) => p.artist_member_id === artistParam);
  const focusedArtist = artistParam !== "all" ? artists.find((a) => a.id === artistParam) : null;

  const canManageMember = (member) =>
    !!member && (isStaffEmail(user?.email) || (member.user_id && member.user_id === user?.id));

  return (
    <div className="wrap" id="gallery-view">
      <GalleryDecor />
      <div className="gal-head">
        <button className="back" onClick={() => setParams({})}><ArrowLeft /> Back to Credits</button>
        <h1>The <span className="hot">Gallery</span> Wall</h1>
        <p>Original work from the Guildstew art kitchen. Leave a note for the artist — if they've left the door open.</p>
        <svg className="hdr-squiggle" width="180" height="14" viewBox="0 0 180 14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
          <path d="M3,8 C20,1 32,1 48,8 C64,15 76,15 92,8 C108,1 120,1 136,8 C152,15 164,15 177,8" />
        </svg>

        <div className="filters">
          <button className={`fchip ${artistParam === "all" ? "active" : ""}`} onClick={() => setParams({ view: "gallery", artist: "all" })}>All</button>
          {artists.map((a) => (
            <button key={a.id} className={`fchip ${artistParam === a.id ? "active" : ""}`} onClick={() => setParams({ view: "gallery", artist: a.id })}>
              {a.name}
            </button>
          ))}
        </div>

        {focusedArtist && (
          <ArtistBanner
            artist={focusedArtist}
            canManage={canManageMember(focusedArtist)}
            onToggleCommissions={(value) => toggleCommissions.mutate({ memberId: focusedArtist.id, value })}
            onOpenProfile={() => setParams({ member: focusedArtist.id })}
          />
        )}
      </div>

      {!filtered.length ? (
        <EmptyState>No pieces published yet.</EmptyState>
      ) : (
        <div className="grid">
          {filtered.map((p, i) => (
            <button
              className={`piece ${SIZE_CLASS[i % SIZE_CLASS.length]}`}
              key={p.id}
              onClick={() => setActivePiece(p)}
              style={{ "--frame": p.artist?.avatar_color_1 || "var(--orange)" }}
            >
              <GalleryCover piece={p} />
              <div className="cap">
                <div className="cap-t">{p.title}</div>
                {p.artist?.name && (
                  <div className="cap-a"><span className="dot" />{p.artist.name}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {activePiece && (
        <PieceModal
          piece={activePiece}
          onClose={() => setActivePiece(null)}
          canManage={canManageMember(activePiece.artist)}
          onToggleComments={(value) => toggleComments.mutate({ pieceId: activePiece.id, value })}
        />
      )}
    </div>
  );
}

function ArtistBanner({ artist, canManage, onToggleCommissions, onOpenProfile }) {
  return (
    <div className="artist-banner">
      <div className="ava" style={{ background: monoGrad(artist) }}><AvatarFill member={artist} /></div>
      <div className="who">
        <button className="n" onClick={onOpenProfile}>{artist.name}</button>
        {artist.role && <div className="r">{artist.role}</div>}
      </div>
      <div className="acts">
        {artist.portfolio_url && (
          <a className="ab-btn outline" href={artist.portfolio_url} target="_blank" rel="noopener noreferrer"><ExternalLink /> Portfolio</a>
        )}
        <div className="commbar">
          <span className={`lab ${artist.commissions_open ? "open" : "closed"}`}>
            {artist.commissions_open ? "Open for commissions" : "Commissions closed"}
          </span>
          {canManage && (
            <div
              className={`toggle ${artist.commissions_open ? "on" : ""}`}
              title="Toggle commission status"
              onClick={() => onToggleCommissions(!artist.commissions_open)}
            />
          )}
        </div>
        {artist.commission_email && (
          <a className="ab-btn solid" href={`mailto:${artist.commission_email}?subject=${encodeURIComponent(`Commission request for ${artist.name}`)}`}>
            <Mail /> {artist.commissions_open ? "Commission Me" : "Get in Touch"}
          </a>
        )}
      </div>
    </div>
  );
}

// ─────────────── Piece modal + comments ───────────────
function PieceModal({ piece, onClose, canManage, onToggleComments }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const commentsQuery = useQuery({
    queryKey: ["galleryComments", piece.id],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from("gallery_comments").select("*").eq("piece_id", piece.id).order("created_at", { ascending: true });
      if (error) { console.error("Load gallery_comments", error); throw error; }
      const list = comments || [];
      const userIds = [...new Set(list.map((c) => c.user_id).filter(Boolean))];
      let profiles = {};
      if (userIds.length) {
        const { data: profs, error: pErr } = await supabase
          .from("user_profiles").select("user_id, username, profile_color_1, profile_color_2").in("user_id", userIds);
        if (pErr) { console.error("Load commenter profiles", pErr); throw pErr; }
        profiles = Object.fromEntries((profs || []).map((p) => [p.user_id, p]));
      }
      return list.map((c) => ({ ...c, profile: profiles[c.user_id] || null }));
    },
    enabled: piece.comments_enabled,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["galleryComments", piece.id] });

  const post = useMutation({
    mutationFn: async (text) => {
      const { error } = await supabase.from("gallery_comments").insert({ piece_id: piece.id, user_id: user.id, body: text });
      if (error) throw error;
    },
    onSuccess: () => { setBody(""); invalidate(); },
    onError: (err) => { console.error("Post comment", err); toast.error(err?.message || "Failed to post"); },
  });

  const del = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("gallery_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => { console.error("Delete comment", err); toast.error(err?.message || "Failed to delete"); },
  });

  const canDelete = (c) =>
    c.user_id === user?.id || isStaffEmail(user?.email) ||
    (piece.artist?.user_id && piece.artist.user_id === user?.id);

  const firstName = (piece.artist?.name || "the artist").split(" ")[0];
  const comments = commentsQuery.data || [];

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="art-big">
          <MediaCarousel piece={piece} />
          <button className="x" onClick={onClose}>×</button>
        </div>
        <div className="side">
          <h3>{piece.title}</h3>
          {piece.artist?.name && <div className="by">by {piece.artist.name}</div>}
          {piece.description && <div className="desc">{piece.description}</div>}

          {canManage && (
            <div className="artist-strip">
              <span className="lab">Viewing as <b>the artist</b> · per-piece comments</span>
              <div className={`toggle ${piece.comments_enabled ? "on" : ""}`} onClick={() => onToggleComments(!piece.comments_enabled)} />
            </div>
          )}

          {!piece.comments_enabled ? (
            <div className="comments">
              <div className="locked"><span className="em">🔒</span>{firstName} has turned off comments for this piece.</div>
            </div>
          ) : (
            <div className="comments">
              {commentsQuery.isLoading ? (
                <p style={{ color: "#8a7a60", fontWeight: 600, fontSize: 13.5 }}>Loading notes…</p>
              ) : commentsQuery.error ? (
                <ErrorState error={commentsQuery.error} />
              ) : (
                <>
                  <div className="ch">{comments.length} Note{comments.length === 1 ? "" : "s"} for the artist</div>
                  <div>
                    {comments.length === 0 ? (
                      <div style={{ color: "#8a7a60", fontWeight: 600, fontSize: 13.5 }}>No notes yet. Be the first.</div>
                    ) : comments.map((c) => {
                      const name = c.profile?.username || "adventurer";
                      const c1 = c.profile?.profile_color_1 || "#FF5722";
                      const c2 = c.profile?.profile_color_2 || "#37F2D1";
                      return (
                        <div className="cmt" key={c.id}>
                          <div className="ca" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>{initial(name)}</div>
                          <div className="cb"><div className="cn">@{name}</div><div className="ct">{c.body}</div></div>
                          {canDelete(c) && <button className="del" title="Delete" onClick={() => del.mutate(c.id)}><Trash2 className="w-4 h-4" /></button>}
                        </div>
                      );
                    })}
                  </div>
                  {user ? (
                    <form className="composer" onSubmit={(e) => { e.preventDefault(); if (body.trim()) post.mutate(body.trim()); }}>
                      <input value={body} onChange={(e) => setBody(e.target.value)} placeholder={`Tell ${firstName} what you think…`} />
                      <button type="submit" disabled={!body.trim() || post.isPending}><Send className="w-4 h-4" /></button>
                    </form>
                  ) : (
                    <div className="composer" style={{ color: "#8a7a60", fontWeight: 600, fontSize: 13.5 }}>Sign in to leave a note.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
