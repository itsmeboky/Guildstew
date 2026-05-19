// PF2e character subline: "Level N · <Heritage or Ancestry> · Class · Background".
//
// Heritage names overwhelmingly carry their ancestry as a suffix
// ("Seer Elf", "Cliffscale Lizardfolk", "Versatile Human") so
// rendering both heritage AND ancestry produces the duplicated
// "Seer Elf Elf" / "Cliffscale Lizardfolk Lizardfolk" symptom. When
// a heritage exists, show only the heritage name; otherwise fall
// back to ancestry. The few heritages that don't carry the ancestry
// suffix (Awakened Animal's "Climbing Animal", Ratfolk's "Deep Rat")
// still read fine on their own — PF2e UX convention is that the
// heritage name implies the ancestry.

export function formatCharacterSubline({ level, heritage, ancestry, cls, subclass, background }) {
  const headline = heritage?.name
    || ancestry?.name
    || 'Ancestry';
  const parts = [
    `Level ${level || 1}`,
    headline,
    subclass?.name || cls?.name || 'Class',
    background?.name || 'Background',
  ].filter(Boolean);
  return parts.join(' · ');
}
