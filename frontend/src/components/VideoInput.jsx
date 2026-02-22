import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, X, AlertCircle } from 'lucide-react';

const VideoInput = ({ onVideoSelect, onYouTubeSubmit, isProcessing }) => {
  const [inputMode, setInputMode] = useState('upload'); // 'upload' or 'youtube'
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    setError(null);

    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|avi|mov|mkv|webm)$/i)) {
      setError('Invalid file type. Please select a video file (MP4, AVI, MOV, MKV, or WebM).');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 2GB limit. Selected file: ${(file.size / (1024**3)).toFixed(2)}GB`);
      return;
    }

    // Warn if file is large
    if (file.size > 500 * 1024 * 1024) {
      console.warn(`Large file selected: ${(file.size / (1024**3)).toFixed(2)}GB. This may take a while to process.`);
    }

    setSelectedFile(file);
    onVideoSelect(file);
  };

  const handleYouTubeSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    // Basic YouTube URL validation
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    onYouTubeSubmit(youtubeUrl);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setYoutubeUrl('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-2 p-1.5 bg-surface-200 rounded-xl">
        <button
          onClick={() => {
            setInputMode('upload');
            clearSelection();
          }}
          disabled={isProcessing}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            inputMode === 'upload'
              ? 'bg-white text-primary-600 shadow-card ring-1 ring-primary-100 font-medium'
              : 'text-gray-600 hover:text-gray-900'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Upload size={18} />
          Upload Video
        </button>
        <button
          onClick={() => {
            setInputMode('youtube');
            clearSelection();
          }}
          disabled={isProcessing}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all ${
            inputMode === 'youtube'
              ? 'bg-white text-primary-600 shadow-card ring-1 ring-primary-100 font-medium'
              : 'text-gray-600 hover:text-gray-900'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <LinkIcon size={18} />
          YouTube URL
        </button>
      </div>

      {/* Upload Mode */}
      {inputMode === 'upload' && (
        <div className="space-y-3">
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`rounded-2xl p-10 text-center transition-all ${
              isProcessing
                ? 'bg-surface-100 border border-surface-300 cursor-not-allowed'
                : 'bg-gradient-to-br from-primary-50/60 to-surface-100 border border-primary-200/50 hover:shadow-glow hover:scale-[1.01] cursor-pointer'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              disabled={isProcessing}
              className="hidden"
            />
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
              isProcessing ? 'bg-surface-200' : 'bg-primary-100'
            }`}>
              <Upload className={isProcessing ? 'text-gray-400' : 'text-primary-500'} size={32} />
            </div>
            <p className={`text-sm font-medium mb-1 ${isProcessing ? 'text-gray-500' : 'text-gray-700'}`}>
              {selectedFile ? selectedFile.name : 'Click to select a video file'}
            </p>
            <p className="text-xs text-gray-500">
              Supports MP4, AVI, MOV, MKV, WebM (max 2GB)
            </p>
            {selectedFile && (
              <p className="text-xs text-gray-600 mt-2">
                Size: {(selectedFile.size / (1024**2)).toFixed(2)} MB
              </p>
            )}
          </div>

          {selectedFile && !isProcessing && (
            <button
              onClick={clearSelection}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <X size={16} />
              Clear Selection
            </button>
          )}
        </div>
      )}

      {/* YouTube Mode */}
      {inputMode === 'youtube' && (
        <form onSubmit={handleYouTubeSubmit} className="space-y-3">
          <div>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={isProcessing}
              className={`w-full px-4 py-3 border border-surface-300 rounded-xl bg-surface-50 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400 ${
                isProcessing ? 'bg-surface-100 cursor-not-allowed' : ''
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={isProcessing || !youtubeUrl.trim()}
            className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${
              isProcessing || !youtubeUrl.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:shadow-glow active:scale-[0.98]'
            }`}
          >
            {isProcessing ? 'Processing...' : 'Analyze Video'}
          </button>
        </form>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50/80 border border-red-200/60 rounded-xl text-red-800 text-sm">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default VideoInput;
