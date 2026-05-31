import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, ExternalLink, Image as ImageIcon, Lock, Mail, Palette,
  Send, Trash2, X,
} from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

/**
 * Attributions & Studio — the tabbed "tavern-menu" page that replaced
 * the old long-scroll credits page. One component, three URL-driven
 * views (shareable deep links):
 *
 *   (no params)                  → credits view (tabs)
 *   ?member=<id>                 → member profile
 *   ?view=gallery&artist=<id|all>→ studio gallery
 *
 * Every word on the page comes from the studio tables seeded/managed in
 * Admin → Studio — there are no hardcoded rosters, license blurbs, or
 * gallery arrays here. Reads use TanStack Query with explicit loading +
 * error handling (no silent `.catch(() => [])`).
 *
 * Routed at `/Attributions` (App.jsx) for both auth and unauth visitors;
 * the route already existed, so this file only changes the body.
 */

// ── Brand palette (matches tailwind.config + the prototype) ──────────
const ORANGE = "#FF5300";
const NAVY = "#1B2535";
const TEAL = "#04685A";
const SALMON = "#F8A47C";
const PARCHMENT = "#F3E2BD";
const INK = "#1F140C";

const ACCENTS = { orange: ORANGE, teal: TEAL, salmon: SALMON, navy: NAVY };
const accentColor = (a) => ACCENTS[a] || ORANGE;

const STAFF_DOMAINS = ["@aetherianstudios.com", "@guildstew.com"];
const isStaffEmail = (email) =>
  STAFF_DOMAINS.some((d) => (email || "").toLowerCase().endsWith(d));

// Fraunces (display) + Hanken Grotesk (body), loaded once for the page.
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
const DISPLAY = "'Fraunces', Georgia, serif";
const BODY = "'Hanken Grotesk', system-ui, sans-serif";

// ── Shared bits ──────────────────────────────────────────────────────
function Monogram({ member, size = 56, className = "" }) {
  if (member?.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={member.name}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const letter = (member?.name || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      className={`rounded-full flex items-center justify-center font-black text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontFamily: DISPLAY,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, ${member?.avatar_color_1 || ORANGE}, ${member?.avatar_color_2 || "#ff8a4d"})`,
      }}
    >
      {letter}
    </div>
  );
}

function ExtLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 hover:opacity-70"
    >
      {children}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

