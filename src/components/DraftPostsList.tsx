import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { FileText, Edit, Save, Trash2, Send, Clock, Facebook, Twitter, Linkedin, Instagram, ExternalLink } from 'lucide-react';
import { usePosts, ScheduledPost } from '@/contexts/PostsContext';
import { useToast } from '@/hooks/use-toast';
import { PlatformSelector } from '@/components/PlatformSelector';

const PLATFORM_ICONS = {
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: ExternalLink
};

const PLATFORM_COLORS = {
  facebook: 'bg-blue-500',
  twitter: 'bg-sky-500',
  linkedin: 'bg-blue-700',
  instagram: 'bg-pink-500',
  youtube: 'bg-red-500'
};

export const DraftPostsList: React.FC = () => {
  const { scheduledPosts, loading, updateScheduledPost, deleteScheduledPost } = usePosts();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editPlatforms, setEditPlatforms] = useState<string[]>([]);

  const handleEdit = (post: ScheduledPost) => {
    setEditingId(post.id);
    setEditContent(post.content);
    setEditPlatforms([...post.platforms]);
  };

  const handleSave = async (post: ScheduledPost) => {
    try {
      await updateScheduledPost(post.id, {
        content: editContent,
        platforms: editPlatforms,
        title: editContent.slice(0, 50) + (editContent.length > 50 ? '...' : '')
      });
      
      setEditingId(null);
      toast({
        title: "Draft Updated",
        description: "Your draft has been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update the draft.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleDelete = async (post: ScheduledPost) => {
    try {
      await deleteScheduledPost(post.id);
      toast({
        title: "Draft Deleted",
        description: "Draft has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the draft.",
        variant: "destructive",
      });
    }
  };

  const handleSchedule = async (post: ScheduledPost) => {
    try {
      await updateScheduledPost(post.id, {
        status: 'scheduled',
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000) // Schedule for tomorrow
      });
      
      toast({
        title: "Draft Scheduled",
        description: "Your draft has been scheduled for tomorrow.",
      });
    } catch (error) {
      toast({
        title: "Scheduling Failed",
        description: "Failed to schedule the draft.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const draftPosts = scheduledPosts.filter(post => post.status === 'draft');

  if (draftPosts.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No draft posts</h3>
        <p className="mt-1 text-sm text-gray-500">
          Your saved drafts will appear here once you start creating content.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {draftPosts.map((post) => {
        const isEditing = editingId === post.id;
        
        return (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{post.title}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Last edited on {post.updated_at.toLocaleDateString()} at {post.updated_at.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleSave(post)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleSchedule(post)}
                        variant="outline"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleEdit(post)}
                        variant="outline"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(post)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Content */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Content:</Label>
                  {isEditing ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[120px] resize-none"
                      placeholder="Write your post content..."
                    />
                  ) : (
                    <p className="text-gray-700 line-clamp-3">{post.content}</p>
                  )}
                </div>

                {/* Platforms */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Platforms:</Label>
                  {isEditing ? (
                    <PlatformSelector
                      selectedPlatforms={editPlatforms}
                      onPlatformChange={setEditPlatforms}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {post.platforms.map((platform) => {
                        const Icon = PLATFORM_ICONS[platform as keyof typeof PLATFORM_ICONS];
                        const color = PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS];
                        return (
                          <Badge key={platform} className={`${color} text-white`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Time Zone:</span> {post.time_zone}
                  </div>
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div>
                      <span className="font-medium">Media:</span> {post.media_urls.length} file(s)
                    </div>
                  )}
                </div>

                {/* Character Count */}
                {isEditing && (
                  <div className="text-right">
                    <span className={`text-sm ${editContent.length > 280 ? 'text-red-500' : 'text-gray-500'}`}>
                      {editContent.length} characters
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
