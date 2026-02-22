import React, { useState } from 'react';
import { Download, Loader2, CheckCircle } from 'lucide-react';
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
      setTimeout(() => setSuccess(false), 3000); // Reset after 3 seconds
    } catch (err) {
      setError(err.message || 'Failed to generate PDF');
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsGenerating(false);
    }
  };

  const isDisabled = disabled || !summary || isGenerating;

  return (
    <div className="space-y-2">
      <button
        onClick={handleDownload}
        disabled={isDisabled}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium transition-all ${
          isDisabled
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : success
            ? 'bg-green-600 text-white shadow-lg shadow-green-500/25'
            : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:-translate-y-0.5 hover:shadow-glow active:scale-[0.98]'
        }`}
      >
        {isGenerating ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span>Generating PDF...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle size={20} />
            <span>Downloaded!</span>
          </>
        ) : (
          <>
            <Download size={20} />
            <span>Download PDF</span>
          </>
        )}
      </button>

      {error && (
        <div className="text-sm text-red-600 text-center">
          {error}
        </div>
      )}

      {!disabled && summary && (
        <p className="text-xs text-gray-500 text-center">
          Generate a formatted PDF report with the complete summary
        </p>
      )}
    </div>
  );
};

export default PDFDownload;
