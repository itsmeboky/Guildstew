// Highest spell rank by character level (simplified per PF2e standard).
// Verbatim from the prototype.

const HIGHEST_SPELL_RANK = (level) => Math.min(10, Math.ceil(level / 2));

export default HIGHEST_SPELL_RANK;
