import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Eraser, Check, RotateCcw } from 'lucide-react';

/**
 * Signature Canvas Component
 * Touch-friendly signature pad for mobile devices
 */
const SignatureCanvas = ({ 
  onSave, 
  onClear,
  width = 400, 
  height = 200,
  lineColor = '#1e293b',
  lineWidth = 2,
  disabled = false 
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [context, setContext] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Get context
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    setContext(ctx);
  }, [width, height, lineColor, lineWidth]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (e.touches && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (disabled) return;
    e.preventDefault();
    
    const { x, y } = getCoordinates(e);
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing || disabled) return;
    e.preventDefault();

    const { x, y } = getCoordinates(e);
    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  };

  const stopDrawing = (e) => {
    if (disabled) return;
    e.preventDefault();
    setIsDrawing(false);
    context.closePath();
  };

  const clearCanvas = () => {
    if (!context) return;
    
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.strokeStyle = lineColor;
    setHasSignature(false);
    
    if (onClear) onClear();
  };

  const saveSignature = () => {
    if (!hasSignature || !canvasRef.current) return;
    
    // Get signature as base64 PNG
    const signatureData = canvasRef.current.toDataURL('image/png');
    
    if (onSave) {
      onSave(signatureData);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas container */}
      <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ height: `${height}px` }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          data-testid="signature-canvas"
        />
        
        {/* Placeholder text */}
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-400 text-sm">Signez ici</p>
          </div>
        )}
        
        {/* Signature line */}
        <div className="absolute bottom-8 left-8 right-8 border-b border-slate-300" />
        <p className="absolute bottom-2 left-8 text-xs text-slate-400">Signature</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          disabled={disabled || !hasSignature}
          data-testid="clear-signature-btn"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Effacer
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={saveSignature}
          disabled={disabled || !hasSignature}
          className="bg-green-600 hover:bg-green-700"
          data-testid="save-signature-btn"
        >
          <Check className="w-4 h-4 mr-1" />
          Valider la signature
        </Button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
