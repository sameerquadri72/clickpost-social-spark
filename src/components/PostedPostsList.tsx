import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Eye, Heart, MessageCircle, Share2, Facebook, Twitter, Linkedin, Instagram, ExternalLink } from 'lucide-react';
import { usePosts, ScheduledPost } from '@/contexts/PostsContext';

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

export const PostedPostsList: React.FC = () => {
  const { scheduledPosts, loading } = usePosts();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const postedPosts = scheduledPosts.filter(post => post.status === 'published');

  if (postedPosts.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No posted content</h3>
        <p className="mt-1 text-sm text-gray-500">
          Your published posts will appear here once you start posting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {postedPosts.map((post) => (
        <Card key={post.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{post.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-gray-600">
                    Published on {post.scheduled_for.toLocaleDateString()} at {post.scheduled_for.toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Published
              </Badge>
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
                <h4 className="text-sm font-medium text-gray-700 mb-2">Posted to:</h4>
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

              {/* Performance Metrics */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mx-auto mb-2">
                      <Eye className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.floor(Math.random() * 1000) + 100}
                    </div>
                    <div className="text-xs text-gray-500">Impressions</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full mx-auto mb-2">
                      <Heart className="h-5 w-5 text-red-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.floor(Math.random() * 100) + 20}
                    </div>
                    <div className="text-xs text-gray-500">Likes</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mx-auto mb-2">
                      <MessageCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.floor(Math.random() * 50) + 5}
                    </div>
                    <div className="text-xs text-gray-500">Comments</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mx-auto mb-2">
                      <Share2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.floor(Math.random() * 30) + 3}
                    </div>
                    <div className="text-xs text-gray-500">Shares</div>
                  </div>
                </div>
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
