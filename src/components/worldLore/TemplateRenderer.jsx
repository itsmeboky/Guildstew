import React from "react";
import { safeText } from "@/utils/safeRender";

/**
 * World Lore template renderer — Part 2A.
 *
 * Dispatches on `entry.template_type` to a visually distinct renderer
 * per template. The detail view mounts this inside GatedEntryView's
 * `renderBody` so the surrounding gate flow (knowledge gates,
 * language comprehension tier, Thieves' Cant / Druidic annotations)
 * still wraps the template output.
 *
 * Part 2A implements the five global templates (Freeform, Secret
 * Document, Letter, Wanted Poster, Sketch). All other templates are
 * stubbed to the Freeform fallback — their richer renderers ship in
 * Parts 2B and 2C. The switch lists every template_type so each
 * follow-up commit only swaps a fallback for the real renderer.
 */
export default function TemplateRenderer({ entry }) {
  const metadata = entry?.metadata || {};
  switch (entry?.template_type) {
    case "wanted_poster":    return <WantedPosterTemplate    entry={entry} metadata={metadata} />;
    case "letter":           return <LetterTemplate          entry={entry} metadata={metadata} />;
    case "secret_document":  return <SecretDocumentTemplate  entry={entry} metadata={metadata} />;
    case "sketch":           return <SketchTemplate          entry={entry} metadata={metadata} />;

    case "artifact_card":    return <ArtifactCardTemplate    entry={entry} metadata={metadata} />;
    case "cursed_item":      return <CursedItemTemplate      entry={entry} metadata={metadata} />;
    case "lost_relic":       return <LostRelicTemplate       entry={entry} metadata={metadata} />;
    case "faction_profile":  return <FactionProfileTemplate  entry={entry} metadata={metadata} />;
    case "location":         return <LocationTemplate        entry={entry} metadata={metadata} />;
    case "landmark":         return <LandmarkTemplate        entry={entry} metadata={metadata} />;
    case "map_note":         return <MapNoteTemplate         entry={entry} metadata={metadata} />;

    case "deity_profile":    return <DeityProfileTemplate    entry={entry} metadata={metadata} />;
    case "prayer":           return <PrayerTemplate          entry={entry} metadata={metadata} />;
    case "holy_site":        return <HolySiteTemplate        entry={entry} metadata={metadata} />;
    case "historical_event": return <HistoricalEventTemplate entry={entry} metadata={metadata} />;
    case "era_summary":      return <EraSummaryTemplate      entry={entry} metadata={metadata} />;
    case "battle_report":    return <BattleReportTemplate    entry={entry} metadata={metadata} />;
    case "political_decree": return <PoliticalDecreeTemplate entry={entry} metadata={metadata} />;
    case "treaty":           return <TreatyTemplate          entry={entry} metadata={metadata} />;

    case "freeform":
    default:
      return <FreeformTemplate entry={entry} />;
  }
}

function FreeformTemplate({ entry }) {
  if (!entry?.content) return null;
  // HTML-formatted freeform content was the legacy shape; plain-text
  // freeform content is the new shape. Render HTML when it looks like
  // markup so existing entries don't lose their formatting, otherwise
  // render through whitespace-safe plain text.
  if (typeof entry.content === "string" && /<[a-z][\s\S]*>/i.test(entry.content)) {
    return (
      <div
        className="prose prose-invert max-w-none text-slate-300 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
    );
  }
  return (
    <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
      {safeText(entry.content)}
    </div>
  );
}

function WantedPosterTemplate({ entry, metadata }) {
  const deadOrAlive   = safeText(metadata.dead_or_alive);
  const alias         = safeText(metadata.alias);
  const crimes        = safeText(metadata.crimes);
  const reward        = safeText(metadata.reward);
  const notes         = safeText(entry.content);
  const postedBy      = safeText(metadata.posted_by);
  const portrait      = safeText(metadata.portrait_url);
  const title         = safeText(entry.title);
  return (
    <div className="max-w-md mx-auto">
      <div
        className="relative bg-[#1a1814] border-2 border-amber-900/40 rounded-lg p-6 shadow-lg"
        style={{
          clipPath:
            "polygon(2% 0%, 98% 1%, 100% 3%, 99% 97%, 97% 100%, 3% 99%, 0% 97%, 1% 2%)",
        }}
      >
        <h2
          className="text-center font-bold text-3xl tracking-[0.3em] text-amber-200/90 mb-1"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
        >
          WANTED
        </h2>
        {deadOrAlive && (
          <p className="text-center text-xs tracking-[0.2em] text-amber-400/60 uppercase mb-4">
            {deadOrAlive}
          </p>
        )}

        <div className="w-48 h-48 mx-auto mb-4 border-2 border-amber-900/30 rounded overflow-hidden bg-[#12100e]">
          {portrait ? (
            <img src={portrait} className="w-full h-full object-cover object-top" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600">
              No Portrait
            </div>
          )}
        </div>

        <h3 className="text-center text-2xl font-bold text-amber-100 mb-1">{title}</h3>
        {alias && (
          <p className="text-center text-sm text-amber-400/60 italic mb-4">
            a.k.a. "{alias}"
          </p>
        )}

        {crimes && (
          <div className="border-t border-b border-amber-900/30 py-3 my-3">
            <p className="text-xs text-amber-400/60 uppercase tracking-wider mb-1">Crimes</p>
            <p className="text-sm text-amber-100/80 whitespace-pre-line">{crimes}</p>
          </div>
        )}

        {reward && (
          <div className="text-center my-4">
            <p className="text-xs text-amber-400/60 uppercase tracking-wider">Reward</p>
            <p className="text-2xl font-bold text-[#37F2D1]">{reward}</p>
          </div>
        )}

        {notes && (
          <p className="text-xs text-amber-100/50 italic text-center mb-3 whitespace-pre-wrap">
            {notes}
          </p>
        )}

        <p className="text-center text-xs text-amber-400/40 mt-4">
          Posted by: {postedBy || "Unknown"}
        </p>
      </div>
    </div>
  );
}

