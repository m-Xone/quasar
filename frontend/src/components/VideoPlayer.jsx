import React, { useRef, useEffect, useMemo } from 'react';
import { Film, MonitorPlay } from 'lucide-react';

/** Extract the 11-char YouTube video id from common URL shapes. */
export function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

const VideoPlayer = ({ videoFile, youtubeUrl }) => {
  const videoRef = useRef(null);
  const youtubeId = useMemo(() => getYouTubeId(youtubeUrl), [youtubeUrl]);

  useEffect(() => {
    if (videoFile && videoRef.current) {
      const url = URL.createObjectURL(videoFile);
      videoRef.current.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [videoFile]);

  if (!videoFile && !youtubeUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-border bg-card/40">
        <div className="text-center">
          <MonitorPlay className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            no signal
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            awaiting video input…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-sm border border-border bg-black">
      {videoFile && (
        <video
          ref={videoRef}
          controls
          className="h-full w-full object-contain"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      )}
      {!videoFile && youtubeId && (
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          title="YouTube video preview"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
      {!videoFile && youtubeUrl && !youtubeId && (
        <div className="flex h-full w-full items-center justify-center p-6">
          <div className="text-center">
            <Film className="mx-auto mb-3 size-10 text-muted-foreground/50" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              youtube source
            </p>
            <p className="mt-2 max-w-md break-all text-[10px] text-muted-foreground/70">
              {youtubeUrl}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
