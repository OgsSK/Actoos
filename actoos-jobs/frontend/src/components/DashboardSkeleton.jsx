import React from 'react';
import { Card } from './ui/card';

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Stats */}
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-4">
          <div className="h-4 bg-slate-200 rounded w-1/2 mb-2" />
          <div className="h-8 bg-slate-200 rounded w-1/3" />
        </Card>
      ))}
    </div>
    {/* Liste des offres */}
    <Card className="p-5">
      <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-t border-slate-100">
          <div className="h-5 bg-slate-200 rounded w-1/2" />
          <div className="h-4 bg-slate-200 rounded w-24 ml-auto" />
        </div>
      ))}
    </Card>
  </div>
);

export default DashboardSkeleton;