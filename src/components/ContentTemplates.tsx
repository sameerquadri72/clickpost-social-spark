
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Trash2, Copy } from 'lucide-react';

const DEFAULT_TEMPLATES = [
  {
    id: '1',
    name: 'Product Launch',
    content: '🚀 Exciting news! We\'re thrilled to announce the launch of [PRODUCT NAME]!\n\n✨ Key features:\n• [Feature 1]\n• [Feature 2]\n• [Feature 3]\n\nLearn more: [LINK]\n\n#ProductLaunch #Innovation #NewProduct',
    category: 'Marketing',
    platforms: ['facebook', 'linkedin', 'twitter']
  },
  {
    id: '2',
    name: 'Behind the Scenes',
    content: '👀 Behind the scenes at [COMPANY NAME]!\n\nOur amazing team is working hard to bring you [PROJECT/PRODUCT]. Here\'s a sneak peek of what goes into making it happen.\n\n#BehindTheScenes #TeamWork #Process',
    category: 'Engagement',
    platforms: ['instagram', 'facebook']
  },
  {
    id: '3',
    name: 'Industry Insight',
    content: '💡 Industry Insight: [TOPIC]\n\nKey takeaways:\n1. [Point 1]\n2. [Point 2]\n3. [Point 3]\n\nWhat are your thoughts on this trend? Let us know in the comments!\n\n#Industry #Insights #Trending',
    category: 'Thought Leadership',
    platforms: ['linkedin', 'twitter']
  }
];

interface ContentTemplatesProps {
  onSelectTemplate: (template: any) => void;
}

export const ContentTemplates: React.FC<ContentTemplatesProps> = ({
  onSelectTemplate
}) => {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    category: '',
    platforms: [] as string[]
  });

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) return;

    const template = {
      id: Date.now().toString(),
      ...newTemplate
    };

    setTemplates([...templates, template]);
    setNewTemplate({ name: '', content: '', category: '', platforms: [] });
    setShowCreateForm(false);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  const handleUseTemplate = (template: any) => {
    onSelectTemplate(template);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Content Templates
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showCreateForm && (
          <div className="p-4 border rounded-lg space-y-3">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                placeholder="Enter template name"
              />
            </div>
            <div>
              <Label htmlFor="template-content">Content</Label>
              <Textarea
                id="template-content"
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                placeholder="Enter template content (use [PLACEHOLDER] for variables)"
                className="min-h-[100px]"
              />
            </div>
            <div>
              <Label htmlFor="template-category">Category</Label>
              <Input
                id="template-category"
                value={newTemplate.category}
                onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                placeholder="e.g., Marketing, Engagement"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateTemplate} size="sm">
                Create Template
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)} size="sm">
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="p-4 border rounded-lg hover:bg-slate-50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">{template.name}</h4>
                  <Badge variant="outline" className="mt-1">
                    {template.category}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-2 line-clamp-3">
                {template.content}
              </p>
              <div className="flex gap-1">
                {template.platforms.map((platform) => (
                  <Badge key={platform} variant="secondary" className="text-xs">
                    {platform}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
