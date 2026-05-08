/**
 * getSilhouetteImage — return a placeholder portrait/silhouette URL for
 * a character based on type + gender.
 *
 * Adopted from GMPanel as canonical in the Phase 1 cleanup pass; it's a
 * strict superset of the simpler version that previously lived in
 * CampaignPlayerPanel. Player-side characters with non-standard data
 * shapes (e.g. `gender` empty but `appearance.gender` set, or values
 * like "woman" instead of "female") now resolve to the correct gendered
 * silhouette instead of falling back to neutral default.
 *
 * Forward-compatible with the planned character creator gender dropdown
 * (`male` / `female` / `non-binary` canonical values are handled
 * directly; defensive paths protect against legacy data shapes during
 * any transition).
 *
 * Resolution order:
 *   1. No character → neutral default
 *   2. character.type === 'monster' → monster silhouette
 *   3. Look up gender from character.gender, falling back to
 *      character.appearance.gender (handles legacy / partial data)
 *   4. Match against keyword sets:
 *      - female / woman / 'f'    → female silhouette
 *      - non-binary variants     → neutral default
 *      - male / man / 'm'        → male silhouette
 *   5. Anything else / nothing matched → neutral default
 */
export default function getSilhouetteImage(character) {
  if (!character) return 'https://static.wixstatic.com/media/5cdfd8_35e9f29559bd43239470a098001a1fe5~mv2.png';

  if (character.type === 'monster') {
    return 'https://static.wixstatic.com/media/5cdfd8_c201364be8ad40aa9518230a106c8442~mv2.png';
  }

  const gender = (character.gender || character.appearance?.gender || '').toLowerCase();

  if (gender.includes('female') || gender.includes('woman') || gender === 'f') {
    return 'https://static.wixstatic.com/media/5cdfd8_95e7b63afc9a444e97bbadc37e59b154~mv2.png';
  } else if (gender.includes('non-binary') || gender.includes('nonbinary') || gender.includes('enby') || gender.includes('nb') || gender.includes('agender') || gender.includes('genderfluid') || gender.includes('other')) {
    return 'https://static.wixstatic.com/media/5cdfd8_35e9f29559bd43239470a098001a1fe5~mv2.png';
  } else if (gender.includes('male') || gender.includes('man') || gender === 'm') {
    return 'https://static.wixstatic.com/media/5cdfd8_8b8fc7ed62dd4c74927bfee94c031e7d~mv2.png';
  }

  return 'https://static.wixstatic.com/media/5cdfd8_35e9f29559bd43239470a098001a1fe5~mv2.png';
}
