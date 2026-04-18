import React from "react";

/**
 * Full-screen looping video background behind the login + onboarding
 * pages. Muted + autoplay + playsInline so iOS Safari doesn't fight
 * us. A semi-transparent dark overlay sits between the video and the
 * foreground card so the form copy stays readable no matter what
 * frame is on screen.
 */
export default function AuthBackdrop() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
      >
        <source
          src="https://ktdxhsstrgwciqkvprph.supabase.co/storage/v1/object/public/app-assets/branding/guildstewsoup.webm"
          type="video/webm"
        />
      </video>
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
}
