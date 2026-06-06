import React, { useState } from 'react';
import { History, Youtube, FileVideo, Trash2, Plus, Database } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn, formatRelativeTime, formatBytes } from '@/lib/utils';

const HistorySidebar = ({
  sessions,
  activeId,
  isProcessing,
  onSelect,
  onDelete,
  onClearAll,
  onNewAnalysis,
}) => {
  const [clearOpen, setClearOpen] = useState(false);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-card/50 max-lg:hidden">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <History className="size-4" />
          <span>history</span>
        </div>
        <Badge variant="outline">{sessions.length}</Badge>
      </div>
      <Separator />

      {/* New analysis */}
      <div className="p-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={isProcessing}
          onClick={onNewAnalysis}
        >
          <Plus />
          new analysis
        </Button>
      </div>

      {/* Session list */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 px-3 pb-3">
          {sessions.length === 0 && (
            <div className="px-2 py-8 text-center">
              <Database className="mx-auto mb-3 size-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">
                // no stored sessions
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/60">
                completed analyses persist here across reloads
              </p>
            </div>
          )}

          {sessions.map((session) => (
            <div
              key={session.id}
              role="button"
              tabIndex={0}
              onClick={() => !isProcessing && onSelect(session)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
                  e.preventDefault();
                  onSelect(session);
                }
              }}
              className={cn(
                'group relative cursor-pointer rounded-sm border border-transparent px-3 py-2.5 transition-colors',
                'hover:border-border hover:bg-secondary/60',
                activeId === session.id &&
                  'border-primary/40 bg-primary/10 hover:border-primary/40 hover:bg-primary/10',
                isProcessing && 'pointer-events-none opacity-50'
              )}
            >
              <div className="flex items-start gap-2">
                {session.source === 'youtube' ? (
                  <Youtube className="mt-0.5 size-3.5 shrink-0 text-accent" />
                ) : (
                  <FileVideo className="mt-0.5 size-3.5 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-xs font-medium',
                      activeId === session.id ? 'text-primary' : 'text-foreground'
                    )}
                    title={session.title}
                  >
                    {session.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatRelativeTime(session.createdAt)}
                    {session.fileSize ? ` · ${formatBytes(session.fileSize)}` : ''}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session.id);
                  }}
                  className="invisible shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:text-destructive group-hover:visible"
                  title="Delete session"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Clear all */}
      {sessions.length > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Dialog open={clearOpen} onOpenChange={setClearOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-destructive"
                  disabled={isProcessing}
                >
                  <Trash2 />
                  purge all
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>purge history?</DialogTitle>
                  <DialogDescription>
                    This permanently deletes all {sessions.length} stored{' '}
                    {sessions.length === 1 ? 'analysis' : 'analyses'} from this
                    browser. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="secondary" size="sm" onClick={() => setClearOpen(false)}>
                    abort
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      onClearAll();
                      setClearOpen(false);
                    }}
                  >
                    confirm purge
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </>
      )}
    </aside>
  );
};

export default HistorySidebar;
