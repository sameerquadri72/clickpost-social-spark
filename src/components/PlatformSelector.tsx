
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

const PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    limit: '63,206 chars'
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'text-slate-900',
    bgColor: 'bg-slate-100',
    limit: '280 chars'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    limit: '3,000 chars'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    limit: '2,200 chars'
  }
];

interface PlatformSelectorProps {
  selectedPlatforms: string[];
  onPlatformChange: (platforms: string[]) => void;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatforms,
  onPlatformChange
}) => {
  const handlePlatformToggle = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      onPlatformChange(selectedPlatforms.filter(id => id !== platformId));
    } else {
      onPlatformChange([...selectedPlatforms, platformId]);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
      {PLATFORMS.map((platform) => {
        const Icon = platform.icon;
        const isSelected = selectedPlatforms.includes(platform.id);
        
        return (
          <div
            key={platform.id}
            className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              isSelected 
                ? 'border-brand-500 bg-brand-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => handlePlatformToggle(platform.id)}
          >
            <Checkbox
              id={platform.id}
              checked={isSelected}
              onChange={() => handlePlatformToggle(platform.id)}
            />
            <div className={`p-2 rounded-lg ${platform.bgColor}`}>
              <Icon className={`h-5 w-5 ${platform.color}`} />
            </div>
            <div className="flex-1">
              <Label htmlFor={platform.id} className="cursor-pointer font-medium">
                {platform.name}
              </Label>
              <p className="text-sm text-slate-500">{platform.limit}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