function CommissionPill({ open }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full px-2.5 py-1"
      style={{
        fontFamily: BODY,
        color: open ? "#0a3d36" : "#6b5a3e",
        background: open ? "rgba(4,104,90,0.15)" : "rgba(31,20,12,0.08)",
        border: `1px solid ${open ? "rgba(4,104,90,0.4)" : "rgba(31,20,12,0.2)"}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: open ? TEAL : "#9c8a68" }}
      />
      {open ? "Commissions open" : "Commissions closed"}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="py-20 text-center" style={{ fontFamily: BODY, color: "#6b5a3e" }}>
      <div className="inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
      <p className="mt-3 text-sm">Loading the studio menu…</p>
    </div>
  );
}

function ErrorState({ error }) {
  return (
    <div
      className="py-12 px-6 text-center rounded-xl"
      style={{ fontFamily: BODY, background: "rgba(139,44,30,0.08)", border: "1px solid rgba(139,44,30,0.3)", color: "#8B2C1E" }}
    >
      <p className="font-bold">Couldn't load this section.</p>
      <p className="text-sm mt-1 opacity-80">{error?.message || String(error)}</p>
    </div>
  );
}

// ── Data hooks ───────────────────────────────────────────────────────
function useGroups() {
  return useQuery({
    queryKey: ["studioGroups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_groups")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) { console.error("Load team_groups", error); throw error; }
      return data || [];
    },
  });
}

function useMembers() {
  return useQuery({
    queryKey: ["studioMembers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) { console.error("Load team_members", error); throw error; }
      return data || [];
    },
  });
}

function useAttributionEntries() {
  return useQuery({
    queryKey: ["attributionEntries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attribution_entries")
        .select("*")
        .order("sort_order", { ascending: true });
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
    <div
      className="min-h-screen"
      style={{
        fontFamily: BODY,
        color: INK,
        background:
          `radial-gradient(circle at 20% 10%, #f7ecd2 0%, ${PARCHMENT} 45%, #e9d4a8 100%)`,
      }}
    >
      <div className="max-w-5xl mx-auto px-5 py-8 md:py-12">
        {view === "gallery" ? (
          <GalleryView
            artistParam={params.get("artist") || "all"}
            setParams={setParams}
          />
        ) : memberId ? (
          <MemberProfile memberId={memberId} setParams={setParams} />
        ) : (
          <CreditsView setParams={setParams} />
        )}
      </div>
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
    <>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-70"
        style={{ color: "#6b5a3e" }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to the app
      </Link>

      <header className="text-center mb-8">
        <p
          className="text-[11px] uppercase tracking-[0.3em] font-bold mb-2"
          style={{ color: ORANGE }}
        >
          Aetherian Studios
        </p>
        <h1
          className="text-4xl md:text-5xl font-black"
          style={{ fontFamily: DISPLAY, color: NAVY }}
        >
          The Guildstew Menu
        </h1>
        <p className="mt-3 text-sm md:text-base max-w-xl mx-auto" style={{ color: "#6b5a3e" }}>
          The crew who cooked it up, the open content on the table, and
          everything we brewed with.
        </p>
      </header>

      {/* Tab nav */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-full text-sm font-bold transition-all"
              style={{
                fontFamily: BODY,
                color: active ? "#fff" : NAVY,
                background: active ? NAVY : "transparent",
                border: `2px solid ${NAVY}`,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "crew" && <CrewTab setParams={setParams} />}
      {tab === "open_content" && <EntriesTab section="open_content" />}
      {tab === "tech" && <TechTab />}
      {tab === "assets" && <EntriesTab section="assets" />}
    </>
  );
}

function SectionHeading({ children }) {
  return (
    <h2
      className="text-2xl font-black mb-5 flex items-center gap-3"
      style={{ fontFamily: DISPLAY, color: NAVY }}
    >
      <span className="h-px flex-1 max-w-[40px]" style={{ background: ORANGE }} />
      {children}
      <span className="h-px flex-1" style={{ background: "rgba(31,20,12,0.15)" }} />
    </h2>
  );
}

// ─────────────── The Crew ───────────────
function CrewTab({ setParams }) {
  const groups = useGroups();
  const members = useMembers();

  if (groups.isLoading || members.isLoading) return <LoadingState />;
  if (groups.error) return <ErrorState error={groups.error} />;
  if (members.error) return <ErrorState error={members.error} />;

  const byGroup = (gid) => members.data.filter((m) => m.group_id === gid);
  const ungrouped = members.data.filter((m) => !m.group_id);

  if (!members.data.length) {
    return <EmptyState>No crew members yet. Add them in Admin → Studio.</EmptyState>;
  }

  const openMember = (id) => setParams({ member: id });
  const openGallery = (artistId) => setParams({ view: "gallery", artist: artistId });

  return (
    <div className="space-y-10">
      {groups.data.map((g) => {
        const list = byGroup(g.id);
        if (!list.length) return null;
        return (
          <section key={g.id}>
            <SectionHeading>{g.name}</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((m) => (
                <CrewCard key={m.id} member={m} onOpen={openMember} onGallery={openGallery} />
              ))}
            </div>
          </section>
        );
      })}
      {ungrouped.length > 0 && (
        <section>
          <SectionHeading>The Crew</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ungrouped.map((m) => (
              <CrewCard key={m.id} member={m} onOpen={openMember} onGallery={openGallery} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CrewCard({ member, onOpen, onGallery }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center text-center transition-transform hover:-translate-y-1"
      style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(31,20,12,0.12)", boxShadow: "0 2px 0 rgba(31,20,12,0.06)" }}
    >
      <Monogram member={member} size={64} />
      <button
        onClick={() => onOpen(member.id)}
        className="mt-3 text-lg font-black hover:underline"
        style={{ fontFamily: DISPLAY, color: NAVY }}
      >
        {member.name}
      </button>
      {member.role && (
        <p className="text-xs uppercase tracking-widest mt-0.5" style={{ color: "#9c8a68" }}>
          {member.role}
        </p>
      )}
      {member.is_artist && (
        <div className="mt-3 flex flex-col items-center gap-2">
          <CommissionPill open={member.commissions_open} />
          <button
            onClick={() => onGallery(member.id)}
            className="text-xs font-bold rounded-full px-3 py-1.5"
            style={{ color: "#fff", background: ORANGE }}
          >
            View Gallery
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────── Open Content / Art & Assets (accent cards) ───────────
function EntriesTab({ section }) {
  const { data, isLoading, error } = useAttributionEntries();
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  const rows = (data || []).filter((e) => e.section === section);
  if (!rows.length) {
    return <EmptyState>Nothing here yet. Add entries in Admin → Studio.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      {rows.map((e) => {
        const c = accentColor(e.accent);
        return (
          <div
            key={e.id}
            className="rounded-xl p-5"
            style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(31,20,12,0.12)", borderLeftWidth: 4, borderLeftColor: c }}
          >
            <h3 className="text-lg font-black" style={{ fontFamily: DISPLAY, color: NAVY }}>
              {e.title}
            </h3>
            {e.body && (
              <p className="text-sm mt-1.5 leading-relaxed" style={{ color: "#4a3d2a" }}>
                {e.body}
              </p>
            )}
            {e.link_url && (
              <div className="mt-2 text-sm" style={{ color: c }}>
                <ExtLink href={e.link_url}>{e.link_label || e.link_url}</ExtLink>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────── Brewed With (tech chips) ───────────
function TechTab() {
  const { data, isLoading, error } = useAttributionEntries();
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  const rows = (data || []).filter((e) => e.section === "tech");
  if (!rows.length) {
    return <EmptyState>No tech listed yet. Add chips in Admin → Studio.</EmptyState>;
  }

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {rows.map((e) => {
        const c = accentColor(e.accent);
        const chip = (
          <div
            className="rounded-full px-4 py-2 flex items-center gap-2 transition-transform hover:-translate-y-0.5"
            style={{ background: "rgba(255,255,255,0.6)", border: `2px solid ${c}` }}
          >
            <span className="font-bold text-sm" style={{ color: NAVY }}>{e.title}</span>
            {e.tag && (
              <span
                className="text-[10px] uppercase tracking-wider font-black rounded-full px-2 py-0.5"
                style={{ color: "#fff", background: c }}
              >
                {e.tag}
              </span>
            )}
          </div>
        );
        return e.link_url ? (
          <a key={e.id} href={e.link_url} target="_blank" rel="noopener noreferrer">{chip}</a>
        ) : (
          <div key={e.id}>{chip}</div>
        );
      })}
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <p className="text-center py-16 italic" style={{ color: "#9c8a68" }}>
      {children}
    </p>
  );
}

// ═══════════════════════ Member profile ════════════════════════════
function MemberProfile({ memberId, setParams }) {
  const { data, isLoading, error } = useMembers();
  const groups = useGroups();

  if (isLoading || groups.isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  const member = (data || []).find((m) => m.id === memberId);
  if (!member) {
    return (
      <div>
        <BackToCredits setParams={setParams} />
        <EmptyState>This crew member couldn't be found.</EmptyState>
      </div>
    );
  }

  const group = (groups.data || []).find((g) => g.id === member.group_id);
  const headline = member.full_name || member.name;
  const knownAs = member.full_name ? member.name : null;

  return (
    <div className="max-w-2xl mx-auto">
      <BackToCredits setParams={setParams} />
      <div
        className="rounded-3xl p-8 mt-4 text-center"
        style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(31,20,12,0.12)" }}
      >
        <div className="flex justify-center">
          <Monogram member={member} size={120} />
        </div>
        {group && (
          <p className="text-[11px] uppercase tracking-[0.3em] font-bold mt-4" style={{ color: ORANGE }}>
            {group.name}
          </p>
        )}
        <h1 className="text-3xl md:text-4xl font-black mt-2" style={{ fontFamily: DISPLAY, color: NAVY }}>
          {headline}
        </h1>
        {knownAs && (
          <p className="text-sm mt-1" style={{ color: "#9c8a68" }}>
            known as <span className="font-bold">{knownAs}</span>
          </p>
        )}
        {member.role && (
          <p className="text-base font-bold mt-1" style={{ color: TEAL }}>{member.role}</p>
        )}
        {member.bio && (
          <p className="text-sm md:text-base mt-4 leading-relaxed max-w-prose mx-auto" style={{ color: "#4a3d2a" }}>
            {member.bio}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {member.is_artist && member.portfolio_url && (
            <ActionButton href={member.portfolio_url} external accent={ORANGE} icon={ExternalLink}>
              Portfolio
            </ActionButton>
          )}
          {member.is_artist && member.commission_email && (
            <ActionButton
              href={`mailto:${member.commission_email}?subject=${encodeURIComponent(
                `${member.commissions_open ? "Commission" : "Inquiry"} — ${member.name}`,
              )}`}
              accent={member.commissions_open ? TEAL : "#9c8a68"}
              icon={Mail}
            >
              {member.commissions_open ? "Commission Me" : "Get in Touch"}
            </ActionButton>
          )}
          {member.is_artist && (
            <button
              onClick={() => setParams({ view: "gallery", artist: member.id })}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: NAVY }}
            >
              <Palette className="w-4 h-4" /> View Gallery
            </button>
          )}
          {member.business_inquiries && member.business_email && (
            <ActionButton
              href={`mailto:${member.business_email}?subject=${encodeURIComponent(
                `Business inquiry — ${member.name}`,
              )}`}
              accent={SALMON}
              icon={Mail}
            >
              Business Inquiries
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ href, external, accent, icon: Icon, children }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white"
      style={{ background: accent }}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </a>
  );
}

function BackToCredits({ setParams }) {
  return (
    <button
      onClick={() => setParams({})}
      className="inline-flex items-center gap-2 text-sm hover:opacity-70"
      style={{ color: "#6b5a3e" }}
    >
      <ArrowLeft className="w-4 h-4" /> Back to the menu
    </button>
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
      const { error } = await supabase
        .from("team_members")
        .update({ commissions_open: value })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => { console.error("Toggle commissions", err); toast.error(err?.message || "Failed to update"); },
  });

  const toggleComments = useMutation({
    mutationFn: async ({ pieceId, value }) => {
      const { error } = await supabase
        .from("gallery_pieces")
        .update({ comments_enabled: value })
        .eq("id", pieceId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (err) => { console.error("Toggle comments", err); toast.error(err?.message || "Failed to update"); },
  });

  if (pieces.isLoading || members.isLoading) return <LoadingState />;
  if (pieces.error) return <ErrorState error={pieces.error} />;
  if (members.error) return <ErrorState error={members.error} />;

  const artists = (members.data || []).filter((m) => m.is_artist);
  const filtered = artistParam === "all"
    ? pieces.data
    : pieces.data.filter((p) => p.artist_member_id === artistParam);

  const focusedArtist = artistParam !== "all"
    ? artists.find((a) => a.id === artistParam)
    : null;

  // Owner/staff may toggle commission + comment state inline.
  const canManageMember = (member) =>
    !!member && (isStaffEmail(user?.email) || (member.user_id && member.user_id === user?.id));

  return (
    <div>
      <button
        onClick={() => setParams({})}
        className="inline-flex items-center gap-2 text-sm hover:opacity-70 mb-4"
        style={{ color: "#6b5a3e" }}
      >
        <ArrowLeft className="w-4 h-4" /> Back to the menu
      </button>

      <header className="text-center mb-6">
        <h1 className="text-4xl font-black" style={{ fontFamily: DISPLAY, color: NAVY }}>
          Studio Gallery
        </h1>
      </header>

      {/* Artist filter chips */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <FilterChip active={artistParam === "all"} onClick={() => setParams({ view: "gallery", artist: "all" })}>
          All Artists
        </FilterChip>
        {artists.map((a) => (
          <FilterChip
            key={a.id}
            active={artistParam === a.id}
            onClick={() => setParams({ view: "gallery", artist: a.id })}
          >
            {a.name}
          </FilterChip>
        ))}
      </div>

      {/* Artist banner when focused */}
      {focusedArtist && (
        <ArtistBanner
          artist={focusedArtist}
          canManage={canManageMember(focusedArtist)}
          onToggleCommissions={(value) => toggleCommissions.mutate({ memberId: focusedArtist.id, value })}
          onOpenProfile={() => setParams({ member: focusedArtist.id })}
        />
      )}

      {!filtered.length ? (
        <EmptyState>No pieces published yet.</EmptyState>
      ) : (
        <div style={{ columnGap: "1rem" }} className="columns-1 sm:columns-2 lg:columns-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePiece(p)}
              className="mb-4 w-full block break-inside-avoid rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-1"
              style={{ background: "rgba(255,255,255,0.55)", border: "1px solid rgba(31,20,12,0.12)" }}
            >
              <img src={p.image_url} alt={p.title} className="w-full block" loading="lazy" />
              <div className="p-3">
                <p className="font-black text-sm" style={{ fontFamily: DISPLAY, color: NAVY }}>{p.title}</p>
                {p.artist?.name && (
                  <p className="text-[11px]" style={{ color: "#9c8a68" }}>by {p.artist.name}</p>
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

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all"
      style={{
        color: active ? "#fff" : NAVY,
        background: active ? ORANGE : "transparent",
        border: `2px solid ${active ? ORANGE : "rgba(31,20,12,0.25)"}`,
      }}
    >
      {children}
    </button>
  );
}

function ArtistBanner({ artist, canManage, onToggleCommissions, onOpenProfile }) {
  return (
    <div
      className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-center gap-4"
      style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(31,20,12,0.12)" }}
    >
      <Monogram member={artist} size={72} />
      <div className="flex-1 text-center sm:text-left">
        <button onClick={onOpenProfile} className="text-xl font-black hover:underline" style={{ fontFamily: DISPLAY, color: NAVY }}>
          {artist.name}
        </button>
        {artist.role && (
          <p className="text-xs uppercase tracking-widest" style={{ color: "#9c8a68" }}>{artist.role}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
          <CommissionPill open={artist.commissions_open} />
          {canManage && (
            <button
              onClick={() => onToggleCommissions(!artist.commissions_open)}
              className="text-[11px] font-bold underline decoration-dotted"
              style={{ color: TEAL }}
            >
              {artist.commissions_open ? "Close commissions" : "Open commissions"}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {artist.portfolio_url && (
          <ActionButton href={artist.portfolio_url} external accent={ORANGE} icon={ExternalLink}>
            Portfolio
          </ActionButton>
        )}
        {artist.commission_email && (
          <ActionButton
            href={`mailto:${artist.commission_email}?subject=${encodeURIComponent(
              `${artist.commissions_open ? "Commission" : "Inquiry"} — ${artist.name}`,
            )}`}
            accent={artist.commissions_open ? TEAL : "#9c8a68"}
            icon={Mail}
          >
            {artist.commissions_open ? "Commission Me" : "Get in Touch"}
          </ActionButton>
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
        .from("gallery_comments")
        .select("*")
        .eq("piece_id", piece.id)
        .order("created_at", { ascending: true });
      if (error) { console.error("Load gallery_comments", error); throw error; }
      const list = comments || [];
      const userIds = [...new Set(list.map((c) => c.user_id).filter(Boolean))];
      let profiles = {};
      if (userIds.length) {
        const { data: profs, error: pErr } = await supabase
          .from("user_profiles")
          .select("user_id, username, profile_color_1, profile_color_2")
          .in("user_id", userIds);
        if (pErr) { console.error("Load commenter profiles", pErr); throw pErr; }
        profiles = Object.fromEntries((profs || []).map((p) => [p.user_id, p]));
      }
      return list.map((c) => ({ ...c, profile: profiles[c.user_id] || null }));
    },
    enabled: piece.comments_enabled,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["galleryComments", piece.id] });

  const post = useMutation({
    mutationFn: async (text) => {
      const { error } = await supabase
        .from("gallery_comments")
        .insert({ piece_id: piece.id, user_id: user.id, body: text });
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(27,37,53,0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: PARCHMENT, border: "1px solid rgba(31,20,12,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white"
          style={{ background: NAVY }}
        >
          <X className="w-4 h-4" />
        </button>
        <img src={piece.image_url} alt={piece.title} className="w-full" />
        <div className="p-6">
          <h2 className="text-2xl font-black" style={{ fontFamily: DISPLAY, color: NAVY }}>{piece.title}</h2>
          {piece.artist?.name && (
            <p className="text-sm" style={{ color: "#9c8a68" }}>by {piece.artist.name}</p>
          )}
          {piece.description && (
            <p className="text-sm mt-3 leading-relaxed" style={{ color: "#4a3d2a" }}>{piece.description}</p>
          )}

          {canManage && (
            <button
              onClick={() => onToggleComments(!piece.comments_enabled)}
              className="mt-4 text-xs font-bold underline decoration-dotted"
              style={{ color: TEAL }}
            >
              {piece.comments_enabled ? "Disable comments" : "Enable comments"}
            </button>
          )}

          <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(31,20,12,0.15)" }}>
            {!piece.comments_enabled ? (
              <p className="flex items-center gap-2 text-sm italic" style={{ color: "#9c8a68" }}>
                <Lock className="w-4 h-4" /> Comments are turned off for this piece.
              </p>
            ) : (
              <>
                <CommentThread
                  query={commentsQuery}
                  canDelete={canDelete}
                  onDelete={(id) => del.mutate(id)}
                />
                {user ? (
                  <form
                    className="mt-4 flex items-center gap-2"
                    onSubmit={(e) => { e.preventDefault(); if (body.trim()) post.mutate(body.trim()); }}
                  >
                    <input
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Leave a comment…"
                      className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
                      style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(31,20,12,0.2)", color: INK }}
                    />
                    <button
                      type="submit"
                      disabled={!body.trim() || post.isPending}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40"
                      style={{ background: ORANGE }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <p className="mt-4 text-sm italic" style={{ color: "#9c8a68" }}>
                    Sign in to leave a comment.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommentThread({ query, canDelete, onDelete }) {
  if (query.isLoading) return <p className="text-sm" style={{ color: "#9c8a68" }}>Loading comments…</p>;
  if (query.error) return <ErrorState error={query.error} />;
  const comments = query.data || [];
  if (!comments.length) {
    return <p className="text-sm italic" style={{ color: "#9c8a68" }}>No comments yet. Be the first.</p>;
  }
  return (
    <ul className="space-y-3">
      {comments.map((c) => {
        const name = c.profile?.username || "Adventurer";
        const c1 = c.profile?.profile_color_1 || "#FF5722";
        const c2 = c.profile?.profile_color_2 || "#37F2D1";
        return (
          <li key={c.id} className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-black"
              style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: NAVY }}>{name}</p>
              <p className="text-sm" style={{ color: "#4a3d2a" }}>{c.body}</p>
            </div>
            {canDelete(c) && (
              <button onClick={() => onDelete(c.id)} className="opacity-50 hover:opacity-100" title="Delete">
                <Trash2 className="w-3.5 h-3.5" style={{ color: "#8B2C1E" }} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
