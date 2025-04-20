import { Card } from '@/components/ui/card';

interface PreviewProps {
  content?: string;
}

export function Preview({ content }: PreviewProps) {
  if (!content) {
    return (
      <Card className="h-full flex items-center justify-center text-muted-foreground">
        No preview available
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <iframe
        srcDoc={content}
        className="w-full h-full border-0"
        sandbox="allow-scripts"
      />
    </Card>
  );
}