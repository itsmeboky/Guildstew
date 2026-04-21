import React from "react";
import { MessageSquare } from "lucide-react";
import ComingSoon from "@/pages/ComingSoon";

export default function Forums() {
  return (
    <ComingSoon
      title="Forums"
      subtitle="Guildstew community forums. Discussion threads, GM tips, and build advice are brewing."
      icon={MessageSquare}
    />
  );
}
