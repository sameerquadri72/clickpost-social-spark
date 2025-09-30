import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Facebook, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react';
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';
import { SocialAccount } from '@/contexts/SocialAccountsContext';

const PLATFORM_ICONS = {
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
};

const PLATFORM_COLORS = {
  facebook: { icon: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-500' },
  twitter: { icon: 'text-slate-900', bg: 'bg-slate-100', border: 'border-slate-500' },
  linkedin: { icon: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-500' },
  instagram: { icon: 'text-pink-600', bg: 'bg-pink-100', border: 'border-pink-500' },
  youtube: { icon: 'text-red-600', bg: 'bg-red-100', border: 'border-red-500' },
};

interface ConnectedAccountSelectorProps {
  selectedAccountIds: string[];
  onAccountChange: (accountIds: string[]) => void;
}

export const ConnectedAccountSelector: React.FC<ConnectedAccountSelectorProps> = ({
  selectedAccountIds,
  onAccountChange
}) => {
  const { getActiveAccounts } = useSocialAccounts();
  const connectedAccounts = getActiveAccounts();

  const handleAccountToggle = (accountId: string) => {
    if (selectedAccountIds.includes(accountId)) {
      onAccountChange(selectedAccountIds.filter(id => id !== accountId));
    } else {
      onAccountChange([...selectedAccountIds, accountId]);
    }
  };

  if (connectedAccounts.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-50 rounded-lg">
        <div className="text-slate-400 mb-2">
          <Instagram className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-slate-700 mb-2">No Connected Accounts</h3>
        <p className="text-sm text-slate-500 mb-4">
          Connect your social media accounts to start posting
        </p>
        <a 
          href="/accounts" 
          className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Connect Accounts
        </a>
      </div>
    );
  }

  // Group accounts by platform
  const accountsByPlatform = connectedAccounts.reduce((acc, account) => {
    const platform = account.platform;
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(account);
    return acc;
  }, {} as Record<string, SocialAccount[]>);

  return (
    <div className="space-y-6">
      {Object.entries(accountsByPlatform).map(([platform, accounts]) => {
        const Icon = PLATFORM_ICONS[platform as keyof typeof PLATFORM_ICONS];
        const colors = PLATFORM_COLORS[platform as keyof typeof PLATFORM_COLORS];
        
        return (
          <div key={platform}>
            <div className="flex items-center gap-2 mb-4">
              {Icon && <Icon className={`h-5 w-5 ${colors.icon}`} />}
              <span className="text-base font-semibold capitalize text-slate-900">
                {platform === 'twitter' ? 'X' : platform}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-4">
              {accounts.map((account: SocialAccount) => {
                const isSelected = selectedAccountIds.includes(account.id);
                
                return (
                  <div
                    key={account.id}
                    className="flex flex-col items-center gap-2 cursor-pointer transition-all hover:scale-105"
                    onClick={() => handleAccountToggle(account.id)}
                  >
                    <div className={`relative rounded-full p-1 ${
                      isSelected 
                        ? `bg-gradient-to-br ${colors.icon === 'text-blue-600' ? 'from-blue-500 to-blue-600' : 
                           colors.icon === 'text-slate-900' ? 'from-slate-700 to-slate-900' :
                           colors.icon === 'text-blue-700' ? 'from-blue-600 to-blue-700' :
                           colors.icon === 'text-pink-600' ? 'from-pink-500 to-pink-600' :
                           'from-red-500 to-red-600'}`
                        : 'bg-slate-200'
                    }`}>
                      <Avatar className="h-16 w-16 ring-2 ring-white">
                        <AvatarImage src={account.profile_image || undefined} alt={account.name} />
                        <AvatarFallback className="text-sm font-medium">
                          {account.name?.substring(0, 2)?.toUpperCase() || platform.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    
                    <span className="text-xs font-medium text-slate-700 max-w-[80px] truncate text-center">
                      {account.username}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};