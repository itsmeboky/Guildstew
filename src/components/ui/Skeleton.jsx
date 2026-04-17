import React from "react";

/**
 * Loading-state primitives. Use these instead of blank space while
 * `useQuery` fetches — they preserve layout height and look intentional.
 */
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-slate-700/50 rounded ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-[#1a1f2e] border border-[#2A3441] rounded-xl p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function AvatarSkeleton() {
  return <Skeleton className="h-10 w-10 rounded-full" />;
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 bg-[#1a1f2e] border border-[#2A3441] rounded-lg p-3">
      <AvatarSkeleton />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded" />
    </div>
  );
}
