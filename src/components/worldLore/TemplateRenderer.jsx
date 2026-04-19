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

    // Not yet implemented (shipped in Part 2B/2C) — render as freeform
    // so the switch already lists every template_type; each later
    // commit replaces a single fallback branch with its real renderer.
    case "artifact_card":
    case "cursed_item":
    case "lost_relic":
    case "faction_profile":
    case "location":
    case "landmark":
    case "map_note":
    case "deity_profile":
    case "prayer":
    case "holy_site":
    case "historical_event":
    case "era_summary":
    case "battle_report":
    case "political_decree":
    case "treaty":
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
