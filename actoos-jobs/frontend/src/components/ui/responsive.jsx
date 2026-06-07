import React from 'react';
import { cn } from '../../lib/utils';

// Wrapper de page avec padding responsive
export function Container({ children, className, ...props }) {
  return (
    <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", className)} {...props}>
      {children}
    </div>
  );
}

// Grille responsive : 1 colonne mobile, 2 sm, 3 lg, 4 xl
export function Grid({ children, cols = 3, className, ...props }) {
  const colsClasses = {
    2: "grid-cols-1 sm:grid-cols-2 gap-4",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6",
    4: "grid-cols-2 lg:grid-cols-4 gap-4",
  };
  return (
    <div className={cn("grid", colsClasses[cols] || colsClasses[3], className)} {...props}>
      {children}
    </div>
  );
}

// Flex responsive : column mobile, row desktop
export function Flex({ children, className, ...props }) {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-4", className)} {...props}>
      {children}
    </div>
  );
}

// Bouton responsive (pleine largeur mobile)
export function ResponsiveButton({ children, className, ...props }) {
  return (
    <button
      className={cn("w-full sm:w-auto px-4 py-2 rounded-xl font-medium transition-colors", className)}
      {...props}
    >
      {children}
    </button>
  );
}