import React, { useState, useRef, useCallback } from 'react';
import { Upload, Link as LinkIcon, AlertCircle, Terminal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn, formatBytes } from '@/lib/utils';

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;

const VideoInput = ({ onVideoSelect, onYouTubeSubmit, isProcessing }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const validateAndSelect = useCallback(
    (file) => {
      setError(null);
      if (!file) return;

      const validTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|avi|mov|mkv|webm)$/i)) {
        setError('Invalid file type. Supported: MP4, AVI, MOV, MKV, WebM.');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`File exceeds 2GB limit (selected: ${formatBytes(file.size)}).`);
        return;
      }

      onVideoSelect(file);
    },
    [onVideoSelect]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isProcessing) return;
    validateAndSelect(e.dataTransfer.files?.[0]);
  };

  const handleYouTubeSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!youtubeUrl.trim()) {
      setError('Enter a YouTube URL.');
      return;
    }
    if (!YOUTUBE_REGEX.test(youtubeUrl)) {
      setError('Invalid YouTube URL.');
      return;
    }
    onYouTubeSubmit(youtubeUrl.trim());
  };

  return (
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload" disabled={isProcessing}>
          <Upload className="size-3.5" />
          upload
        </TabsTrigger>
        <TabsTrigger value="youtube" disabled={isProcessing}>
          <LinkIcon className="size-3.5" />
          youtube
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload">
        <div
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!isProcessing) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'rounded-sm border border-dashed border-border p-6 text-center transition-colors',
            isProcessing
              ? 'cursor-not-allowed opacity-50'
              : 'cursor-pointer hover:border-primary/60 hover:bg-primary/5',
            isDragging && 'border-primary bg-primary/10 shadow-glow-sm'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={(e) => validateAndSelect(e.target.files?.[0])}
            disabled={isProcessing}
            className="hidden"
          />
          <Terminal className="mx-auto mb-3 size-8 text-primary/70" />
          <p className="text-xs font-medium text-foreground">
            <span className="text-primary">$</span> drop video file or click to browse
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            mp4 · avi · mov · mkv · webm — max 2gb
          </p>
        </div>
      </TabsContent>

      <TabsContent value="youtube">
        <form onSubmit={handleYouTubeSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-primary">
              &gt;
            </span>
            <Input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              disabled={isProcessing}
              className="pl-7"
              spellCheck={false}
            />
          </div>
          <Button type="submit" disabled={isProcessing || !youtubeUrl.trim()}>
            {isProcessing ? 'running…' : 'execute'}
          </Button>
        </form>
      </TabsContent>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle />
          <AlertTitle>input error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </Tabs>
  );
};

export default VideoInput;
