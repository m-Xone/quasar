import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TerminalSquare, Cpu, Loader2, CircleDot } from 'lucide-react';

import HistorySidebar from './components/HistorySidebar';
import VideoInput from './components/VideoInput';
import VideoPlayer from './components/VideoPlayer';
import SummaryPanel from './components/SummaryPanel';
import PDFDownload from './components/PDFDownload';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyzeUploadedVideo, analyzeYouTubeVideo } from './api/client';
import {
  saveAnalysis,
  listAnalyses,
  deleteAnalysis,
  clearAnalyses,
} from '@/lib/storage';
import { formatBytes } from '@/lib/utils';

function App() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const [videoFile, setVideoFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);

  // Refs mirror streaming state so the save-on-complete callback never
  // captures stale values from the closure.
  const summaryRef = useRef('');
  const metadataRef = useRef(null);

  const refreshSessions = useCallback(async () => {
    try {
      setSessions(await listAnalyses());
    } catch (err) {
      console.error('Failed to load history from IndexedDB:', err);
    }
  }, []);

  // Load persisted history on mount
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const resetState = () => {
    setSummary('');
    summaryRef.current = '';
    setError(null);
    setIsStreaming(false);
    setIsEnhancing(false);
    setStatusMessage('');
    setActiveId(null);
  };

  const handleNewAnalysis = () => {
    resetState();
    setVideoFile(null);
    setYoutubeUrl('');
    setVideoMetadata(null);
    metadataRef.current = null;
  };

  const persistCompletedAnalysis = async () => {
    const finalSummary = summaryRef.current;
    const meta = metadataRef.current;
    if (!finalSummary || !meta) return;

    const record = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      source: meta.source,
      title: meta.filename,
      url: meta.url || null,
      fileSize: meta.size ?? null,
      summary: finalSummary,
    };

    try {
      await saveAnalysis(record);
      setActiveId(record.id);
      await refreshSessions();
    } catch (err) {
      console.error('Failed to persist analysis:', err);
    }
  };

  const handleVideoSelect = useCallback((file) => {
    setVideoFile(file);
    setYoutubeUrl('');
    resetState();

    const meta = {
      filename: file.name,
      size: file.size,
      source: 'upload',
      url: null,
      duration: null,
    };
    setVideoMetadata(meta);
    metadataRef.current = meta;

    handleAnalyze(file, null);
  }, []);

  const handleYouTubeSubmit = useCallback((url) => {
    setYoutubeUrl(url);
    setVideoFile(null);
    resetState();

    const meta = {
      filename: 'YouTube Video',
      size: null,
      source: 'youtube',
      url,
      duration: null,
    };
    setVideoMetadata(meta);
    metadataRef.current = meta;

    handleAnalyze(null, url);
  }, []);

  const handleSelectSession = useCallback((session) => {
    setActiveId(session.id);
    setSummary(session.summary);
    summaryRef.current = session.summary;
    setError(null);
    setIsStreaming(false);
    setIsEnhancing(false);
    setStatusMessage('');
    setVideoFile(null);
    setYoutubeUrl(session.source === 'youtube' ? session.url || '' : '');

    const meta = {
      filename: session.title,
      size: session.fileSize,
      source: session.source,
      url: session.url,
      duration: null,
    };
    setVideoMetadata(meta);
    metadataRef.current = meta;
  }, []);

  const handleDeleteSession = useCallback(
    async (id) => {
      try {
        await deleteAnalysis(id);
        if (id === activeId) handleNewAnalysis();
        await refreshSessions();
      } catch (err) {
        console.error('Failed to delete analysis:', err);
      }
    },
    [activeId, refreshSessions]
  );

  const handleClearAll = useCallback(async () => {
    try {
      await clearAnalyses();
      handleNewAnalysis();
      await refreshSessions();
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  }, [refreshSessions]);

  const handleAnalyze = async (file, ytUrl) => {
    setIsProcessing(true);
    setIsStreaming(true);
    setError(null);
    setSummary('');
    summaryRef.current = '';

    const onChunk = (chunk) => {
      summaryRef.current += chunk;
      setSummary(summaryRef.current);
    };

    const onError = (err) => {
      setError(err.message || 'Failed to analyze video');
      setIsStreaming(false);
      setIsEnhancing(false);
    };

    const onComplete = () => {
      setIsStreaming(false);
      setIsProcessing(false);
      setIsEnhancing(false);
      persistCompletedAnalysis();
    };

    const onStatus = (statusMsg) => {
      setStatusMessage(statusMsg);
      setIsEnhancing(true);
    };

    const onEnhance = (enhancedSummary) => {
      // Replace summary with enhanced version containing screenshots
      summaryRef.current = enhancedSummary;
      setSummary(enhancedSummary);
      setIsEnhancing(false);
      setStatusMessage('');
    };

    try {
      if (file) {
        await analyzeUploadedVideo(
          file,
          'general',
          onChunk,
          onError,
          onComplete,
          onStatus,
          onEnhance
        );
      } else if (ytUrl) {
        await analyzeYouTubeVideo(
          ytUrl,
          'general',
          onChunk,
          (metadata) => {
            // Update metadata with the resolved YouTube title
            setVideoMetadata((prev) => {
              const next = {
                ...prev,
                filename: metadata.title || 'YouTube Video',
              };
              metadataRef.current = next;
              return next;
            });
          },
          onError,
          onComplete,
          onStatus,
          onEnhance
        );
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      setIsStreaming(false);
      setIsProcessing(false);
      setIsEnhancing(false);
    }
  };

  const statusLabel = isEnhancing
    ? 'ENHANCING'
    : isStreaming
      ? 'STREAMING'
      : isProcessing
        ? 'PROCESSING'
        : error
          ? 'ERROR'
          : summary
            ? 'COMPLETE'
            : 'IDLE';

  return (
    <div className="scanlines grid-bg flex h-screen w-full overflow-hidden bg-background">
      {/* History sidebar (client-side persisted) */}
      <HistorySidebar
        sessions={sessions}
        activeId={activeId}
        isProcessing={isProcessing}
        onSelect={handleSelectSession}
        onDelete={handleDeleteSession}
        onClearAll={handleClearAll}
        onNewAnalysis={handleNewAnalysis}
      />

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card/60 px-4">
          <div className="flex items-center gap-3">
            <TerminalSquare className="size-5 text-primary" />
            <h1 className="text-sm font-bold uppercase tracking-[0.2em] text-primary text-glow">
              video<span className="text-muted-foreground">::</span>summarizer
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="accent">
              <Cpu className="size-3" />
              gemini
            </Badge>
            <Badge variant={error ? 'destructive' : isProcessing ? 'default' : 'outline'}>
              {isProcessing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <CircleDot className="size-3" />
              )}
              {statusLabel.toLowerCase()}
            </Badge>
          </div>
        </header>

        {/* Workspace: input + video on the left, analysis on the right */}
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 xl:grid-cols-5 xl:overflow-hidden 2xl:grid-cols-2">
          {/* Left: source */}
          <section className="flex min-h-0 flex-col gap-4 xl:col-span-2 2xl:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>// source input</CardTitle>
              </CardHeader>
              <CardContent>
                <VideoInput
                  onVideoSelect={handleVideoSelect}
                  onYouTubeSubmit={handleYouTubeSubmit}
                  isProcessing={isProcessing}
                />
              </CardContent>
            </Card>

            <div className="min-h-[240px] flex-1 xl:min-h-0">
              <VideoPlayer videoFile={videoFile} youtubeUrl={youtubeUrl} />
            </div>

            {videoMetadata && (
              <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Badge variant="secondary">{videoMetadata.source}</Badge>
                <span className="max-w-[60%] truncate" title={videoMetadata.filename}>
                  {videoMetadata.filename}
                </span>
                {videoMetadata.size != null && (
                  <span>· {formatBytes(videoMetadata.size)}</span>
                )}
              </div>
            )}
          </section>

          {/* Right: analysis output */}
          <section className="flex min-h-0 flex-col gap-3 xl:col-span-3 2xl:col-span-1">
            <div className="min-h-[320px] flex-1 xl:min-h-0">
              <SummaryPanel
                summary={summary}
                isStreaming={isStreaming}
                error={error}
                statusMessage={statusMessage}
              />
            </div>

            {summary && !isStreaming && !isEnhancing && (
              <div className="shrink-0 animate-fade-in">
                <PDFDownload
                  summary={summary}
                  metadata={videoMetadata}
                  disabled={isProcessing || !summary}
                />
              </div>
            )}
          </section>
        </main>

        {/* Status bar */}
        <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-card/60 px-4 text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              <span className="text-primary">‣</span> status: {statusLabel}
            </span>
            <span>sessions: {sessions.length}</span>
          </div>
          <span>react · shadcn/ui · fastapi · gemini</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
