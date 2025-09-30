import React, { useState } from 'react';
import { ConnectedAccountSelector } from '@/components/ConnectedAccountSelector';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ImagePlus, Hash, AtSign, Eye, Calendar as CalendarIcon, Clock, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePosts } from '@/contexts/PostsContext';
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';
import { productionPostingService } from '@/services/productionPostingService';
import { getUserTimezone } from '@/utils/timezoneUtils';

export const CreatePost: React.FC = () => {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('12:00');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const { addScheduledPost } = usePosts();
  const { getActiveAccounts } = useSocialAccounts();

  const maxCharacters = 280; // Default to Twitter's limit, could be dynamic per platform

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setMediaFiles((prev) => [...prev, ...files]);
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (selectedAccountIds.length === 0) {
      toast.error('Please select at least one account');
      return;
    }

    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }

    setIsPublishing(true);

    try {
      const activeAccounts = getActiveAccounts();
      const selectedAccounts = activeAccounts.filter(account => 
        selectedAccountIds.includes(account.id)
      );
      const platforms = selectedAccounts.map(account => account.platform);

      if (isScheduled && scheduledDate) {
        // Save as scheduled post
        const [hours, minutes] = scheduledTime.split(':');
        const fullScheduledDate = new Date(scheduledDate);
        fullScheduledDate.setHours(parseInt(hours), parseInt(minutes));

        await addScheduledPost({
          title: content.substring(0, 50),
          content,
          status: 'scheduled',
          scheduled_for: fullScheduledDate,
          platforms,
          media_urls: [],
          time_zone: getUserTimezone(),
        });

        toast.success('Post scheduled successfully!');
      } else {
        // Publish immediately
        const postToPublish = {
          id: Date.now().toString(),
          user_id: 'temp',
          title: content.substring(0, 50),
          content,
          platforms,
          scheduled_for: new Date(),
          status: 'publishing' as const,
          color: 'bg-blue-500',
          media_urls: [],
          time_zone: getUserTimezone(),
          created_at: new Date(),
          updated_at: new Date()
        };

        await productionPostingService.publishPost(postToPublish, selectedAccounts);
        toast.success('Post published successfully!');
      }

      // Reset form
      setContent('');
      setSelectedAccountIds([]);
      setMediaFiles([]);
      setScheduledDate(undefined);
      setScheduledTime('12:00');
      setIsScheduled(false);
    } catch (error: any) {
      console.error('Publishing error:', error);
      toast.error(error.message || 'Failed to publish post');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }

    try {
      const activeAccounts = getActiveAccounts();
      const selectedAccounts = activeAccounts.filter(account => 
        selectedAccountIds.includes(account.id)
      );
      const platforms = selectedAccounts.map(account => account.platform);

      await addScheduledPost({
        title: content.substring(0, 50),
        content,
        status: 'draft',
        scheduled_for: new Date(),
        platforms,
        media_urls: [],
        time_zone: getUserTimezone(),
      });

      toast.success('Draft saved successfully!');
      
      // Reset form
      setContent('');
      setSelectedAccountIds([]);
      setMediaFiles([]);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    }
  };

  const isPublishDisabled = selectedAccountIds.length === 0 || !content.trim() || isPublishing;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card p-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">
            Create New Post
          </h1>
          <p className="text-slate-600 mt-2">
            Share your content across multiple platforms in one click
          </p>
        </div>

        {/* Account Selection */}
        <Card className="glass-card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Accounts</h2>
          <ConnectedAccountSelector 
            selectedAccountIds={selectedAccountIds}
            onAccountChange={setSelectedAccountIds}
          />
        </Card>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Post Content */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="glass-card p-6">
              <Textarea
                placeholder="What would you like to share?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] text-lg border-0 bg-transparent focus-visible:ring-0 resize-none"
                maxLength={maxCharacters}
              />
              
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  {/* Media Upload */}
                  <label className="glass-button p-2 rounded-lg cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleMediaUpload}
                      className="hidden"
                    />
                    <ImagePlus className="h-5 w-5 text-slate-600" />
                  </label>

                  {/* Hash button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="glass-button p-2 rounded-lg"
                    onClick={() => setContent(content + ' #')}
                  >
                    <Hash className="h-5 w-5 text-slate-600" />
                  </Button>

                  {/* Mention button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="glass-button p-2 rounded-lg"
                    onClick={() => setContent(content + ' @')}
                  >
                    <AtSign className="h-5 w-5 text-slate-600" />
                  </Button>
                </div>

                {/* Character Counter */}
                <span className={cn(
                  "text-sm font-medium",
                  content.length > maxCharacters * 0.9 ? "text-red-500" : "text-slate-500"
                )}>
                  {content.length} / {maxCharacters}
                </span>
              </div>

              {/* Media Preview */}
              {mediaFiles.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Upload ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => handleRemoveMedia(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Scheduling & Options */}
          <div className="space-y-4">
            <Card className="glass-card p-6 space-y-6">
              <h3 className="font-semibold text-slate-900">Publishing Options</h3>

              {/* Schedule Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="schedule-toggle" className="text-sm font-medium">
                  Schedule Post
                </Label>
                <Switch
                  id="schedule-toggle"
                  checked={isScheduled}
                  onCheckedChange={setIsScheduled}
                />
              </div>

              {/* Date & Time Picker */}
              {isScheduled && (
                <div className="space-y-4 animate-fade-in">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal glass-button",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 glass-card" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-600" />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="flex-1 glass-button px-3 py-2 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Save as Draft */}
              <Button
                variant="outline"
                className="w-full glass-button hover-lift"
                onClick={handleSaveDraft}
                disabled={!content.trim()}
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>

              {/* Preview */}
              <Button
                variant="outline"
                className="w-full glass-button hover-lift"
                disabled={!content.trim()}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </Card>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex justify-end">
          <Button
            size="lg"
            className={cn(
              "glass-card px-8 py-6 text-lg font-semibold",
              !isPublishDisabled && "hover-glow bg-gradient-to-r from-brand-500 to-purple-600 text-white border-0"
            )}
            onClick={handlePublish}
            disabled={isPublishDisabled}
          >
            {isPublishing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Publishing...
              </>
            ) : (
              <>
                {isScheduled ? 'Schedule Post' : 'Publish in One Click'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
