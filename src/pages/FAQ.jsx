import React from "react";
import { HelpCircle } from "lucide-react";
import ComingSoon from "@/pages/ComingSoon";

export default function FAQ() {
  return (
    <ComingSoon
      title="FAQ"
      subtitle="Common questions, billing help, and how-to guides — the full FAQ page is being written."
      icon={HelpCircle}
    />
  );
}
