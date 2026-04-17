import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Plain-language summary of the privacy policy. Linked from the
 * footer + Settings → Privacy & Legal so users can skim what
 * Guildstew actually does with their data without wading through
 * the Termly viewer.
 */
export default function PrivacySummary() {
  return (
    <div className="min-h-screen bg-[#0f1219] text-white p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-2">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-[#37F2D1]">
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
        </div>
        <h1 className="text-2xl font-heading text-[#37F2D1]">How Guildstew Uses Your Data</h1>
        <p className="text-slate-400">
          Here's the short version. For the full legal details, see our complete policies linked
          below.
        </p>

        <Section title="📋 Information We Collect" items={[
          "Account data (email, username, date of birth)",
          "Gameplay data (dice rolls, combat stats, character data)",
          "Usage data (features used, session duration)",
          "Content you create (characters, homebrew, marketplace uploads)",
        ]} />

        <Section title="🔧 How We Use Your Data" items={[
          "To provide and improve the service",
          "To power features like P.I.E. Chart and Achievements",
          "To analyze gameplay trends (aggregated, anonymized)",
          "To communicate with you about your account",
        ]} />

        <Section title="👥 Data Shared with Other Users" items={[
          "Character data visible to campaign party members",
          "Marketplace content visible to all users",
          "Profile information visible based on your privacy settings",
        ]} />

        <Section title="🛡️ Minor Safety (Under 18)" items={[
          "Guildstew takes the safety of minors seriously",
          "Age-restricted marketplace content is hidden from minor accounts",
          "Users must be at least 13 years old to create an account",
        ]} />

        <Section title="🗑️ Data Retention & Deletion" items={[
          "Account deletion removes personal data within 30 days",
          "Anonymized gameplay statistics may be retained",
        ]} />

        <Section title="🔗 Third-Party Services" items={[
          "Stripe (payments)",
          "Supabase (data storage)",
          "Anthropic / Replicate (AI generation — prompts are not stored)",
        ]} />

        <Section title="✅ Your Rights" items={[
          "Access, correct, or delete your data",
          "Opt out of analytics",
          "Export your data",
        ]} />

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">📧 Contact</h2>
          <p className="text-slate-300">support@guildstew.com</p>
        </section>

        <div className="border-t border-slate-700 pt-6 mt-8">
          <p className="text-slate-400 mb-3">For complete legal details:</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/Privacy" className="text-[#37F2D1] hover:underline">Full Privacy Policy</Link>
            <Link to="/Terms" className="text-[#37F2D1] hover:underline">Terms of Service</Link>
            <Link to="/EULA" className="text-[#37F2D1] hover:underline">EULA & Minor Safety</Link>
            <Link to="/Cookies" className="text-[#37F2D1] hover:underline">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, items }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <ul className="text-slate-300 space-y-1 list-disc pl-6">
        {items.map((it) => <li key={it}>{it}</li>)}
      </ul>
    </section>
  );
}
