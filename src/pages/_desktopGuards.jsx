import React from "react";
import GMPanel from "./GMPanel";
import CampaignPlayerPanel from "./CampaignPlayerPanel";
import { DesktopOnly } from "@/components/ui/DesktopOnly";

/**
 * Tiny wrappers that apply the mobile-block gate to the two dense
 * desktop-only pages. Kept in a separate file so pages.config.js can
 * stay free of JSX — the project registers page components through
 * a simple object, and keeping wrappers here keeps that object
 * trivially serialisable.
 */
export function GuardedGMPanel() {
  return (
    <DesktopOnly>
      <GMPanel />
    </DesktopOnly>
  );
}

export function GuardedPlayerPanel() {
  return (
    <DesktopOnly>
      <CampaignPlayerPanel />
    </DesktopOnly>
  );
}
