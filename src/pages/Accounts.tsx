
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Linkedin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Trash2
} from 'lucide-react';
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const PLATFORMS = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-blue-600',
    description: 'Connect your LinkedIn profile to share professional content'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-500',
    description: 'Share posts to your Facebook profile or pages'
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-slate-800',
    description: 'Post tweets and engage with your Twitter audience'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-500',
    description: 'Share photos and stories to Instagram (coming soon)'
  }
];

export const Accounts: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const { accounts, connectLinkedIn, disconnectAccount, isAccountConnected } = useSocialAccounts();
  const { toast } = useToast();

  const handleConnect = async (platformId: string) => {
    setIsConnecting(platformId);
    
    try {
      if (platformId === 'linkedin') {
        await connectLinkedIn();
        toast({
          title: "LinkedIn Connected",
          description: "Your LinkedIn account has been successfully connected.",
        });
      } else {
        toast({
          title: "Coming Soon",
          description: `${platformId} integration is coming soon!`,
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to connect your account. Please try again.",
        variant: "destructive",
      });
      console.error('Connection error:', error);
    } finally {
      setIsConnecting(null);
    }
  };

  const handleDisconnect = (accountId: string, platformName: string) => {
    disconnectAccount(accountId);
    toast({
      title: "Account Disconnected",
      description: `Your ${platformName} account has been disconnected.`,
    });
  };

  const connectedAccounts = accounts.filter(account => account.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Social Accounts</h1>
        <p className="text-slate-600 mt-1">
          Connect your social media accounts to start posting content
        </p>
      </div>

      {/* Connected Accounts Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-brand-600" />
              <div>
                <p className="text-2xl font-bold">{connectedAccounts.length}</p>
                <p className="text-sm text-slate-600">Connected Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{accounts.filter(a => a.isActive).length}</p>
                <p className="text-sm text-slate-600">Active Connections</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-slate-600">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Accounts List */}
      {connectedAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {connectedAccounts.map((account) => {
                const platform = PLATFORMS.find(p => p.id === account.platform);
                const Icon = platform?.icon || Users;
                
                return (
                  <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={account.profileImage} />
                        <AvatarFallback>
                          <Icon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{account.name}</h3>
                          <Badge variant="secondary">{account.platform}</Badge>
                        </div>
                        <p className="text-sm text-slate-600">@{account.username}</p>
                        <p className="text-xs text-slate-500">
                          Connected {format(account.connectedAt, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Active
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(account.id, platform?.name || account.platform)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Platforms */}
      <Card>
        <CardHeader>
          <CardTitle>Available Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isConnected = isAccountConnected(platform.id);
              const isLoading = isConnecting === platform.id;
              
              return (
                <div key={platform.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-lg ${platform.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{platform.name}</h3>
                        <p className="text-sm text-slate-600 mt-1">{platform.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {isConnected ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => handleConnect(platform.id)}
                          disabled={isLoading || (platform.id !== 'linkedin')}
                          size="sm"
                        >
                          {isLoading ? (
                            'Connecting...'
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Connect
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* LinkedIn Setup Alert */}
      {!isAccountConnected('linkedin') && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Get Started:</strong> Connect your LinkedIn account to start posting professional content. 
            Click the "Connect" button above to authenticate with LinkedIn.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
