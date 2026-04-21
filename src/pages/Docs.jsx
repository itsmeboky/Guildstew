import React from "react";
import { BookOpen } from "lucide-react";
import ComingSoon from "@/pages/ComingSoon";

export default function Docs() {
  return (
    <ComingSoon
      title="Documentation"
      subtitle="Platform docs, creator guidelines, API references, and step-by-step tutorials — coming soon."
      icon={BookOpen}
    />
  );
}
