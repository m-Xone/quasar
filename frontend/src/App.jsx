import React, { useState, useCallback } from 'react';
import { Video, Sparkles, Loader2 } from 'lucide-react';
import VideoInput from './components/VideoInput';
import VideoPlayer from './components/VideoPlayer';
import SummaryPanel from './components/SummaryPanel';
import PDFDownload from './components/PDFDownload';
import LoadingSpinner from './components/LoadingSpinner';
import { analyzeUploadedVideo, analyzeYouTubeVideo } from './api/client';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);

  const resetState = () => {
    setSummary('');
    setError(null);
    setIsStreaming(false);
    setIsEnhancing(false);
    setStatusMessage('');
  };

  const handleVideoSelect = useCallback((file) => {
    setVideoFile(file);
    setYoutubeUrl('');
    resetState();

    // Set initial metadata
    setVideoMetadata({
      filename: file.name,
      size: file.size,
      source: 'upload',
      duration: null,
    });

    // Start analysis automatically
    handleAnalyze(file, null);
  }, []);

  const handleYouTubeSubmit = useCallback((url) => {
    setYoutubeUrl(url);
    setVideoFile(null);
    resetState();

    // Set initial metadata
    setVideoMetadata({
      filename: 'YouTube Video',
      size: null,
      source: 'youtube',
      duration: null,
    });

    handleAnalyze(null, url);
  }, []);

  const handleAnalyze = async (file, ytUrl) => {
    setIsProcessing(true);
    setIsStreaming(true);
    setError(null);
    setSummary('');

    try {
      if (file) {
        // Analyze uploaded video
        await analyzeUploadedVideo(
          file,
          'general',
          (chunk) => {
            setSummary((prev) => prev + chunk);
          },
          (err) => {
            setError(err.message || 'Failed to analyze video');
            setIsStreaming(false);
            setIsEnhancing(false);
          },
          () => {
            setIsStreaming(false);
            setIsProcessing(false);
            setIsEnhancing(false);
          },
          (statusMsg) => {
            // Handle status updates
            setStatusMessage(statusMsg);
            setIsEnhancing(true);
          },
          (enhancedSummary) => {
            // Replace summary with enhanced version containing screenshots
            console.log('Received enhanced summary, length:', enhancedSummary.length);
            console.log('Contains images:', enhancedSummary.includes('![Screenshot'));

            // Extract and log image data URI info
            const imgMatch = enhancedSummary.match(/!\[Screenshot at [^\]]+\]\(data:image\/jpeg;base64,([^\)]+)\)/);
            if (imgMatch) {
              const base64Data = imgMatch[1];
              console.log('First image base64 length:', base64Data.length);
              console.log('First 50 chars:', base64Data.substring(0, 50));
              console.log('Last 50 chars:', base64Data.substring(base64Data.length - 50));
            } else {
              console.warn('Could not find image markdown pattern');
            }

            setSummary(enhancedSummary);
            setIsEnhancing(false);
            setStatusMessage('');
          }
        );
      } else if (ytUrl) {
        // Analyze YouTube video
        await analyzeYouTubeVideo(
          ytUrl,
          'general',
          (chunk) => {
            setSummary((prev) => prev + chunk);
          },
          (metadata) => {
            // Update metadata with YouTube info
            setVideoMetadata((prev) => ({
              ...prev,
              filename: metadata.title || 'YouTube Video',
            }));
          },
          (err) => {
            setError(err.message || 'Failed to analyze YouTube video');
            setIsStreaming(false);
            setIsEnhancing(false);
          },
          () => {
            setIsStreaming(false);
            setIsProcessing(false);
            setIsEnhancing(false);
          },
          (statusMsg) => {
            // Handle status updates
            setStatusMessage(statusMsg);
            setIsEnhancing(true);
          },
          (enhancedSummary) => {
            // Replace summary with enhanced version containing screenshots
            console.log('Received enhanced summary, length:', enhancedSummary.length);
            console.log('Contains images:', enhancedSummary.includes('![Screenshot'));

            // Extract and log image data URI info
            const imgMatch = enhancedSummary.match(/!\[Screenshot at [^\]]+\]\(data:image\/jpeg;base64,([^\)]+)\)/);
            if (imgMatch) {
              const base64Data = imgMatch[1];
              console.log('First image base64 length:', base64Data.length);
              console.log('First 50 chars:', base64Data.substring(0, 50));
              console.log('Last 50 chars:', base64Data.substring(base64Data.length - 50));
            } else {
              console.warn('Could not find image markdown pattern');
            }

            setSummary(enhancedSummary);
            setIsEnhancing(false);
            setStatusMessage('');
          }
        );
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      setIsStreaming(false);
      setIsProcessing(false);
      setIsEnhancing(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 gradient-mesh">
      {/* Header */}
      <header className="glass-dark sticky top-0 z-40 shadow-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/20 rounded-xl">
                <Video className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Video Summarizer</h1>
                <p className="text-sm text-white/60">AI-powered video analysis with Google Gemini</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full text-sm font-medium ring-1 ring-white/15">
              <Sparkles size={16} className="text-accent-400" />
              <span>Powered by Gemini AI</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Input Section */}
        <div className="mb-6 animate-fade-in">
          <div className="glass rounded-2xl shadow-card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Video or Enter YouTube URL</h2>
            <VideoInput
              onVideoSelect={handleVideoSelect}
              onYouTubeSubmit={handleYouTubeSubmit}
              isProcessing={isProcessing}
            />
          </div>
        </div>

        {/* Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Video Player */}
          <div className="glass rounded-2xl shadow-card p-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Video size={20} className="text-primary-500" />
              Video Preview
            </h2>
            <div style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
              <VideoPlayer videoFile={videoFile} youtubeUrl={youtubeUrl} />
            </div>
          </div>

          {/* Right Panel - Summary */}
          <div className="space-y-4 animate-fade-in">
            <div style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
              <SummaryPanel
                summary={summary}
                isStreaming={isStreaming}
                error={error}
                statusMessage={statusMessage}
              />
            </div>

            {/* PDF Download Button */}
            {summary && !isStreaming && !isEnhancing && (
              <div className="glass rounded-2xl shadow-card p-6 animate-slide-up">
                <PDFDownload
                  summary={summary}
                  metadata={videoMetadata}
                  disabled={isProcessing || !summary}
                />
              </div>
            )}
          </div>
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 bg-primary-950/40 backdrop-blur-md flex items-center justify-center z-50">
            <div className="glass rounded-2xl shadow-card-hover p-8 max-w-md mx-4 animate-slide-up">
              <LoadingSpinner size="lg" message="Analyzing video with Gemini AI..." />
              <p className="text-sm text-gray-500 text-center mt-4">
                This may take a few moments depending on video length
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-primary-100/50 bg-white/40">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-600">
          <p>Built with React, Tailwind CSS, FastAPI, and Google Gemini AI</p>
          <p className="mt-1 text-gray-500">&copy; 2026 Video Summarizer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
