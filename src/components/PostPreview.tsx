
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Facebook, Twitter, Linkedin, Instagram, Image } from 'lucide-react';

const PLATFORM_CONFIG = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-500',
    textColor: 'text-blue-700'
  },
  twitter: {
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-slate-800',
    textColor: 'text-slate-700'
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-blue-600',
    textColor: 'text-blue-700'
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-500',
    textColor: 'text-pink-700'
  }
};

interface PostPreviewProps {
  content: string;
  selectedPlatforms: string[];
  uploadedMedia: File[];
}

export const PostPreview: React.FC<PostPreviewProps> = ({
  content,
  selectedPlatforms,
  uploadedMedia
}) => {
  const formatContentForPlatform = (content: string, platform: string) => {
    const limits = {
      facebook: 63206,
      twitter: 280,
      linkedin: 3000,
      instagram: 2200
    };
    
    const limit = limits[platform as keyof typeof limits];
    if (content.length <= limit) return content;
    
    return content.substring(0, limit - 3) + '...';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Preview
          <Badge variant="outline" className="text-xs">
            {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedPlatforms.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            Select at least one platform to see the preview
          </p>
        ) : (
          selectedPlatforms.map((platformId) => {
            const platform = PLATFORM_CONFIG[platformId as keyof typeof PLATFORM_CONFIG];
            const Icon = platform.icon;
            const formattedContent = formatContentForPlatform(content, platformId);
            
            return (
              <div key={platformId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded ${platform.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className={`text-sm font-medium ${platform.textColor}`}>
                    {platform.name}
                  </span>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center">
                      <span className="text-brand-700 text-sm font-medium">U</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">Your Account</div>
                      <div className="text-xs text-slate-500 mb-2">Just now</div>
                      {formattedContent && (
                        <p className="text-sm text-slate-900 whitespace-pre-wrap break-words">
                          {formattedContent}
                        </p>
                      )}
                      {uploadedMedia.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {uploadedMedia.slice(0, 3).map((file, index) => (
                            <div key={index} className="flex items-center space-x-2 text-xs text-slate-600">
                              <Image className="h-4 w-4" />
                              <span className="truncate max-w-[150px]">{file.name}</span>
                            </div>
                          ))}
                          {uploadedMedia.length > 3 && (
                            <div className="text-xs text-slate-500">
                              +{uploadedMedia.length - 3} more files
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-slate-500">
                  {formattedContent.length} characters
                  {formattedContent.length !== content.length && ' (truncated)'}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};
