import React from "react";
import { Calendar } from "lucide-react";
import ComingSoon from "@/pages/ComingSoon";

export default function Events() {
  return (
    <ComingSoon
      title="Community Events"
      subtitle="Game jams, Brewery contests, and featured creator spotlights will land here."
      icon={Calendar}
    />
  );
}
