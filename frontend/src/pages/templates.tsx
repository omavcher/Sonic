import { useState } from 'react';
import { sampleTemplates } from '@/lib/sample-data';
import { TemplateCard } from '@/components/templates/template-card';
import { CodeEditor } from '@/components/editor/code-editor';

export function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(sampleTemplates[0]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="mb-4 text-3xl font-bold">Start a New Project</h1>
        <p className="text-lg text-muted-foreground">
          Choose from our collection of starter templates to begin your project.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Templates</h2>
          <div className="grid gap-4">
            {sampleTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                name={template.name}
                description={template.description}
                tags={template.tags}
                onClick={() => setSelectedTemplate(template)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Preview</h2>
          <CodeEditor files={selectedTemplate.files} />
        </div>
      </div>
    </div>
  );
}