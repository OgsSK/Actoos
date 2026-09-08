// src/components/ui/StarRating.jsx
import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

export const StarRating = ({ rating, max = 5, size = 'w-5 h-5', interactive = false, onChange, className }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  if (interactive) {
    const displayRating = hoverRating || rating;

    return (
      <div className={cn('flex items-center gap-1', className)}>
        {stars.map((star) => (
          <button
            key={star}
            type="button"
            className={cn(
              'focus:outline-none transition-colors',
              star <= displayRating ? 'text-amber-400' : 'text-slate-300'
            )}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => {
              // Si on clique sur la note déjà sélectionnée, on la retire (0)
              // Sinon, on sélectionne la nouvelle note
              onChange?.(star === rating ? 0 : star);
            }}
          >
            <Star
              className={cn(
                size,
                star <= displayRating ? 'fill-amber-400' : ''
              )}
            />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {stars.map((star) => (
        <Star
          key={star}
          className={cn(
            size,
            star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
          )}
        />
      ))}
    </div>
  );
};