import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConnectedAccountSelector } from '@/components/ConnectedAccountSelector';
import { MediaUpload } from '@/components/MediaUpload';
import { PostPreview } from '@/components/PostPreview';
import { ScheduledPostsList } from '@/components/ScheduledPostsList';
import { PostedPostsList } from '@/components/PostedPostsList';
import { DraftPostsList } from '@/components/DraftPostsList';
import { Save, Send, Clock, FileText, Calendar, CheckCircle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePosts } from '@/contexts/PostsContext';
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';
import { productionPostingService } from '@/services/productionPostingService';
import { getUserTimezone, localTimeToUTC } from '@/utils/timezoneUtils';

const PLATFORM_LIMITS = {
  facebook: 63206,
  twitter: 280,
  linkedin: 3000,
  instagram: 2200
};

export const PostCreationForm: React.FC = () => {
const [content, setContent] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<File[]>([]);
  const [activeTab, setActiveTab] = useState('scheduled');
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();
  const { addScheduledPost } = usePosts();
  const { getActiveAccounts } = useSocialAccounts();
  const userTimezone = getUserTimezone();

  // Auto-save functionality
  useEffect(() => {
    const autoSave = setInterval(() => {
      if (content.trim()) {
        const draftData = {
          content,
          selectedAccountIds,
          uploadedMedia: uploadedMedia.map(file => file.name),
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('postDraft', JSON.stringify(draftData));
        console.log('Auto-saved draft');
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSave);
  }, [content, selectedAccountIds, uploadedMedia]);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('postDraft');
    if (savedDraft) {
      try {
        const draftData = JSON.parse(savedDraft);
        setContent(draftData.content || '');
        setSelectedAccountIds(draftData.selectedAccountIds || []);
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, []);

  const getCharacterLimit = () => {
    const activeAccounts = getActiveAccounts();
    const selectedAccounts = activeAccounts.filter(account => 
      selectedAccountIds.includes(account.id)
    );
    
    if (selectedAccounts.length === 0) return 280; // Default Twitter limit
    
    const platforms = selectedAccounts.map(account => account.platform);
    if (platforms.length === 1) {
      return PLATFORM_LIMITS[platforms[0] as keyof typeof PLATFORM_LIMITS] || 280;
    }
    return Math.min(...platforms.map(platform => 
      PLATFORM_LIMITS[platform as keyof typeof PLATFORM_LIMITS] || 280
    ));
  };

  const currentLimit = getCharacterLimit();
  const isOverLimit = content.length > currentLimit;

  const handleSaveDraft = () => {
    const draftData = {
      content,
      selectedAccountIds,
      uploadedMedia: uploadedMedia.map(file => file.name),
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('postDraft', JSON.stringify(draftData));
    
    toast({
      title: "Draft Saved",
      description: "Your post has been saved as a draft.",
    });
  };

  const handleSchedulePost = async (scheduleData: any) => {
    if (isOverLimit) {
      toast({
        title: "Character Limit Exceeded",
        description: `Your post exceeds the ${currentLimit} character limit.`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Add the scheduled post to the context
             // Convert local time to UTC for storage
       const utcScheduledTime = localTimeToUTC(scheduleData.dateTime, scheduleData.timeZone || userTimezone);
       
       const activeAccounts = getActiveAccounts();
       const selectedAccounts = activeAccounts.filter(account => 
         selectedAccountIds.includes(account.id)
       );
       const platforms = selectedAccounts.map(account => account.platform);

       // Upload media files first if any
       const mediaUrls: string[] = [];
       for (const file of uploadedMedia) {
         try {
           // Create a simple data URL for now - in production, upload to storage
           const dataUrl = await new Promise<string>((resolve) => {
             const reader = new FileReader();
             reader.onload = (e) => resolve(e.target?.result as string);
             reader.readAsDataURL(file);
           });
           mediaUrls.push(dataUrl);
         } catch (error) {
           console.error('Failed to process media file:', error);
         }
       }

       await addScheduledPost({
         title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
         content,
         platforms,
         scheduled_for: utcScheduledTime,
         status: 'scheduled',
         media_urls: mediaUrls,
         time_zone: scheduleData.timeZone || userTimezone,
         repeat: scheduleData.repeat
       });
      
      console.log('Scheduling post:', { content, selectedAccountIds, uploadedMedia, scheduleData });
      toast({
        title: "Post Scheduled",
        description: `Your post has been scheduled for ${scheduleData.dateTime.toLocaleString()}`,
      });
      
      // Clear the form after scheduling
      setContent('');
      setUploadedMedia([]);
      localStorage.removeItem('postDraft');
    } catch (error) {
      console.error('Failed to schedule post:', error);
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule your post. Please try again.",
        variant: "destructive",
      });
    }
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

    if (!content.trim()) {
      toast({
        title: "Empty Post",
        description: "Please add some content to your post.",
        variant: "destructive",
      });
      return;
    }

    const activeAccounts = getActiveAccounts();
    const selectedAccounts = activeAccounts.filter(account => 
      selectedAccountIds.includes(account.id)
    );

    if (selectedAccounts.length === 0) {
      toast({
        title: "No Connected Accounts",
        description: "Please select at least one connected account to post to.",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting post publishing process...');
    console.log('Selected accounts:', selectedAccounts);
    console.log('Content:', content);

    setIsPosting(true);

    // For now, we'll handle text posts only. Media upload would require proper storage setup
    const mediaUrls: string[] = [];
    
    if (uploadedMedia.length > 0) {
      toast({
        title: "Media Not Supported Yet",
        description: "Media posting will be available soon. Posting text only.",
        variant: "destructive",
      });
      // Still proceed with text-only posting
    }

    const platforms = selectedAccounts.map(account => account.platform);

    // Create a temporary post object for publishing
    const postToPublish = {
      id: Date.now().toString(),
      user_id: 'temp', // Will be set by service
      title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
      content,
      platforms,
      scheduled_for: new Date(),
      status: 'publishing' as const,
      color: 'bg-blue-500',
      media_urls: mediaUrls,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      created_at: new Date(),
      updated_at: new Date()
    };

    try {
      toast({
        title: "Publishing Post",
        description: "Your post is being published to selected platforms...",
      });

      console.log('Calling productionPostingService.publishPost...');
      const results = await productionPostingService.publishPost(postToPublish, selectedAccounts);
      console.log('Publishing results:', results);
      
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
    } finally {
      setIsPosting(false);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setContent(template.content);
    // Map template platforms to account IDs
    const activeAccounts = getActiveAccounts();
    const matchingAccountIds = activeAccounts
      .filter(account => template.platforms.includes(account.platform))
      .map(account => account.id);
    setSelectedAccountIds(matchingAccountIds);
    setActiveTab('create');
    
    toast({
      title: "Template Applied",
      description: `"${template.name}" template has been applied to your post.`,
    });
  };

  return (
    <div className="flex gap-6">
      {/* Main Content Interface */}
      <div className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scheduled" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="posted" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Posted
            </TabsTrigger>
            <TabsTrigger value="drafts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Drafts
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scheduled" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Posts</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage your scheduled posts across all platforms
                </p>
              </CardHeader>
              <CardContent>
                <ScheduledPostsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posted" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Posted Content</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View all your published posts and their performance
                </p>
              </CardHeader>
              <CardContent>
                <PostedPostsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drafts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Draft Posts</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Edit and manage your saved drafts
                </p>
              </CardHeader>
              <CardContent>
                <DraftPostsList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Your Post</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Account Selection */}
                <div>
                  <Label htmlFor="accounts">Select Connected Accounts</Label>
                  <ConnectedAccountSelector 
                    selectedAccountIds={selectedAccountIds}
                    onAccountChange={setSelectedAccountIds}
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
                    {selectedAccountIds.length > 1 && (
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
                  <Button 
                    onClick={handlePostNow} 
                    disabled={isPosting || !content.trim() || selectedAccountIds.length === 0}
                    className="gradient-bg text-white"
                  >
                    {isPosting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Post Now
                      </>
                    )}
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
        </Tabs>
      </div>

      {/* Sticky Preview Panel */}
      <div className="w-80 flex-shrink-0">
        <div className="sticky top-6 space-y-6">
          <PostPreview 
            content={content}
            selectedPlatforms={getActiveAccounts()
              .filter(account => selectedAccountIds.includes(account.id))
              .map(account => account.platform)
            }
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
                  <span>Accounts:</span>
                  <span>{selectedAccountIds.length}</span>
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
                  <span className="text-green-600">~{selectedAccountIds.length * 1000}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};