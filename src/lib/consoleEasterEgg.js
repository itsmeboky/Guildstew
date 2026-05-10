/**
 * Console easter egg — fires once on app load.
 * Visible to anyone who opens DevTools.
 *
 * Free recruitment marketing for the technical audience that
 * inspects pages. Companies like Slack, Stripe, Airbnb do similar.
 *
 * The CSS payload uses %c with a single declaration so the entire
 * ASCII block renders in the same purple monospace style; without
 * font-family:monospace the box-drawing characters and the goblin
 * art collapse into proportional-font misalignment.
 */
export function logHiringMessage() {
  if (typeof window === "undefined" || typeof console === "undefined") return;

  console.log(
    `%c
                555555555555555555
            55555555555555555555555555
        555555555555555555555555555555
     55555555555555   555555555555555555
   55555555555           555555555555555
   5555555555555       555555555555555554
   55555555555555555555555555555555555555
   555555555555555555555   5555555555555
     55555555555555555555555555555555555
       45555555555555555555555555555555
            5555555555555555555555554
                5555555555555555
██╗    ██╗███████╗    █████╗ ██████╗ ███████╗
██║    ██║██╔════╝   ██╔══██╗██╔══██╗██╔════╝
██║ █╗ ██║█████╗     ███████║██████╔╝█████╗
██║███╗██║██╔══╝     ██╔══██║██╔══██╗██╔══╝
╚███╔███╔╝███████╗   ██║  ██║██║  ██║███████╗
 ╚══╝╚══╝ ╚══════╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
██╗  ██╗██╗██████╗ ██╗███╗   ██╗ ██████╗ ██╗
██║  ██║██║██╔══██╗██║████╗  ██║██╔════╝ ██║
███████║██║██████╔╝██║██╔██╗ ██║██║  ███╗██║
██╔══██║██║██╔══██╗██║██║╚██╗██║██║   ██║╚═╝
██║  ██║██║██║  ██║██║██║ ╚████║╚██████╔╝██╗
╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝

Aetherian Studios is looking for creative weirdos,
world-builders, problem-solvers, and people who know
that "just one more feature" is both a lie and a lifestyle.

Build weird. Build bold. Build worlds.

📧 info@aetherianstudios.com
`,
    "color:#a855f7; font-family:monospace; font-size:13px; font-weight:bold;",
  );
}
