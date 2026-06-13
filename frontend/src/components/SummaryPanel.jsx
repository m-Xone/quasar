import React, { useEffect, useRef } from 'react';
import { FileText, Loader2, AlertCircle, ScanSearch } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const SummaryPanel = ({ summary, isStreaming, error, statusMessage }) => {
  const summaryEndRef = useRef(null);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming && summaryEndRef.current) {
      summaryEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [summary, isStreaming]);

  if (!summary && !isStreaming && !error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-border bg-card/40">
        <div className="max-w-md px-6 text-center">
          <ScanSearch className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            stdout empty
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            analysis output streams here in real time
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-sm border border-border bg-card animate-fade-in">
      {/* Panel header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-secondary/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            analysis output
          </span>
        </div>
        {isStreaming && (
          <Badge variant="accent">
            <Loader2 className="size-3 animate-spin" />
            streaming
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>analysis failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="prose prose-invert max-w-none prose-headings:font-mono prose-headings:text-primary prose-h1:text-xl prose-h2:mt-8 prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:text-lg prose-h3:text-base prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground/85 prose-li:text-sm prose-li:text-foreground/85 prose-strong:text-foreground prose-a:text-accent prose-code:text-accent prose-blockquote:border-l-primary/50 prose-blockquote:text-muted-foreground prose-table:text-sm prose-th:text-primary">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={(url) => {
                // Allow data URIs for base64 screenshots
                if (url.startsWith('data:image/')) {
                  return url;
                }
                return url;
              }}
              components={{
                img: ({ node, src, alt, ...props }) => (
                  <img
                    className="my-4 h-auto max-w-full rounded-sm border border-border"
                    src={src}
                    alt={alt}
                    loading="lazy"
                    {...props}
                  />
                ),
              }}
            >
              {summary}
            </ReactMarkdown>
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-2 animate-blink bg-primary align-text-bottom" />
            )}
            <div ref={summaryEndRef} />
          </div>
        )}

        {/* Status message (e.g., "Extracting screenshots...") */}
        {statusMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-sm border border-accent/30 bg-accent/5 px-3 py-2">
            <Loader2 className="size-3.5 animate-spin text-accent" />
            <span className="text-xs text-accent">{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryPanel;
