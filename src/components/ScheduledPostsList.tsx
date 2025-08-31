import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Edit, Trash2, Play, Facebook, Twitter, Linkedin, Instagram, ExternalLink } from 'lucide-react';
import { usePosts, ScheduledPost } from '@/contexts/PostsContext';
import { useToast } from '@/hooks/use-toast';
import { getUserTimezone, formatTimeInTimezone, getRelativeTime } from '@/utils/timezoneUtils';

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

export const ScheduledPostsList: React.FC = () => {
  const { scheduledPosts, loading, deleteScheduledPost, updateScheduledPost } = usePosts();
  const { toast } = useToast();
  const userTimezone = getUserTimezone();

  const handleDelete = async (post: ScheduledPost) => {
    try {
      await deleteScheduledPost(post.id);
      toast({
        title: "Post Deleted",
        description: "Scheduled post has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete the scheduled post.",
        variant: "destructive",
      });
    }
  };

  const handlePublishNow = async (post: ScheduledPost) => {
    try {
      await updateScheduledPost(post.id, { 
        status: 'publishing',
        scheduled_for: new Date()
      });
      toast({
        title: "Post Published",
        description: "Post is being published now.",
      });
    } catch (error) {
      toast({
        title: "Publish Failed",
        description: "Failed to publish the post immediately.",
        variant: "destructive",
      });
    }
  };

  const formatScheduledTime = (date: Date) => {
    return getRelativeTime(date, userTimezone);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const filteredScheduledPosts = scheduledPosts.filter(post => post.status === 'scheduled');

  if (filteredScheduledPosts.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled posts</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating and scheduling your first post.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredScheduledPosts.map((post) => (
        <Card key={post.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{post.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {formatScheduledTime(post.scheduled_for)}
                  </span>
                  <Badge variant="outline" className="ml-2">
                    {formatTimeInTimezone(post.scheduled_for, userTimezone)}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handlePublishNow(post)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4 mr-1" />
                  Publish Now
                </Button>
                <Button size="sm" variant="outline">
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
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Content Preview */}
              <div>
                <p className="text-gray-700 line-clamp-3">{post.content}</p>
              </div>

              {/* Platforms */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Posting to:</h4>
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
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Time Zone:</span> {post.time_zone}
                </div>
                {post.repeat && post.repeat !== 'none' && (
                  <div>
                    <span className="font-medium">Repeat:</span> {post.repeat}
                  </div>
                )}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="col-span-2">
                    <span className="font-medium">Media:</span> {post.media_urls.length} file(s)
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
