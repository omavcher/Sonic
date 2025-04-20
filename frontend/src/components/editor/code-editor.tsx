// CodeEditor.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackFileExplorer,
  SandpackCodeEditor,
  SandpackPreview,
} from '@codesandbox/sandpack-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Eye, Code2, Columns, Files, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useTheme } from '@/lib/themes';
import { cn } from '@/lib/utils';
import SandpackPreviewClient from '@/components/editor/sandpackpreviewclient';

interface CodeEditorProps {
  files: Array<{ name: string; content: string }>;
}

type ViewMode = 'editor' | 'preview' | 'split';

export function CodeEditor({ files }: CodeEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const hoverTimeoutRef = useRef<number>();
  const { theme } = useTheme();

  const sandpackFiles = files.reduce((acc, file) => {
    acc[file.name] = {
      code: file.content,
      active: true,
    };
    return acc;
  }, {} as Record<string, { code: string; active: boolean }>);

  const showEditor = viewMode === 'editor' || viewMode === 'split';
  const showPreview = viewMode === 'preview' || viewMode === 'split';

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = window.setTimeout(() => {
      setIsHovering(false);
    }, 300);
  };

  return (
    <div className="h-full flex flex-col rounded-lg border bg-background overflow-hidden">
      <div className="flex items-center justify-between border-b px-2 h-12">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFileExplorer(!showFileExplorer)}
            className="h-8"
          >
            {showFileExplorer ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
          <div className="h-4 w-[1px] bg-border" />
          <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as ViewMode)}>
            <ToggleGroupItem value="editor" aria-label="Editor view" className="h-8">
              <Code2 className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="preview" aria-label="Preview view" className="h-8">
              <Eye className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="split" aria-label="Split view" className="h-8">
              <Columns className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {/* Hover trigger area */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 z-10"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />

        <SandpackProvider
          template="react"
          files={sandpackFiles}
          theme={theme === 'dark' ? 'dark' : 'light'}
          options={{
            visibleFiles: files.map(f => f.name),
            recompileMode: "immediate",
            recompileDelay: 300,
          }}
        >
          <SandpackLayout className="h-full border-0">
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-60 bg-background border-r transform transition-transform duration-300 z-20",
              (showFileExplorer && (isHovering || showFileExplorer)) ? "translate-x-0" : "-translate-x-full"
            )}>
              <div className="h-full">
                <SandpackFileExplorer />
              </div>
            </div>

            <div className={cn(
              "h-full w-full flex transition-all duration-300",
              showFileExplorer ? "ml-60" : "ml-0"
            )}>
              {showEditor && (
                <div className={`h-full ${showPreview ? 'w-1/2' : 'w-full'}`}>
                  <SandpackCodeEditor
                    showTabs
                    showLineNumbers
                    showInlineErrors
                    wrapContent
                    closableTabs
                    className="h-full"
                  />
                </div>
              )}
              {showPreview && (
                <div className={`h-full ${showEditor ? 'w-1/2' : 'w-full'} border-l`}>
                  <SandpackPreviewClient />
                </div>
              )}
            </div>
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}