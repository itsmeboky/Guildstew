import React, { useEffect, useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  validateUsername,
  isUsernameAvailable,
} from "@/utils/username";

/**
 * Username field with debounced availability + policy check. Exposes
 * the raw value AND the current status via `onChange` / `onStatus`
 * so the parent's submit button can stay disabled while the check is
 * in flight or failing.
 *
 * Status values:
 *   idle          — user hasn't typed yet
 *   checking      — debounce timer elapsed, Supabase round-trip in flight
 *   available     — free to use
 *   taken         — another user already owns this
 *   invalid       — fails policy (length, chars, itsme prefix, etc.)
 */
export default function UsernameField({
  value,
  onChange,
  onStatus,
  email,
  excludeUserId = null,
  label = "Username",
  placeholder = "boky",
  className = "",
  inputClassName = "",
}) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState(null);

  useEffect(() => {
    onStatus?.(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      setStatus("idle");
      setMessage(null);
      return;
    }
    const policy = validateUsername(trimmed, email);
    if (!policy.ok) {
      setStatus("invalid");
      setMessage(policy.error);
      return;
    }
    setStatus("checking");
    setMessage(null);
    const handle = setTimeout(async () => {
      const { available, error } = await isUsernameAvailable(trimmed, excludeUserId);
      if (error) {
        setStatus("invalid");
        setMessage("Could not check availability — try again.");
        return;
      }
      setStatus(available ? "available" : "taken");
      setMessage(available ? "Username available" : "That username is taken. Try another one.");
    }, 400);
    return () => clearTimeout(handle);
  }, [value, email, excludeUserId]);

  const indicator = (() => {
    if (status === "checking") return <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />;
    if (status === "available") return <Check className="w-3.5 h-3.5 text-emerald-400" />;
    if (status === "taken" || status === "invalid") return <X className="w-3.5 h-3.5 text-red-400" />;
    return null;
  })();

  const messageColor = (() => {
    if (status === "available") return "text-emerald-400";
    if (status === "taken" || status === "invalid") return "text-red-400";
    return "text-slate-400";
  })();

  return (
    <div className={`space-y-1 ${className}`}>
      {label && <Label className="text-xs font-semibold">{label}</Label>}
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className={inputClassName}
        />
        {indicator && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{indicator}</span>
        )}
      </div>
      {message && (
        <p className={`text-[11px] ${messageColor}`}>{message}</p>
      )}
    </div>
  );
}
