import React from "react";
import { AlertTriangle } from "lucide-react";
import ComingSoon from "@/pages/ComingSoon";

export default function SupportTicket() {
  return (
    <ComingSoon
      title="Report a Problem"
      subtitle="The support-ticket flow is being wired up. For now, reach the team on Discord."
      icon={AlertTriangle}
    />
  );
}
