import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface TemplateCardProps {
  name: string;
  description: string;
  tags: string[];
  onClick: () => void;
}

export function TemplateCard({ name, description, tags, onClick }: TemplateCardProps) {
  return (
    <Card className="group cursor-pointer transition-all hover:shadow-lg" onClick={onClick}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {name}
          <ArrowRight className="h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100" />
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}