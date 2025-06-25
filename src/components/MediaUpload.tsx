
import React, { useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X, Image, Video, File } from 'lucide-react';

interface MediaUploadProps {
  onMediaUpload: (files: File[]) => void;
  uploadedMedia: File[];
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onMediaUpload,
  uploadedMedia
}) => {
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onMediaUpload([...uploadedMedia, ...files]);
  }, [uploadedMedia, onMediaUpload]);

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedMedia.filter((_, i) => i !== index);
    onMediaUpload(newFiles);
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.startsWith('video/')) return Video;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors">
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className="h-10 w-10 text-slate-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-sm text-slate-600">
                Drag and drop your media files here, or click to browse
              </p>
              <p className="text-xs text-slate-500">
                Supports images, videos, and GIFs up to 10MB
              </p>
            </div>
            <input
              type="file"
              multiple
              accept="image/*,video/*,.gif"
              onChange={handleFileSelect}
              className="hidden"
              id="media-upload"
            />
            <Button
              asChild
              variant="outline"
              className="mt-4"
            >
              <label htmlFor="media-upload" className="cursor-pointer">
                Choose Files
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {uploadedMedia.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">Uploaded Media ({uploadedMedia.length})</h4>
          <div className="space-y-2">
            {uploadedMedia.map((file, index) => {
              const FileIcon = getFileIcon(file);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded">
                      <FileIcon className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
