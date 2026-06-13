import React, { useState } from 'react';
import { Download, Loader2, CheckCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { generatePDF } from '../api/client';

const PDFDownload = ({ summary, metadata, disabled }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      await generatePDF(summary, metadata, []);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to generate PDF');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleDownload}
        disabled={disabled || !summary || isGenerating}
        variant={success ? 'secondary' : 'default'}
        size="sm"
      >
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin" />
            generating…
          </>
        ) : success ? (
          <>
            <CheckCircle className="text-primary" />
            saved
          </>
        ) : (
          <>
            <Download />
            export pdf
          </>
        )}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
};

export default PDFDownload;
