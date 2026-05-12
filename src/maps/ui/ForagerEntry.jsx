import React, { Suspense, lazy } from "react";

const ForagerHome = lazy(() => import("./ForagerHome"));

function ForagerLoading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1E2430]">
      <div className="w-10 h-10 border-4 border-[#f8a47c]/20 border-t-[#FF5300] rounded-full animate-spin mb-6" />
      <p className="text-[#f8a47c] text-sm uppercase tracking-widest">
        Forager · loading the world
      </p>
    </div>
  );
}

export default function ForagerEntry() {
  return (
    <Suspense fallback={<ForagerLoading />}>
      <ForagerHome />
    </Suspense>
  );
}
