import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/api/supabaseClient";

/**
 * Post-signup landing page when Supabase email confirmation is
 * enabled. The email address is passed through a querystring so the
 * resend button can call auth.resend without asking the user again.
 */
export default function VerifyEmail() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";
  const [resending, setResending] = useState(false);

  const resend = async () => {
    if (!email) {
      toast.error("Missing email — sign in and request verification from Settings.");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("Verification email sent. Check your inbox.");
    } catch (err) {
      toast.error(err?.message || "Failed to resend. Try again in a minute.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1219] flex flex-col items-center justify-center text-center px-4">
      <Mail className="w-16 h-16 text-[#37F2D1] mb-6" />
      <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
      {email ? (
        <p className="text-slate-400 mb-6">
          We sent a verification link to <span className="text-white font-semibold">{email}</span>. Click it to activate your account.
        </p>
      ) : (
        <p className="text-slate-400 mb-6">
          We sent a verification link to your email address. Click it to activate your account.
        </p>
      )}
      <p className="text-slate-500 text-sm mb-6">
        Didn't get it? Check your spam folder or{" "}
        <button
          onClick={resend}
          disabled={resending}
          className="text-[#37F2D1] underline disabled:opacity-50"
        >
          {resending ? "sending…" : "resend the email"}
        </button>
        .
      </p>
      <Link to="/" className="text-xs text-slate-500 hover:text-white underline">
        Back to login
      </Link>
    </div>
  );
}