function LetterTemplate({ entry, metadata }) {
  const date      = safeText(metadata.date);
  const to        = safeText(metadata.to);
  const from      = safeText(metadata.from);
  const signature = safeText(metadata.signature);
  const body      = safeText(entry.content);
  const sealed    = !!metadata.sealed;
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-[#1e1c18] border border-amber-900/20 rounded-lg p-8 shadow-lg relative">
        {sealed && (
          <div
            className="absolute -top-3 right-8 w-10 h-10 rounded-full bg-red-900 border-2 border-red-800 flex items-center justify-center shadow-lg"
            title="Sealed with wax"
          >
            <span className="text-red-200 text-xs font-bold">⚜</span>
          </div>
        )}

        <p className="text-right text-sm text-slate-400 italic mb-6">{date || "Undated"}</p>

        <p className="text-slate-300 mb-4">
          <span className="text-slate-500">To:</span> {to || "..."}
        </p>

        <div className="text-slate-200 leading-relaxed whitespace-pre-wrap border-l-2 border-amber-900/20 pl-4 my-6">
          {body}
        </div>

        <div className="text-right mt-8">
          <p className="text-slate-300 italic">— {from || "Unknown"}</p>
          {signature && <p className="text-sm text-slate-500 mt-1">{signature}</p>}
        </div>
      </div>
    </div>
  );
}

