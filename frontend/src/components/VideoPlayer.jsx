import React, { useRef, useEffect } from 'react';
import { Film } from 'lucide-react';

const VideoPlayer = ({ videoFile, youtubeUrl }) => {
  const videoRef = useRef(null);

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
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-100 to-surface-50 rounded-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-50 rounded-2xl mb-4">
            <Film className="text-primary-400" size={40} />
          </div>
          <p className="text-gray-500 font-medium">No video selected</p>
          <p className="text-sm text-gray-400 mt-1">Upload a video or enter a YouTube URL to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-950 rounded-2xl ring-1 ring-white/10 overflow-hidden">
      {videoFile && (
        <video
          ref={videoRef}
          controls
          className="w-full h-full object-contain"
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      )}
      {youtubeUrl && !videoFile && (
        <div className="w-full h-full flex items-center justify-center p-8">
          <div className="text-center text-white">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl mb-4">
              <Film size={40} />
            </div>
            <p className="font-medium">YouTube Video</p>
            <p className="text-sm text-gray-300 mt-2 break-all max-w-md">
              {youtubeUrl}
            </p>
            <p className="text-xs text-gray-400 mt-4">
              Video preview not available for YouTube URLs
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
