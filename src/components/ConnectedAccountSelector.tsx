import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Facebook, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react';
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';
import { SocialAccount } from '@/contexts/SocialAccountsContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-6 items-center justify-center">
        {connectedAccounts.map((account: SocialAccount) => {
          const isSelected = selectedAccountIds.includes(account.id);
          const Icon = PLATFORM_ICONS[account.platform as keyof typeof PLATFORM_ICONS];
          const colors = PLATFORM_COLORS[account.platform as keyof typeof PLATFORM_COLORS];
          
          return (
            <Tooltip key={account.id}>
              <TooltipTrigger asChild>
                <div
                  className="relative cursor-pointer transition-all hover:scale-110 group"
                  onClick={() => handleAccountToggle(account.id)}
                >
                  <div className={`relative rounded-full p-1 transition-all ${
                    isSelected 
                      ? `bg-gradient-to-br ${colors.icon === 'text-blue-600' ? 'from-blue-500 to-blue-600' : 
                         colors.icon === 'text-slate-900' ? 'from-slate-700 to-slate-900' :
                         colors.icon === 'text-blue-700' ? 'from-blue-600 to-blue-700' :
                         colors.icon === 'text-pink-600' ? 'from-pink-500 to-pink-600' :
                         'from-red-500 to-red-600'}`
                      : 'bg-slate-300'
                  }`}>
                    <Avatar className="h-16 w-16 ring-2 ring-white">
                      <AvatarImage src={account.profile_image || undefined} alt={account.name} />
                      <AvatarFallback className="text-sm font-medium">
                        {account.name?.substring(0, 2)?.toUpperCase() || account.platform.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  {/* Platform badge at top corner */}
                  {Icon && (
                    <div className={`absolute -top-1 -right-1 ${colors.bg} rounded-full p-1.5 border-2 border-white shadow-sm`}>
                      <Icon className={`h-3.5 w-3.5 ${colors.icon}`} />
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent 
                side="bottom" 
                className="bg-foreground text-background font-medium px-3 py-1.5"
              >
                <p>{account.name || account.username}</p>
                <p className="text-xs opacity-80">@{account.username}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};