function SecretDocumentTemplate({ entry, metadata }) {
  const classification  = safeText(metadata.classification) || "Classified";
  const whoKnows        = safeText(metadata.who_knows);
  const howToDiscover   = safeText(metadata.how_to_discover);
  const title           = safeText(entry.title);
  const content         = safeText(entry.content);
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-[#1a1215] border border-red-900/30 rounded-lg p-6 relative overflow-hidden">
        <div className="absolute top-4 right-4 rotate-[-15deg] border-2 border-red-600/40 rounded px-3 py-1">
          <span className="text-red-500/60 text-sm font-bold tracking-[0.2em] uppercase">
            {classification}
          </span>
        </div>

        <h3 className="text-lg font-bold text-red-300 mb-4 pr-32">{title}</h3>

        {content && (
          <div className="text-slate-300 whitespace-pre-wrap leading-relaxed mb-4">
            {content}
          </div>
        )}

        {whoKnows && (
          <div className="border-t border-red-900/20 pt-3 mt-3">
            <p className="text-xs text-red-400/60 uppercase tracking-wider mb-1">Known By</p>
            <p className="text-sm text-slate-400 whitespace-pre-wrap">{whoKnows}</p>
          </div>
        )}

        {howToDiscover && (
          <div className="border-t border-red-900/20 pt-3 mt-3">
            <p className="text-xs text-red-400/60 uppercase tracking-wider mb-1">How to Discover</p>
            <p className="text-sm text-slate-400 whitespace-pre-wrap">{howToDiscover}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SketchTemplate({ entry, metadata }) {
  const sketchUrl = safeText(metadata.sketch_url);
  const caption   = safeText(entry.content);
  return (
    <div className="max-w-2xl mx-auto">
      {sketchUrl && (
        <div className="border border-slate-700/50 rounded-lg overflow-hidden bg-[#050816]">
          <img src={sketchUrl} className="w-full" alt="" />
        </div>
      )}
      {caption && (
        <p className="text-sm text-slate-400 italic text-center mt-3 whitespace-pre-wrap">
          {caption}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────── Artifacts ─────────────────────────────

// Rarity → palette mapping shared by the three artifact-style
// templates. Cursed Item and Lost Relic override/decorate on top of
// the base artifact look.
const RARITY_STYLES = {
  "Common":    { border: "border-slate-500",   bg: "bg-[#1a1f2e]", badge: "bg-slate-700 text-slate-300" },
  "Uncommon":  { border: "border-emerald-700", bg: "bg-[#1a2420]", badge: "bg-emerald-900/50 text-emerald-400" },
  "Rare":      { border: "border-blue-700",    bg: "bg-[#1a1f2e]", badge: "bg-blue-900/50 text-blue-400" },
  "Very Rare": { border: "border-purple-700",  bg: "bg-[#201a2e]", badge: "bg-purple-900/50 text-purple-400" },
  "Legendary": { border: "border-orange-600",  bg: "bg-[#2e2218]", badge: "bg-orange-900/50 text-orange-400" },
  "Artifact":  { border: "border-red-700",     bg: "bg-[#2e1a1a]", badge: "bg-red-900/50 text-red-400" },
};

function pickRarityStyle(rarity) {
  return RARITY_STYLES[rarity] || RARITY_STYLES["Common"];
}

function ArtifactCardTemplate({ entry, metadata }) {
  const rarity  = safeText(metadata.rarity) || "Common";
  const style   = pickRarityStyle(rarity);
  const title   = safeText(entry.title);
  const image   = safeText(metadata.image_url);
  const type    = safeText(metadata.item_type);
  const attune  = !!metadata.attunement;
  const props   = safeText(metadata.properties);
  const content = safeText(entry.content);
  const holder  = safeText(metadata.current_holder);
  const origin  = safeText(metadata.origin);
  return (
    <div className="max-w-sm mx-auto">
      <div className={`rounded-lg overflow-hidden border-2 shadow-lg ${style.border} ${style.bg}`}>
        {image && (
          <div className="h-48 overflow-hidden">
            <img src={image} className="w-full h-full object-cover object-top" alt="" />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center justify-between mb-2 gap-2">
            <h3 className="text-lg font-bold text-white truncate">{title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0 ${style.badge}`}>
              {rarity}
            </span>
          </div>
          {(type || attune) && (
            <p className="text-xs text-slate-400 italic mb-3">
              {type}{type && attune ? " " : ""}{attune ? "(requires attunement)" : ""}
            </p>
          )}
          {props && (
            <div className="text-sm text-slate-300 mb-3 whitespace-pre-wrap">{props}</div>
          )}
          {content && (
            <div className="border-t border-slate-700/50 pt-3 mt-3">
              <p className="text-sm text-slate-400 italic whitespace-pre-wrap">{content}</p>
            </div>
          )}
          {holder && (
            <p className="text-xs text-slate-500 mt-3">
              Currently held by: <span className="text-[#37F2D1]">{holder}</span>
            </p>
          )}
          {origin && (
            <div className="mt-3 pt-3 border-t border-slate-700/40">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Origin</p>
              <p className="text-xs text-slate-400 whitespace-pre-wrap">{origin}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CursedItemTemplate({ entry, metadata }) {
  const rarity       = safeText(metadata.rarity) || "Common";
  const baseBadge    = pickRarityStyle(rarity).badge;
  const title        = safeText(entry.title);
  const image        = safeText(metadata.image_url);
  const type         = safeText(metadata.item_type);
  const attune       = !!metadata.attunement;
  const props        = safeText(metadata.properties);
  const content      = safeText(entry.content);
  const holder       = safeText(metadata.current_holder);
  const curse        = safeText(metadata.curse_description);
  const removeCurse  = safeText(metadata.remove_curse);
  return (
    <div className="max-w-sm mx-auto">
      <div className="relative rounded-lg overflow-hidden border-2 border-red-800 bg-[#1e1215] shadow-lg">
        <div
          className="absolute top-2 right-2 z-10 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded px-2 py-1 shadow-lg"
          style={{ transform: "rotate(4deg)" }}
        >
          ⚠️ Cursed
        </div>
        {image && (
          <div className="h-48 overflow-hidden">
            <img src={image} className="w-full h-full object-cover object-top" alt="" />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center justify-between mb-2 gap-2 pr-20">
            <h3 className="text-lg font-bold text-white truncate">{title}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded opacity-80 flex-shrink-0 ${baseBadge}`}>
              {rarity}
            </span>
          </div>
          {(type || attune) && (
            <p className="text-xs text-slate-400 italic mb-3">
              {type}{type && attune ? " " : ""}{attune ? "(requires attunement)" : ""}
            </p>
          )}
          {props && (
            <div className="text-sm text-slate-300 mb-3 whitespace-pre-wrap">{props}</div>
          )}
          {content && (
            <div className="border-t border-red-900/40 pt-3 mt-3">
              <p className="text-sm text-slate-400 italic whitespace-pre-wrap">{content}</p>
            </div>
          )}
          {curse && (
            <div className="border-t border-red-900/40 pt-3 mt-3">
              <p className="text-[10px] uppercase tracking-widest text-red-400 font-black mb-1">Curse</p>
              <p className="text-sm text-red-300 whitespace-pre-wrap">{curse}</p>
            </div>
          )}
          {removeCurse && (
            <div className="border-t border-red-900/40 pt-3 mt-3">
              <p className="text-[10px] uppercase tracking-widest text-red-400/80 font-bold mb-1">How to Remove</p>
              <p className="text-xs text-red-200/80 whitespace-pre-wrap">{removeCurse}</p>
            </div>
          )}
          {holder && (
            <p className="text-xs text-slate-500 mt-3">
              Currently held by: <span className="text-[#37F2D1]">{holder}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LostRelicTemplate({ entry, metadata }) {
  const rarity        = safeText(metadata.rarity) || "Common";
  const style         = pickRarityStyle(rarity);
  const title         = safeText(entry.title);
  const image         = safeText(metadata.image_url);
  const type          = safeText(metadata.item_type);
  const attune        = !!metadata.attunement;
  const props         = safeText(metadata.properties);
  const content       = safeText(entry.content);
  const lastLocation  = safeText(metadata.last_location);
  const cluesRaw      = safeText(metadata.clues);
  const clues = cluesRaw
    ? cluesRaw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [];
  return (
    <div className="max-w-sm mx-auto">
      <div className={`relative rounded-lg overflow-hidden border-2 shadow-lg ${style.border} ${style.bg}`}>
        {/* "Location unknown" watermark — low-opacity, rotated, pointer-events none
            so clicks still reach the card body. */}
        <span
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          aria-hidden
        >
          <span
            className="text-slate-400/10 text-4xl font-black tracking-[0.25em] uppercase whitespace-nowrap"
            style={{ transform: "rotate(-30deg)" }}
          >
            Location Unknown
          </span>
        </span>
        {image && (
          <div className="h-48 overflow-hidden">
            <img src={image} className="w-full h-full object-cover object-top opacity-90" alt="" />
          </div>
        )}
        <div className="p-5 relative z-10">
          <div className="flex items-center justify-between mb-2 gap-2">
            <h3 className="text-lg font-bold text-white truncate">{title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0 ${style.badge}`}>
              {rarity}
            </span>
          </div>
          {(type || attune) && (
            <p className="text-xs text-slate-400 italic mb-3">
              {type}{type && attune ? " " : ""}{attune ? "(requires attunement)" : ""}
            </p>
          )}
          {props && (
            <div className="text-sm text-slate-300 mb-3 whitespace-pre-wrap">{props}</div>
          )}
          {content && (
            <div className="border-t border-slate-700/50 pt-3 mt-3">
              <p className="text-sm text-slate-400 italic whitespace-pre-wrap">{content}</p>
            </div>
          )}
          {lastLocation && (
            <div className="mt-3 pt-3 border-t border-slate-700/40">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 flex items-center gap-1">
                <span aria-hidden>📍</span> Last Known Location
              </p>
              <p className="text-sm text-slate-300">{lastLocation}</p>
            </div>
          )}
          {clues.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/40">
              <p className="text-[10px] uppercase tracking-widest text-amber-400/80 font-bold mb-1">Clues</p>
              <ol className="list-decimal list-inside space-y-0.5 text-xs text-amber-200/80">
                {clues.map((clue, i) => (<li key={i}>{clue}</li>))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Factions ──────────────────────────────

function FactionProfileTemplate({ entry, metadata }) {
  const banner         = safeText(metadata.banner_url);
  const leaderPortrait = safeText(metadata.leader_portrait);
  const title          = safeText(entry.title);
  const alignment      = safeText(metadata.alignment);
  const status         = safeText(metadata.status);
  const leader         = safeText(metadata.leader);
  const content        = safeText(entry.content);
  const goals          = safeText(metadata.goals);
  const territory      = safeText(metadata.territory);
  const knownMembers   = safeText(metadata.known_members);
  const statusClass =
    status === "Active"    ? "bg-emerald-900/30 text-emerald-400" :
    status === "Secret"    ? "bg-purple-900/30 text-purple-400" :
    status === "Disbanded" ? "bg-red-900/30 text-red-400" :
    status                 ? "bg-amber-900/30 text-amber-400" :
    "";
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg overflow-hidden">
        {banner && (
          <div className="h-32 overflow-hidden">
            <img src={banner} className="w-full h-full object-cover object-top" alt="" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {leaderPortrait && (
              <img
                src={leaderPortrait}
                className="w-16 h-16 rounded-full border-2 border-slate-600 object-cover object-top flex-shrink-0"
                alt=""
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {alignment && (
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                    {alignment}
                  </span>
                )}
                {status && (
                  <span className={`text-xs px-2 py-0.5 rounded ${statusClass}`}>{status}</span>
                )}
              </div>
              {leader && (
                <p className="text-sm text-slate-400 mt-2">
                  Led by <span className="text-[#37F2D1]">{leader}</span>
                </p>
              )}
            </div>
          </div>

          {content && (
            <div className="mt-4 text-slate-300 whitespace-pre-wrap leading-relaxed">{content}</div>
          )}

          {goals && (
            <div className="mt-4 pt-4 border-t border-slate-700/30">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Goals</p>
              <p className="text-sm text-slate-300 whitespace-pre-line">{goals}</p>
            </div>
          )}
          {territory && (
            <div className="mt-4 pt-4 border-t border-slate-700/30">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Territory</p>
              <p className="text-sm text-slate-300">{territory}</p>
            </div>
          )}
          {knownMembers && (
            <div className="mt-4 pt-4 border-t border-slate-700/30">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Known Members</p>
              <p className="text-sm text-slate-400 whitespace-pre-line">{knownMembers}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Regions ───────────────────────────────

const DANGER_COLOR = {
  "Safe":     "text-emerald-400",
  "Low":      "text-teal-400",
  "Moderate": "text-amber-400",
  "High":     "text-orange-400",
  "Deadly":   "text-red-400",
};

function LocationTemplate({ entry, metadata }) {
  const cover        = safeText(metadata.cover_url);
  const title        = safeText(entry.title);
  const locationType = safeText(metadata.location_type);
  const population   = safeText(metadata.population);
  const climate      = safeText(metadata.climate);
  const danger       = safeText(metadata.danger_level);
  const content      = safeText(entry.content);
  const features     = safeText(metadata.notable_features);
  const dangers      = safeText(metadata.dangers);
  const connectedRaw = safeText(metadata.connected_locations);
  const connected = connectedRaw
    ? connectedRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const dangerClass = DANGER_COLOR[danger] || "text-slate-300";
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg overflow-hidden">
        {cover && (
          <div className="h-48 md:h-60 overflow-hidden relative">
            <img src={cover} className="w-full h-full object-cover object-top" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1f2e] via-transparent to-transparent" />
          </div>
        )}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <InfoCell label="Type"       value={locationType} />
            <InfoCell label="Population" value={population} />
            <InfoCell label="Climate"    value={climate} />
            <InfoCell label="Danger"     value={danger} valueClass={dangerClass} />
          </div>

          {content && (
            <div className="text-slate-300 whitespace-pre-wrap leading-relaxed mb-4">{content}</div>
          )}

          {features && (
            <div className="mt-4 pt-4 border-t border-slate-700/30">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Notable Features</p>
              <p className="text-sm text-slate-300 whitespace-pre-line">{features}</p>
            </div>
          )}

          {dangers && (
            <div className="mt-4 pt-4 border-t border-slate-700/30">
              <p className="text-xs text-red-400/70 uppercase tracking-wider mb-1">Dangers</p>
              <p className="text-sm text-slate-300 whitespace-pre-line">{dangers}</p>
            </div>
          )}

          {connected.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700/30">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Connected Locations</p>
              <div className="flex flex-wrap gap-1.5">
                {connected.map((name, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#050816] border border-slate-700 text-slate-300"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value, valueClass = "text-slate-200" }) {
  if (!value) return (
    <div className="bg-[#0f1219] border border-slate-700/50 rounded p-2">
      <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className="text-sm text-slate-600">—</div>
    </div>
  );
  return (
    <div className="bg-[#0f1219] border border-slate-700/50 rounded p-2">
      <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</div>
      <div className={`text-sm font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}

function LandmarkTemplate({ entry, metadata }) {
  const image        = safeText(metadata.image_url);
  const title        = safeText(entry.title);
  const content      = safeText(entry.content);
  const significance = safeText(metadata.significance);
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg overflow-hidden shadow-lg">
        {image ? (
          <div className="relative h-72 overflow-hidden">
            <img src={image} className="w-full h-full object-cover" alt="" />
            {/* Gradient fade that melts the bottom of the image into
                the card; the title floats over the fade. */}
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#1a1f2e] via-[#1a1f2e]/80 to-transparent" />
            <h2 className="absolute left-0 right-0 bottom-3 text-center text-2xl font-bold text-white px-4 drop-shadow-lg">
              {title}
            </h2>
          </div>
        ) : (
          <h2 className="text-2xl font-bold text-white p-5">{title}</h2>
        )}
        <div className="p-5 space-y-4">
          {content && (
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{content}</p>
          )}
          {significance && (
            <div className="pt-3 border-t border-slate-700/30">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Significance</p>
              <p className="text-sm text-slate-300 whitespace-pre-line">{significance}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MapNoteTemplate({ entry }) {
  const content = safeText(entry.content);
  const title   = safeText(entry.title);
  return (
    <div className="max-w-xs mx-auto">
      <div
        className="bg-amber-950/20 border border-amber-900/30 border-l-4 border-l-amber-600/50 rounded p-3 shadow-md"
        style={{ transform: "rotate(-1.5deg)" }}
      >
        {title && (
          <p className="text-[10px] uppercase tracking-widest text-amber-400/70 font-bold mb-1">
            {title}
          </p>
        )}
        <p className="text-sm text-amber-100/90 whitespace-pre-wrap leading-snug">{content}</p>
      </div>
    </div>
  );
}

// ─────────────────────────── Religion ──────────────────────────────

function DeityProfileTemplate({ entry, metadata }) {
  const image     = safeText(metadata.image_url);
  const title     = safeText(entry.title);
  const alignment = safeText(metadata.alignment);
  const content   = safeText(entry.content);
  const symbols   = safeText(metadata.symbols);
  const sects     = safeText(metadata.sects);

  // Domains land as an array from the tags field, but tolerate legacy
  // string / object shapes too.
  const domains = Array.isArray(metadata.domains)
    ? metadata.domains.map((d) => safeText(d)).filter(Boolean)
    : (safeText(metadata.domains) || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  // Commandments rendered one-per-line, split at line breaks.
  const commandmentsRaw = safeText(metadata.commandments);
  const commandments = commandmentsRaw
    ? commandmentsRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    : [];

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-[#1a1814] border border-amber-900/30 rounded-lg p-6 shadow-lg">
        <div className="flex flex-col items-center">
          {image ? (
            <img
              src={image}
              alt=""
              className="w-24 h-24 rounded-full object-cover object-top border-2 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#050816] border-2 border-amber-500/30 flex items-center justify-center text-amber-400/60 text-3xl">
              ✦
            </div>
          )}
          <h2 className="text-2xl font-black text-amber-100 mt-3 text-center">{title}</h2>
          {alignment && (
            <span className="mt-2 text-[10px] uppercase tracking-widest text-amber-400/70 bg-amber-900/20 border border-amber-700/40 rounded px-2 py-0.5">
              {alignment}
            </span>
          )}
          {domains.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center mt-3">
              {domains.map((d, i) => (
                <span
                  key={i}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#37F2D1]/10 text-[#37F2D1] border border-[#37F2D1]/30"
                >
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>

        {content && (
          <div className="mt-5 text-slate-300 whitespace-pre-wrap leading-relaxed">{content}</div>
        )}

        {commandments.length > 0 && (
          <div className="mt-5 pt-4 border-t border-amber-900/20">
            <p className="text-[10px] uppercase tracking-widest text-amber-400/80 font-black mb-2">
              Commandments
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-200 marker:text-amber-400 marker:font-bold">
              {commandments.map((c, i) => (<li key={i}>{c}</li>))}
            </ol>
          </div>
        )}

        {symbols && (
          <div className="mt-4 pt-4 border-t border-amber-900/20">
            <p className="text-[10px] uppercase tracking-widest text-amber-400/60 font-bold mb-1">Sacred Symbols</p>
            <p className="text-sm text-slate-300">{symbols}</p>
          </div>
        )}

        {sects && (
          <p className="mt-3 text-[11px] text-amber-200/60 italic text-center">
            Associated sects: {sects}
          </p>
        )}
      </div>
    </div>
  );
}

function PrayerTemplate({ entry, metadata }) {
  const content     = safeText(entry.content);
  const attribution = safeText(metadata.attribution);
  const deity       = safeText(metadata.deity);
  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-[#1a1918] border border-amber-900/20 rounded-lg p-8 shadow-lg">
        <div className="border-t border-amber-700/30 w-24 mx-auto mb-6" />
        {content && (
          <p className="text-base text-amber-50/90 leading-loose text-center whitespace-pre-wrap italic">
            {content}
          </p>
        )}
        <div className="border-t border-amber-700/30 w-24 mx-auto mt-6" />
        {(attribution || deity) && (
          <div className="mt-4 text-right text-[11px] text-amber-200/60 italic">
            {attribution && <p>— {attribution}</p>}
            {deity && <p className="mt-0.5">From the teachings of {deity}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function HolySiteTemplate({ entry, metadata }) {
  const cover            = safeText(metadata.cover_url);
  const title            = safeText(entry.title);
  const deity            = safeText(metadata.deity);
  const content          = safeText(entry.content);
  const significance     = safeText(metadata.significance);
  const pilgrimageNotes  = safeText(metadata.pilgrimage_notes);
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-[#1a1814] border border-amber-600/30 rounded-lg overflow-hidden shadow-lg">
        {cover && (
          <div className="h-48 md:h-60 overflow-hidden relative">
            <img src={cover} className="w-full h-full object-cover" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a1814] via-transparent to-transparent" />
          </div>
        )}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-amber-100">{title}</h2>
          {deity && (
            <p className="text-sm text-amber-300/80 italic mt-1">
              <span aria-hidden className="mr-1">✦</span> Sacred to {deity}
            </p>
          )}

          {content && (
            <div className="mt-4 text-slate-300 whitespace-pre-wrap leading-relaxed">{content}</div>
          )}

          {significance && (
            <div className="mt-4 pt-4 border-t border-amber-900/20">
              <p className="text-[10px] uppercase tracking-widest text-amber-400/70 font-bold mb-1">
                Religious Significance
              </p>
              <p className="text-sm text-slate-300 whitespace-pre-line">{significance}</p>
            </div>
          )}
          {pilgrimageNotes && (
            <div className="mt-4 pt-4 border-t border-amber-900/20">
              <p className="text-[10px] uppercase tracking-widest text-amber-400/70 font-bold mb-1">
                Pilgrimage Notes
              </p>
              <p className="text-sm text-slate-300 whitespace-pre-line">{pilgrimageNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── History ───────────────────────────────

function HistoricalEventTemplate({ entry, metadata }) {
  const date         = safeText(metadata.date);
  const era          = safeText(metadata.era);
  const title        = safeText(entry.title);
  const content      = safeText(entry.content);
  const consequences = safeText(metadata.consequences);

  const keyFigures = Array.isArray(metadata.key_figures)
    ? metadata.key_figures.map((f) => safeText(f)).filter(Boolean)
    : (safeText(metadata.key_figures) || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6">
        <div className="flex items-start gap-4 flex-wrap">
          {(date || era) && (
            <div className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 flex-shrink-0">
              {date && <div className="text-sm font-bold text-white leading-tight">{date}</div>}
              {era && <div className="text-[10px] uppercase tracking-widest text-slate-400 leading-tight">{era}</div>}
            </div>
          )}
          <h2 className="flex-1 min-w-[200px] text-2xl font-bold text-white">{title}</h2>
        </div>

        {content && (
          <div className="mt-4 text-slate-300 whitespace-pre-wrap leading-relaxed">{content}</div>
        )}

        {keyFigures.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Key Figures</p>
            <div className="flex flex-wrap gap-1.5">
              {keyFigures.map((f, i) => (
                <span
                  key={i}
                  className="text-xs bg-[#37F2D1]/10 text-[#37F2D1] rounded px-2 py-0.5 border border-[#37F2D1]/30"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {consequences && (
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Consequences</p>
            <div className="border-l-2 border-amber-600/40 pl-3 text-sm text-slate-300 whitespace-pre-line">
              {consequences}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EraSummaryTemplate({ entry, metadata }) {
  const title     = safeText(entry.title);
  const startDate = safeText(metadata.start_date);
  const endDate   = safeText(metadata.end_date);
  const content   = safeText(entry.content);

  const definingEvents = safeText(metadata.defining_events)
    ? safeText(metadata.defining_events).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    : [];

  const majorFigures = Array.isArray(metadata.major_figures)
    ? metadata.major_figures.map((f) => safeText(f)).filter(Boolean)
    : (safeText(metadata.major_figures) || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const range = [startDate, endDate].filter(Boolean).join(" — ");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6">
        <h2 className="text-3xl font-black text-white">{title}</h2>
        {range && (
          <p className="text-sm text-slate-400 italic mt-1">{range}</p>
        )}

        {content && (
          <div className="mt-4 text-slate-300 whitespace-pre-wrap leading-relaxed">{content}</div>
        )}

        {definingEvents.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-700/30">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Defining Events</p>
            <ol className="border-l-2 border-slate-600 pl-4 space-y-2">
              {definingEvents.map((e, i) => (
                <li key={i} className="relative text-sm text-slate-300">
                  <span
                    className="absolute -left-[22px] top-1.5 w-2 h-2 rounded-full bg-slate-400"
                    aria-hidden
                  />
                  {e}
                </li>
              ))}
            </ol>
          </div>
        )}

        {majorFigures.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-700/30">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Major Figures</p>
            <div className="flex flex-wrap gap-1.5">
              {majorFigures.map((f, i) => (
                <span
                  key={i}
                  className="text-xs bg-[#37F2D1]/10 text-[#37F2D1] rounded px-2 py-0.5 border border-[#37F2D1]/30"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BattleReportTemplate({ entry, metadata }) {
  const force1       = safeText(metadata.force_1);
  const force2       = safeText(metadata.force_2);
  const location     = safeText(metadata.location);
  const date         = safeText(metadata.date);
  const title        = safeText(entry.title);
  const content      = safeText(entry.content);
  const outcome      = safeText(metadata.outcome);
  const casualties   = safeText(metadata.casualties);
  const significance = safeText(metadata.significance);

  const outcomeLower = outcome.toLowerCase();
  const outcomeClass =
    /victory|won|triumph/.test(outcomeLower) ? "bg-emerald-900/30 text-emerald-400 border-emerald-700/50" :
    /defeat|lost|rout/.test(outcomeLower)    ? "bg-red-900/30 text-red-400 border-red-700/50" :
    /draw|stalemate|pyrrhic/.test(outcomeLower) ? "bg-amber-900/30 text-amber-400 border-amber-700/50" :
    "bg-slate-700 text-slate-300 border-slate-600";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6">
        <h2 className="text-2xl font-black text-white text-center mb-3">{title}</h2>

        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center mb-4">
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Force 1</p>
            <p className="text-sm font-bold text-white">{force1 || "—"}</p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 border border-slate-700 rounded px-2 py-0.5">vs</span>
          <div className="text-left">
            <p className="text-xs text-slate-500 uppercase tracking-widest">Force 2</p>
            <p className="text-sm font-bold text-white">{force2 || "—"}</p>
          </div>
        </div>

        {(location || date) && (
          <p className="text-xs text-slate-400 text-center italic mb-5">
            {[location, date].filter(Boolean).join(" · ")}
          </p>
        )}

        {content && (
          <div className="text-slate-300 whitespace-pre-wrap leading-relaxed mb-5">{content}</div>
        )}

        {outcome && (
          <div className="flex justify-center my-4">
            <span className={`inline-block px-3 py-1 rounded border text-sm font-bold uppercase tracking-wider ${outcomeClass}`}>
              {outcome}
            </span>
          </div>
        )}

        {casualties && (
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Casualties</p>
            <p className="text-sm text-slate-300 whitespace-pre-line">{casualties}</p>
          </div>
        )}

        {significance && (
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Significance</p>
            <p className="text-sm text-slate-300 whitespace-pre-line">{significance}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Political ─────────────────────────────

function PoliticalDecreeTemplate({ entry, metadata }) {
  const authority = safeText(metadata.authority);
  const title     = safeText(entry.title);
  const date      = safeText(metadata.date);
  const content   = safeText(entry.content);
  const seal      = safeText(metadata.seal);
  const penalties = safeText(metadata.penalties);
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[#1a1f2e] border border-slate-700/50 border-l-4 border-l-amber-700/50 rounded-lg overflow-hidden">
        <div className="border-t-4 border-double border-amber-700/30" />
        <div className="p-6">
          {authority && (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-400/60 text-center">
                By Order of
              </p>
              <p className="text-xl font-black text-amber-100 text-center mt-1">{authority}</p>
            </>
          )}
          <h2 className="text-lg font-bold text-white text-center mt-4">{title}</h2>

          {content && (
            <div className="mt-5 text-slate-200 whitespace-pre-wrap leading-relaxed">{content}</div>
          )}

          {penalties && (
            <div className="mt-5 pt-4 border-t border-red-900/30">
              <p className="text-[10px] uppercase tracking-widest text-red-400/80 font-bold mb-1">
                Penalties for Violation
              </p>
              <p className="text-sm text-red-300/90 whitespace-pre-line">{penalties}</p>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
            {seal ? (
              <p className="text-[11px] text-amber-200/60 italic">
                <span aria-hidden className="mr-1">⚜</span> Sealed: {seal}
              </p>
            ) : <span />}
            {date && (
              <p className="text-[11px] text-slate-400 italic">{date}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TreatyTemplate({ entry, metadata }) {
  const party1       = safeText(metadata.party_1);
  const party2       = safeText(metadata.party_2);
  const party1Crest  = safeText(metadata.party_1_crest);
  const party2Crest  = safeText(metadata.party_2_crest);
  const title        = safeText(entry.title);
  const content      = safeText(entry.content);
  const status       = safeText(metadata.status);
  const date         = safeText(metadata.date);

  const statusClass =
    status === "Active"  ? "bg-emerald-900/30 text-emerald-400 border-emerald-700/50" :
    status === "Broken"  ? "bg-red-900/30 text-red-400 border-red-700/50" :
    status === "Pending" ? "bg-amber-900/30 text-amber-400 border-amber-700/50" :
    status === "Expired" ? "bg-slate-700 text-slate-400 border-slate-600" :
    "bg-slate-700 text-slate-300 border-slate-600";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[#1a1f2e] border border-slate-700/50 rounded-lg p-6">
        {title && (
          <h2 className="text-xl font-black text-white text-center mb-4">{title}</h2>
        )}

        <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center mb-4">
          <div className="flex flex-col items-center text-center gap-2">
            {party1Crest ? (
              <img
                src={party1Crest}
                alt=""
                className="w-16 h-16 rounded-full border-2 border-slate-600 object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#050816] border-2 border-slate-700" />
            )}
            <p className="text-sm font-bold text-white">{party1 || "—"}</p>
          </div>
          <div className="flex flex-col items-center text-slate-500">
            <span className="text-xl" aria-hidden>🤝</span>
            <span className="text-[10px] uppercase tracking-widest mt-1">Treaty</span>
          </div>
          <div className="flex flex-col items-center text-center gap-2">
            {party2Crest ? (
              <img
                src={party2Crest}
                alt=""
                className="w-16 h-16 rounded-full border-2 border-slate-600 object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#050816] border-2 border-slate-700" />
            )}
            <p className="text-sm font-bold text-white">{party2 || "—"}</p>
          </div>
        </div>

        {status && (
          <div className="flex justify-center my-4">
            <span className={`inline-block px-3 py-1 rounded border text-xs font-bold uppercase tracking-wider ${statusClass}`}>
              {status}
            </span>
          </div>
        )}

        {content && (
          <div className="mt-4 pt-4 border-t border-slate-700/30 text-slate-300 whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        )}

        {date && (
          <p className="mt-5 text-right text-[11px] text-slate-400 italic">Signed: {date}</p>
        )}
      </div>
    </div>
  );
}
