import React, { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { RotateCcw, Check } from 'lucide-react';

interface SignatureCaptureProps {
  onSignatureChange: (signature: string) => void;
  existingSignature?: string;
}

export default function SignatureCapture({ 
  onSignatureChange, 
  existingSignature 
}: SignatureCaptureProps) {
  const signatureRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (existingSignature && signatureRef.current) {
      signatureRef.current.fromDataURL(existingSignature);
    }
  }, [existingSignature]);

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      onSignatureChange('');
    }
  };

  const saveSignature = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      onSignatureChange(signatureData);
    }
  };

  const handleEnd = () => {
    saveSignature();
  };

  return (
    <div className="space-y-4">
      <div className="border border-gray-300 rounded-lg bg-white">
        <SignatureCanvas
          ref={signatureRef}
          canvasProps={{
            className: 'w-full h-40 rounded-lg',
            style: { touchAction: 'none' }
          }}
          onEnd={handleEnd}
          backgroundColor="rgb(255, 255, 255)"
          penColor="rgb(0, 0, 0)"
        />
      </div>
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={clearSignature}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RotateCcw size={16} />
          <span>Clear</span>
        </button>
        
        <button
          type="button"
          onClick={saveSignature}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Check size={16} />
          <span>Save Signature</span>
        </button>
      </div>
      
      <p className="text-sm text-gray-500 text-center">
        Sign above to confirm the rental agreement
      </p>
    </div>
  );
}