import { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

export function SwipeToDelete({ children, onDelete, disabled = false }) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef(null);

  const DELETE_THRESHOLD = -80; // Distance to trigger delete
  const MAX_SWIPE = -100;

  const handleTouchStart = (e) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || disabled) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Only allow left swipe
    if (diff < 0) {
      setTranslateX(Math.max(diff, MAX_SWIPE));
    } else {
      setTranslateX(0);
    }
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setIsDragging(false);
    
    if (translateX < DELETE_THRESHOLD) {
      // Show delete button
      setTranslateX(MAX_SWIPE);
    } else {
      // Reset position
      setTranslateX(0);
    }
  };

  const handleDelete = () => {
    // Animate out
    if (containerRef.current) {
      containerRef.current.style.height = containerRef.current.offsetHeight + 'px';
      containerRef.current.style.transition = 'all 0.3s ease-out';
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.height = '0px';
          containerRef.current.style.opacity = '0';
          containerRef.current.style.marginBottom = '0px';
        }
      }, 10);
      setTimeout(() => {
        onDelete?.();
      }, 300);
    } else {
      onDelete?.();
    }
  };

  const resetPosition = () => {
    setTranslateX(0);
  };

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete button background */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-24 bg-red-500 flex items-center justify-center"
        onClick={handleDelete}
      >
        <Trash2 className="w-6 h-6 text-white" />
      </div>
      
      {/* Content */}
      <div
        className="relative bg-white transition-transform"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onClick={() => translateX !== 0 && resetPosition()}
      >
        {children}
      </div>
    </div>
  );
}
