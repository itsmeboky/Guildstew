import React from "react";
import { TrendingUp } from "lucide-react";
import ComingSoon from "@/pages/ComingSoon";

export default function CreatorAnalytics() {
  return (
    <ComingSoon
      title="Creator Analytics"
      subtitle="Views over time, conversion rates, trending items, and traffic sources — the full creator analytics suite is on the way."
      icon={TrendingUp}
    />
  );
}
