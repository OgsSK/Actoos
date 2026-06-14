import React from 'react';

const Shimmer = ({ className = '' }) => (
  <div className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded ${className}`} />
);

export default Shimmer;