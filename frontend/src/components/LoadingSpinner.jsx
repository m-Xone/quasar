import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading...', size = 'md' }) => {
  const iconSizes = {
    sm: 16,
    md: 32,
    lg: 48,
  };

  const containerSizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const ringSizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        {/* Pulsing ring */}
        <div className={`absolute ${ringSizes[size]} rounded-full border-2 border-primary-300/40 animate-pulse-ring`} />
        {/* Icon container */}
        <div className={`${containerSizes[size]} bg-primary-50 rounded-full flex items-center justify-center`}>
          <Loader2 size={iconSizes[size]} className="text-primary-500 animate-spin" />
        </div>
      </div>
      {message && (
        <p className="text-sm text-gray-600 font-medium">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
