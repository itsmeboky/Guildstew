// Spec-mandated import path (`src/config/legendTitles.js`). The
// actual catalog lives at `src/data/legendTitles.js` alongside the
// other content-definition modules; this shim just re-exports the
// public surface so either path resolves to the same exports.
export {
  LEGEND_TITLES,
  LEGEND_CATEGORIES,
  AUTO_RUMOR_TEMPLATES,
  titleById,
  evaluateTitles,
  buildTitleRumor,
  getProgress,
} from "@/data/legendTitles";
