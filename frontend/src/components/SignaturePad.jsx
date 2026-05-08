import React, { useRef, useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from './ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import { PenTool, RotateCcw, Check, X, User, Users, Info } from 'lucide-react';

const SignaturePad = ({ 
  isOpen, 
  onClose, 
  onSave, 
  title = "Signature du client",
  description = "Veuillez faire signer le client pour valider l'intervention",
  clientName = "", // Pre-fill with client name
  clientEmail = "",
  clientPhone = ""
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  
  // Enhanced fields
  const [typeSignataire, setTypeSignataire] = useState('client');
  const [relationSignataire, setRelationSignataire] = useState('');
  const [emailSignataire, setEmailSignataire] = useState('');
  const [telephoneSignataire, setTelephoneSignataire] = useState('');

  // Pre-fill name when opening
  useEffect(() => {
    if (isOpen) {
      if (typeSignataire === 'client' && clientName) {
        setSignerName(clientName);
        setEmailSignataire(clientEmail || '');
        setTelephoneSignataire(clientPhone || '');
      }
    }
  }, [isOpen, clientName, clientEmail, clientPhone, typeSignataire]);

  // Reset relation when switching to client
  useEffect(() => {
    if (typeSignataire === 'client') {
      setRelationSignataire('');
      if (clientName) {
        setSignerName(clientName);
        setEmailSignataire(clientEmail || '');
        setTelephoneSignataire(clientPhone || '');
      }
    } else {
      setSignerName('');
      setEmailSignataire('');
      setTelephoneSignataire('');
    }
  }, [typeSignataire, clientName, clientEmail, clientPhone]);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * 2; // Higher resolution
      canvas.height = rect.height * 2;
      ctx.scale(2, 2);
      
      // Set drawing style
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [isOpen]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSave = () => {
    if (!hasSignature || !signerName.trim()) {
      return;
    }
    
    // Validate relation required if tiers
    if (typeSignataire === 'tiers' && !relationSignataire) {
      return;
    }
    
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    
    onSave({
      signature: signatureData,
      nom_signataire: signerName.trim(),
      type_signataire: typeSignataire,
      relation_signataire: typeSignataire === 'tiers' ? relationSignataire : null,
      email_signataire: emailSignataire || null,
      telephone_signataire: telephoneSignataire || null
    });
    
    // Reset
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSignerName('');
    setHasSignature(false);
    setTypeSignataire('client');
    setRelationSignataire('');
    setEmailSignataire('');
    setTelephoneSignataire('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const relationOptions = [
    { value: 'conjoint', label: 'Conjoint(e)' },
    { value: 'collegue', label: 'Collègue' },
    { value: 'receptionniste', label: 'Réceptionniste' },
    { value: 'famille', label: 'Membre de la famille' },
    { value: 'voisin', label: 'Voisin(e)' },
    { value: 'gardien', label: 'Gardien(ne)' },
    { value: 'autre', label: 'Autre' }
  ];

  const isValid = hasSignature && signerName.trim() && 
    (typeSignataire === 'client' || (typeSignataire === 'tiers' && relationSignataire));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Signer Type Selection */}
          <div className="bg-slate-50 rounded-lg p-3">
            <Label className="text-sm font-medium mb-2 block">Qui signe ?</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={typeSignataire === 'client' ? 'default' : 'outline'}
                className={typeSignataire === 'client' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                onClick={() => setTypeSignataire('client')}
                data-testid="signer-type-client"
              >
                <User className="w-4 h-4 mr-2" />
                Le client
              </Button>
              <Button
                type="button"
                variant={typeSignataire === 'tiers' ? 'default' : 'outline'}
                className={typeSignataire === 'tiers' ? 'bg-amber-600 hover:bg-amber-700' : ''}
                onClick={() => setTypeSignataire('tiers')}
                data-testid="signer-type-tiers"
              >
                <Users className="w-4 h-4 mr-2" />
                Autre personne
              </Button>
            </div>
          </div>

          {/* Tiers info banner */}
          {typeSignataire === 'tiers' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                La signature sera marquée comme effectuée par un tiers. 
                Veuillez indiquer la relation avec le client.
              </p>
            </div>
          )}

          {/* Relation (if tiers) */}
          {typeSignataire === 'tiers' && (
            <div>
              <Label htmlFor="relation">Relation avec le client *</Label>
              <Select value={relationSignataire} onValueChange={setRelationSignataire}>
                <SelectTrigger className="mt-1" data-testid="relation-select">
                  <SelectValue placeholder="Sélectionner la relation" />
                </SelectTrigger>
                <SelectContent>
                  {relationOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Signer Name */}
          <div>
            <Label htmlFor="signer-name">Nom du signataire *</Label>
            <Input
              id="signer-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={typeSignataire === 'client' ? "Ex: Jean Dupont" : "Nom de la personne qui signe"}
              className="mt-1"
              data-testid="signer-name-input"
            />
          </div>

          {/* Optional contact info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="signer-email" className="text-xs text-slate-500">Email (optionnel)</Label>
              <Input
                id="signer-email"
                type="email"
                value={emailSignataire}
                onChange={(e) => setEmailSignataire(e.target.value)}
                placeholder="email@exemple.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="signer-phone" className="text-xs text-slate-500">Téléphone (optionnel)</Label>
              <Input
                id="signer-phone"
                type="tel"
                value={telephoneSignataire}
                onChange={(e) => setTelephoneSignataire(e.target.value)}
                placeholder="06 12 34 56 78"
                className="mt-1"
              />
            </div>
          </div>

          {/* Signature Canvas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Signature *</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSignature}
                className="text-slate-500 hover:text-slate-700"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Effacer
              </Button>
            </div>
            <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-40 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                data-testid="signature-canvas"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1 text-center">
              {hasSignature ? '✓ Signature capturée' : 'Dessinez la signature ci-dessus'}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isValid}
            className="bg-emerald-600 hover:bg-emerald-700"
            data-testid="validate-signature-btn"
          >
            <Check className="w-4 h-4 mr-2" />
            Valider la signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignaturePad;
