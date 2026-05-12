import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";

/**
 * Open-content attribution page. Required by CC-BY 4.0 for the SRD
 * data shipped under the 2014 and 2024 game packs, and a courtesy
 * acknowledgment for the open dataset projects we adapt the JSON
 * from.
 *
 * Routed at `/attributions` (see App.jsx) and linked from the
 * site-wide LegalFooter.
 */

function Section({ title, children }) {
  return (
    <section className="bg-[#1E2430] rounded-xl p-6 border border-[#2A3441] mb-6">
      <h2 className="text-xl font-bold text-[#37F2D1] mb-3">{title}</h2>
      <div className="text-slate-200 text-sm leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function ExtLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#37F2D1] hover:underline inline-flex items-center gap-1"
    >
      {children}
      <ExternalLink className="w-3 h-3" />
    </a>
  );
}

export default function Attributions() {
  return (
    <div className="min-h-screen bg-[#0f1219] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-[#37F2D1]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-[#37F2D1] mb-2">
          Open Content Attributions
        </h1>
        <p className="text-slate-400 mb-8 text-sm">
          Guildstew ships open-content game data licensed under
          Creative Commons. This page lists each upstream source and
          the license under which we redistribute their work, as
          required by those licenses.
        </p>

        <Section title="D&D 5e — System Reference Document 5.1 (2014 edition)">
          <p>
            The 2014 game pack uses content from the System Reference
            Document 5.1, licensed by Wizards of the Coast LLC under
            the Creative Commons Attribution 4.0 International License
            (CC-BY 4.0).
          </p>
          <p>
            <span className="font-semibold">Title:</span>{" "}
            System Reference Document 5.1
            <br />
            <span className="font-semibold">Copyright:</span>{" "}
            © 2023 Wizards of the Coast LLC
            <br />
            <span className="font-semibold">License:</span>{" "}
            <ExtLink href="https://creativecommons.org/licenses/by/4.0/legalcode">
              CC-BY 4.0
            </ExtLink>
          </p>
          <p>
            Available from Wizards of the Coast at{" "}
            <ExtLink href="https://www.dndbeyond.com/srd">
              dndbeyond.com/srd
            </ExtLink>
            .
          </p>
        </Section>

        <Section title="D&D 5e — System Reference Document 5.2 (2024 edition)">
          <p>
            The 2024 game pack uses content from the System Reference
            Document 5.2, also licensed by Wizards of the Coast LLC
            under CC-BY 4.0.
          </p>
          <p>
            <span className="font-semibold">Title:</span>{" "}
            System Reference Document 5.2
            <br />
            <span className="font-semibold">Copyright:</span>{" "}
            © 2025 Wizards of the Coast LLC
            <br />
            <span className="font-semibold">License:</span>{" "}
            <ExtLink href="https://creativecommons.org/licenses/by/4.0/legalcode">
              CC-BY 4.0
            </ExtLink>
          </p>
          <p>
            Available from Wizards of the Coast at{" "}
            <ExtLink href="https://www.dndbeyond.com/srd">
              dndbeyond.com/srd
            </ExtLink>
            .
          </p>
          <p className="text-slate-400 text-xs italic">
            Note: where the 2024 SRD JSON shipped by upstream datasets
            is incomplete (e.g. the 2024 spell list isn't yet packaged
            as inline JSON), Guildstew uses the 2014 SRD as a stopgap
            base and applies a documented override layer for revisions.
            All such content remains under CC-BY 4.0 with the
            attribution chain above.
          </p>
        </Section>

        <Section title="5e-bits / 5e-database (JSON adapter)">
          <p>
            The structured JSON files we read for species, classes,
            backgrounds, feats, equipment, and other tables come from
            the 5e-bits / 5e-database open dataset project, which
            redistributes the SRD content above in machine-readable
            form.
          </p>
          <p>
            <span className="font-semibold">Project:</span>{" "}
            <ExtLink href="https://github.com/5e-bits/5e-database">
              5e-bits/5e-database on GitHub
            </ExtLink>
            <br />
            <span className="font-semibold">License:</span>{" "}
            CC-BY 4.0 (inherited from the underlying SRD)
          </p>
        </Section>

        <Section title="What's hand-authored vs. SRD-derived">
          <p>
            Game mechanics described in Guildstew — spell-slot tables,
            prepared-spell counts, class-feature scaling, weapon
            mastery slot counts — are not copyrightable game rules; we
            implement them as plain code, not redistributed text.
          </p>
          <p>
            Where we surface a feature, spell, class, species, or
            background name in the UI, that name comes directly from
            the SRD JSON files cited above. Content that lives only in
            the Player's Handbook is intentionally not shipped — both
            because the OGL/SRD doesn't license it and because we
            don't want to substitute our own paraphrase for the
            authoritative source.
          </p>
          <p>
            UI commentary like subclass &ldquo;Best For&rdquo;
            recommendations, info-tip prose, and step instructions is
            original work by Guildstew and not under CC-BY.
          </p>
        </Section>

        <Section title="Trademarks">
          <p>
            Dungeons &amp; Dragons, D&amp;D, the dragon ampersand, and
            related trademarks are property of Wizards of the Coast
            LLC. Guildstew is not affiliated with, endorsed, sponsored,
            or specifically approved by Wizards of the Coast LLC.
          </p>
        </Section>

        <p className="text-slate-500 text-xs text-center mt-8">
          Find an error or missing attribution? Email us via the
          support link in the app — we want this page to stay current.
        </p>
      </div>
    </div>
  );
}
