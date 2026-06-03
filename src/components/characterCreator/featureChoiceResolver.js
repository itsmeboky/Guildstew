// Render-time resolution of character-dependent feature choices.
//
// classFeatures.js bakes in static `choices` for most pickers, but a few
// depend on the live character and can't be precomputed in the data
// module:
//   • Eldritch Invocations — each invocation's SRD prerequisite (minimum
//     warlock level, required Pact Boon, required cantrip) must be
//     checked against THIS character; ineligible ones are hidden.
//   • Champion's Additional Fighting Style (level 10) — gated to the
//     Champion subclass and must exclude the style already chosen at
//     level 1.
//
// This keeps the persistence path untouched: the picker still reads/writes
// feature_choices exactly as Metamagic does. Only the option *list* is
// narrowed here.

/**
 * Is an invocation selectable for this character?
 * @param prereq normalized prerequisite { level?, pactBoon?, cantrip? }
 * @param ctx    { classLevel, pactBoon, knownCantrips }
 */
export function isInvocationEligible(prereq, ctx) {
  if (!prereq) return true;
  if (typeof prereq.level === 'number' && (Number(ctx.classLevel) || 0) < prereq.level) {
    return false;
  }
  if (prereq.pactBoon && ctx.pactBoon !== prereq.pactBoon) {
    return false;
  }
  if (prereq.cantrip && !(ctx.knownCantrips || []).includes(prereq.cantrip)) {
    return false;
  }
  return true;
}

/**
 * Narrow each feature's `choices` to what this character can actually
 * pick. Features without dynamic markers pass through untouched. A
 * Champion-gated feature on a non-Champion is demoted to a plain
 * descriptive feature (choiceRequired stripped) so it neither renders a
 * picker nor blocks the advisory completion banner.
 *
 * @param features    array from getClassFeaturesForLevel
 * @param characterData the in-progress character
 * @param classLevel  the class level features are computed at
 */
export function resolveFeatureChoices(features, characterData, classLevel) {
  if (!Array.isArray(features)) return [];
  const cd = characterData || {};
  const pactBoon = cd.feature_choices?.['Warlock-3-Pact Boon'] || null;
  const knownCantrips = cd.spells?.cantrips || [];
  const priorFightingStyle = cd.feature_choices?.[`${cd.class}-1-Fighting Style`] || null;

  return features.map((f) => {
    // Eldritch Invocations — filter by per-invocation prerequisites.
    if (f.prereqFiltered && Array.isArray(f.choices)) {
      const choices = f.choices.filter((c) =>
        isInvocationEligible(c.prerequisite, { classLevel, pactBoon, knownCantrips }),
      );
      return { ...f, choices };
    }

    // Subclass-gated picker (Champion's Additional Fighting Style).
    if (f.requiresSubclass) {
      if (cd.subclass !== f.requiresSubclass) {
        // Demote to descriptive — no picker, not a required choice.
        const rest = { ...f };
        delete rest.choiceRequired;
        delete rest.choices;
        delete rest.requiresSubclass;
        delete rest.excludePriorStyle;
        return rest;
      }
      let choices = Array.isArray(f.choices) ? f.choices : [];
      if (f.excludePriorStyle && priorFightingStyle) {
        choices = choices.filter((c) => (c?.name || c) !== priorFightingStyle);
      }
      return { ...f, choices };
    }

    return f;
  });
}
