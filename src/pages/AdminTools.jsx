import React from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Dice5, ShieldCheck, ArrowLeft } from "lucide-react";

const ADMIN_EMAILS = [
  "harrison@aetherianstudios.com",
  "harrison@guildstew.com",
];

function isAdminUser(user) {
  const email = (user?.email || "").toLowerCase();
  if (!email) return false;
  if (ADMIN_EMAILS.includes(email)) return true;
  return email.endsWith("@aetherianstudios.com") || email.endsWith("@guildstew.com");
}

const TOOLS = [
  {
    id: "dice-calibrator",
    title: "Dice Calibrator",
    description:
      "Set the resting rotation for each face on every die type. The calibrated face is what the live dice system lands on when a roll resolves.",
    to: "/dice-calibrator",
    icon: Dice5,
  },
  {
    id: "alpha-approvals",
    title: "Alpha Approvals",
    description:
      "Review the hand-vetted alpha queue. Approve, resend keys, revoke, or reject applicants — approving mints a join key and emails it.",
    to: "/alpha-approvals",
    icon: ShieldCheck,
  },
];

export default function AdminTools() {
  const { user, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-[#1B2535] flex items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  if (!user || !isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#1B2535] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/Admin"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#FF5300] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Admin</span>
        </Link>

        <h1
          className="text-4xl font-black tracking-wider mb-2"
          style={{ fontFamily: "Cream, ui-serif, serif", color: "#FFF" }}
        >
          Admin Tools
        </h1>
        <p className="text-slate-400 text-sm mb-8">
          Internal utilities for tuning game systems and content.
        </p>

        <div className="flex flex-wrap gap-4">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                to={tool.to}
                className="group block w-72 rounded-xl bg-[#0d141f] border border-[#2A3441] hover:border-[#FF5300] p-5 transition-all hover:shadow-[0_0_24px_rgba(255,83,0,0.25)]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FF5300]/15 border border-[#FF5300]/40 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#FF5300]" />
                  </div>
                  <h2
                    className="text-lg font-bold text-white group-hover:text-[#FF5300] transition-colors"
                    style={{ fontFamily: "Cream, ui-serif, serif" }}
                  >
                    {tool.title}
                  </h2>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {tool.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
