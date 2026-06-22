// Routes a character record to the right per-pack detail renderer.
// Looks up the pack via the registry's `detailComponent` field and
// lazy-loads the corresponding component so non-active packs don't
// bloat the library bundle.
//
// D&D 5e currently has no extracted detail component — its detail
// view still lives inline in src/pages/CharacterLibrary.jsx pending
// the H.4 full extraction. The library page short-circuits the
// dispatcher for D&D characters and renders inline; the dispatcher
// only fires for non-D&D packs today. Once the D&D detail is
// extracted, callers can route every character through here.

import React, { Suspense, lazy } from "react";
import { getCatalogEntry, listGamePacks } from "@/game-packs";
import UnknownGamePackError from "./UnknownGamePackError";

// Static lazy imports — Vite needs these at build time, not runtime
// strings, so we can't compute them from registry data alone.
const DETAIL_COMPONENTS = {
  PathfinderCharacterDetail: lazy(() =>
    import("@/game-packs/pf2e").then((m) => ({ default: m.CharacterSheet })),
  ),
  VTMCharacterDetail: lazy(() =>
    import("@/game-packs/vtm").then((m) => ({ default: m.CharacterDetail })),
  ),
  // Dnd5eCharacterDetail: pending extraction from CharacterLibrary
};

export default function CharacterDetailDispatcher({ character, onEdit, onDelete }) {
  const pack = getCatalogEntry(character?.game_pack);

  if (!pack) {
    const validSlugs = listGamePacks({ status: "available" }).map((p) => p.id);
    return <UnknownGamePackError slug={character?.game_pack} validSlugs={validSlugs} />;
  }

  const Component = DETAIL_COMPONENTS[pack.detailComponent];
  if (!Component) {
    return (
      <UnknownGamePackError
        slug={character?.game_pack}
        validSlugs={Object.keys(DETAIL_COMPONENTS)}
        reason={`No detail renderer registered for "${pack.detailComponent}". The pack is recognized but its sheet hasn't been wired up yet.`}
      />
    );
  }

  return (
    <Suspense fallback={<DetailLoading pack={pack} />}>
      <Component character={character} pack={pack} onEdit={onEdit} onDelete={onDelete} />
    </Suspense>
  );
}

function DetailLoading({ pack }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-pulse text-pf-brass font-display text-sm tracking-[0.2em] uppercase">
          Loading {pack.shortName || pack.short || pack.name} sheet…
        </div>
      </div>
    </div>
  );
}
