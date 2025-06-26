import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlatformSelector } from '@/components/PlatformSelector';
import { MediaUpload } from '@/components/MediaUpload';
import { PostPreview } from '@/components/PostPreview';
import { SchedulingInterface } from '@/components/SchedulingInterface';
import { ContentTemplates } from '@/components/ContentTemplates';
import { Save, Send, Clock, FileText, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePosts } from '@/contexts/PostsContext';
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';
import { realPostingService } from '@/services/realPostingService';

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
  const [activeTab, setActiveTab] = useState('create');
  const { toast } = useToast();
  const { addScheduledPost } = usePosts();
  const { getActiveAccounts } = useSocialAccounts();

  // Auto-save functionality
  useEffect(() => {
    const autoSave = setInterval(() => {
      if (content.trim()) {
        const draftData = {
          content,
          selectedPlatforms,
          uploadedMedia: uploadedMedia.map(file => file.name),
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('postDraft', JSON.stringify(draftData));
        console.log('Auto-saved draft');
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSave);
  }, [content, selectedPlatforms, uploadedMedia]);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('postDraft');
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setContent(draftData.content || '');
        setSelectedPlatforms(draftData.selectedPlatforms || ['facebook']);
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, []);

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
    const draftData = {
      content,
      selectedPlatforms,
      uploadedMedia: uploadedMedia.map(file => file.name),
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('postDraft', JSON.stringify(draftData));
    
    toast({
      title: "Draft Saved",
      description: "Your post has been saved as a draft.",
    });
  };

  const handleSchedulePost = (scheduleData: any) => {
    if (isOverLimit) {
      toast({
        title: "Character Limit Exceeded",
        description: `Your post exceeds the ${currentLimit} character limit.`,
        variant: "destructive",
      });
      return;
    }
    
    // Add the scheduled post to the context
    addScheduledPost({
      title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
      content,
      platforms: selectedPlatforms,
      scheduledFor: scheduleData.dateTime,
      status: 'scheduled',
      media: uploadedMedia,
      timeZone: scheduleData.timeZone,
      repeat: scheduleData.repeat
    });
    
    console.log('Scheduling post:', { content, selectedPlatforms, uploadedMedia, scheduleData });
    toast({
      title: "Post Scheduled",
      description: `Your post has been scheduled for ${scheduleData.dateTime.toLocaleString()}`,
    });
    
    // Clear the form after scheduling
    setContent('');
    setUploadedMedia([]);
    localStorage.removeItem('postDraft');
  };

  const handlePostNow = async () => {
    if (isOverLimit) {
      toast({
        title: "Character Limit Exceeded",
        description: `Your post exceeds the ${currentLimit} character limit.`,
        variant: "destructive",
      });
      return;
    }

    const activeAccounts = getActiveAccounts();
    const selectedAccounts = activeAccounts.filter(account => 
      selectedPlatforms.includes(account.platform)
    );

    if (selectedAccounts.length === 0) {
      toast({
        title: "No Connected Accounts",
        description: "Please connect your social media accounts in the Accounts section.",
        variant: "destructive",
      });
      return;
    }

    // Create a temporary post object for publishing
    const postToPublish = {
      id: Date.now().toString(),
      title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
      content,
      platforms: selectedPlatforms,
      scheduledFor: new Date(),
      status: 'publishing' as const,
      color: 'bg-blue-500',
      media: uploadedMedia,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    try {
      toast({
        title: "Publishing Post",
        description: "Your post is being published to selected platforms...",
      });

      const results = await realPostingService.publishPost(postToPublish, selectedAccounts);
      
      const successfulPosts = results.filter(r => r.success);
      const failedPosts = results.filter(r => !r.success);

      if (successfulPosts.length > 0) {
        toast({
          title: "Post Published Successfully",
          description: `Published to ${successfulPosts.map(r => r.platform).join(', ')}`,
        });
      }

      if (failedPosts.length > 0) {
        toast({
          title: "Some Posts Failed",
          description: `Failed to publish to: ${failedPosts.map(r => `${r.platform} (${r.error})`).join(', ')}`,
          variant: "destructive",
        });
      }

      // Clear form if at least one post was successful
      if (successfulPosts.length > 0) {
        setContent('');
        setUploadedMedia([]);
        localStorage.removeItem('postDraft');
      }

    } catch (error) {
      console.error('Publishing error:', error);
      toast({
        title: "Publishing Failed",
        description: "An error occurred while publishing your post.",
        variant: "destructive",
      });
    }
  };

  const handleTemplateSelect = (template: any) => {
    setContent(template.content);
    setSelectedPlatforms(template.platforms);
    setActiveTab('create');
    
    toast({
      title: "Template Applied",
      description: `"${template.name}" template has been applied to your post.`,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Creation Interface */}
      <div className="lg:col-span-2">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Create
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
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
                  <Button onClick={() => setActiveTab('schedule')} variant="outline">
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
          </TabsContent>

          <TabsContent value="schedule">
            <SchedulingInterface 
              onSchedule={handleSchedulePost}
              selectedPlatforms={selectedPlatforms}
            />
          </TabsContent>

          <TabsContent value="templates">
            <ContentTemplates onSelectTemplate={handleTemplateSelect} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Panel */}
      <div className="space-y-6">
        <PostPreview 
          content={content}
          selectedPlatforms={selectedPlatforms}
          uploadedMedia={uploadedMedia}
        />
        
        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Platforms:</span>
                <span>{selectedPlatforms.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Media Files:</span>
                <span>{uploadedMedia.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Character Count:</span>
                <span className={isOverLimit ? 'text-red-500' : ''}>{content.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Est. Reach:</span>
                <span className="text-green-600">~{selectedPlatforms.length * 1000}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};