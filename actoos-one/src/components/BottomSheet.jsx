import { X } from 'lucide-react';

export function BottomSheet({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]" data-testid="bottom-sheet">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        data-testid="bottom-sheet-backdrop"
      />
      
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl bottom-sheet-enter safe-area-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <h2 className="text-lg font-semibold text-white" data-testid="bottom-sheet-title">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 active:bg-gray-700 transition-colors"
            data-testid="bottom-sheet-close"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-6 max-h-[60vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
