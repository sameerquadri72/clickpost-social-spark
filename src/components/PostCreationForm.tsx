
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlatformSelector } from '@/components/PlatformSelector';
import { MediaUpload } from '@/components/MediaUpload';
import { PostPreview } from '@/components/PostPreview';
import { Save, Send, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLATFORM_LIMITS = {
  facebook: 63206,
  twitter: 280,
  linkedin: 3000,
  instagram: 2200
};

export const PostCreationForm: React.FC = () => {
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook']);
  const [uploadedMedia, setUploadedMedia] = useState<File[]>([]);
  const { toast } = useToast();

  const getCharacterLimit = () => {
    if (selectedPlatforms.length === 1) {
      return PLATFORM_LIMITS[selectedPlatforms[0] as keyof typeof PLATFORM_LIMITS];
    }
    return Math.min(...selectedPlatforms.map(platform => 
      PLATFORM_LIMITS[platform as keyof typeof PLATFORM_LIMITS]
    ));
  };

  const currentLimit = getCharacterLimit();
  const isOverLimit = content.length > currentLimit;

  const handleSaveDraft = () => {
    toast({
      title: "Draft Saved",
      description: "Your post has been saved as a draft.",
    });
  };

  const handleSchedulePost = () => {
    toast({
      title: "Schedule Post",
      description: "Scheduling interface coming soon!",
    });
  };

  const handlePostNow = () => {
    if (isOverLimit) {
      toast({
        title: "Character Limit Exceeded",
        description: `Your post exceeds the ${currentLimit} character limit.`,
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Post Publishing",
      description: "Social media API integration coming soon!",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Creation Form */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Create Your Post</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Platform Selection */}
            <div>
              <Label htmlFor="platforms">Select Platforms</Label>
              <PlatformSelector 
                selectedPlatforms={selectedPlatforms}
                onPlatformChange={setSelectedPlatforms}
              />
            </div>

            {/* Content Input */}
            <div>
              <Label htmlFor="content">Post Content</Label>
              <Textarea
                id="content"
                placeholder="What's on your mind? Share your thoughts with your audience..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`min-h-[200px] resize-none ${isOverLimit ? 'border-red-500' : ''}`}
              />
              <div className="flex justify-between items-center mt-2">
                <span className={`text-sm ${isOverLimit ? 'text-red-500' : 'text-slate-500'}`}>
                  {content.length} / {currentLimit} characters
                </span>
                {selectedPlatforms.length > 1 && (
                  <span className="text-xs text-slate-400">
                    Limit based on most restrictive platform
                  </span>
                )}
              </div>
            </div>

            {/* Media Upload */}
            <div>
              <Label>Media</Label>
              <MediaUpload 
                onMediaUpload={setUploadedMedia}
                uploadedMedia={uploadedMedia}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handlePostNow} className="gradient-bg text-white">
                <Send className="h-4 w-4 mr-2" />
                Post Now
              </Button>
              <Button onClick={handleSchedulePost} variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Schedule
              </Button>
              <Button onClick={handleSaveDraft} variant="outline">
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      <div className="space-y-6">
        <PostPreview 
          content={content}
          selectedPlatforms={selectedPlatforms}
          uploadedMedia={uploadedMedia}
        />
      </div>
    </div>
  );
};
