import React from 'react';

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

export const JobCardSkeleton = () => (
  <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton className="w-14 h-14 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-5 w-24 rounded-full" />
    </div>
    <div className="flex justify-between pt-3 border-t border-slate-100">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-28" />
    </div>
  </div>
);

export const StatCardSkeleton = () => (
  <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-3">
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-8 w-12" />
  </div>
);

export default Skeleton;