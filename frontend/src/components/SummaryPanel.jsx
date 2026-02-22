import React, { useEffect, useRef } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SummaryPanel = ({ summary, isStreaming, error, statusMessage }) => {
  const summaryEndRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (isStreaming && summaryEndRef.current) {
      summaryEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [summary, isStreaming]);

  if (!summary && !isStreaming && !error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-100 to-surface-50 rounded-2xl">
        <div className="text-center max-w-md px-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-50 rounded-2xl mb-4">
            <FileText className="text-primary-400" size={40} />
          </div>
          <p className="text-gray-500 font-medium">No summary yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Upload a video or enter a YouTube URL to generate an AI-powered summary
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col glass rounded-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-primary-100/50 bg-gradient-to-r from-primary-50/80 to-surface-100">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-primary-500" />
          <h2 className="text-lg font-semibold text-gray-800">Video Summary</h2>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-2 text-sm text-primary-600">
            <Loader2 size={16} className="animate-spin" />
            <span>Analyzing...</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {error ? (
          <div className="bg-red-50/80 border border-red-200/60 rounded-xl p-4">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        ) : (
          <div className="prose prose-slate max-w-none prose-p:text-gray-600 prose-headings:text-gray-900">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={(url) => {
                // Allow data URIs for base64 images
                if (url.startsWith('data:image/')) {
                  return url;
                }
                // For other URLs, use default behavior
                return url;
              }}
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-8 mb-3 border-b border-primary-100/50 pb-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-5 mb-2" {...props} />,
                p: ({node, ...props}) => <p className="mb-3 leading-relaxed text-gray-600" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-3 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-3 space-y-1" {...props} />,
                li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />,
                img: ({node, src, alt, ...props}) => {
                  console.log('Rendering image:', { alt, srcLength: src?.length, srcStart: src?.substring(0, 50) });
                  return (
                    <img
                      className="rounded-xl shadow-card ring-1 ring-black/5 my-4 max-w-full h-auto"
                      src={src}
                      alt={alt}
                      {...props}
                      loading="lazy"
                      onError={(e) => {
                        console.error('Image failed to load:', { alt, srcLength: src?.length });
                        console.error('Error event:', e);
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', alt);
                      }}
                    />
                  );
                },
              }}
            >
              {summary}
            </ReactMarkdown>
            <div ref={summaryEndRef} />
          </div>
        )}

        {/* Status message (e.g., "Extracting screenshots...") */}
        {statusMessage && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-primary-50/80 border border-primary-200/50 rounded-xl">
            <Loader2 size={16} className="animate-spin text-primary-500" />
            <span className="text-sm text-primary-800 font-medium">{statusMessage}</span>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && !statusMessage && (
          <div className="flex items-center gap-2 mt-4 text-gray-500">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryPanel;
