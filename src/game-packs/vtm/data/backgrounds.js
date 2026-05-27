// V5 backgrounds — what the corebook calls Advantages. The
// Connections step (StepAdvantages) renders one card per row and
// the player allocates dots between them. Some predator types also
// grant background dots directly (Contact, Herd, Resources, Fame,
// Mawla, Status) — see rules/predatorBonuses.js for the auto-apply
// step on advance from Step VI.

export const BACKGROUNDS = [
  { id: 'allies',    name: 'Allies',    desc: 'Mortals willing to bleed for you.' },
  { id: 'contacts',  name: 'Contacts',  desc: 'People who answer your calls.' },
  { id: 'fame',      name: 'Fame',      desc: 'Mortal recognition. Useful and dangerous.' },
  { id: 'haven',     name: 'Haven',     desc: 'Where you sleep through the day.' },
  { id: 'herd',      name: 'Herd',      desc: 'A reliable feeding pool.' },
  { id: 'influence', name: 'Influence', desc: 'Pull in mortal institutions.' },
  { id: 'mask',      name: 'Mask',      desc: 'Your false identity.' },
  { id: 'mawla',     name: 'Mawla',     desc: 'A Kindred mentor.' },
  { id: 'resources', name: 'Resources', desc: 'Money. Always money.' },
  { id: 'retainers', name: 'Retainers', desc: 'Servants who know what you are.' },
  { id: 'status',    name: 'Status',    desc: 'Camarilla or Anarch standing.' },
];
