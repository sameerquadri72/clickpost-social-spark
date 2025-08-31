
import React, { useState, useEffect } from 'react';
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
  Trash2,
  Loader2,
  Settings,
  AlertTriangle,
  Info,
  ExternalLink
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
    description: 'Connect your LinkedIn profile to share professional content',
    available: true,
    setupUrl: 'https://www.linkedin.com/developers/apps',
    oauthVersion: '2.0'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-500',
    description: 'Share posts to your Facebook profile or pages',
    available: true,
    setupUrl: 'https://developers.facebook.com/apps',
    oauthVersion: '2.0'
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-slate-800',
    description: 'Post tweets using secure OAuth 1.0a authentication',
    available: true,
    setupUrl: 'https://developer.twitter.com/en/portal/dashboard',
    oauthVersion: '1.0a'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-500',
    description: 'Share photos and stories to Instagram (via Facebook Pages)',
    available: true,
    setupUrl: 'https://developers.facebook.com/apps',
    oauthVersion: '2.0'
  }
];

export const Accounts: React.FC = () => {
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const { accounts, loading, connectAccount, disconnectAccount, isAccountConnected } = useSocialAccounts();
  const { toast } = useToast();

  // Handle OAuth success/error messages from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success) {
      toast({
        title: "Account Connected",
        description: `Your ${success || 'social media'} account has been successfully connected.`,
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (error) {
      setLastError(error);
      toast({
        title: "Connection Failed",
        description: error || 'Failed to connect account',
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const handleConnect = async (platformId: string) => {
    setConnectingPlatform(platformId);
    setLastError(null);
    
    try {
      await connectAccount(platformId);
    } catch (error) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(errorMessage);
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId: string, platformName: string) => {
    await disconnectAccount(accountId);
  };

  // Ensure accounts is always an array
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const connectedAccounts = safeAccounts.filter(account => account?.is_active);
  const expiringSoonAccounts = safeAccounts.filter(a => 
    a?.expires_at && new Date(a.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Social Accounts</h1>
        <p className="text-slate-600 mt-1">
          Connect your social media accounts to start posting content
        </p>
      </div>

      {/* Error Alert */}
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Connection Error:</strong> {lastError}
          </AlertDescription>
        </Alert>
      )}

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
                <p className="text-2xl font-bold">{safeAccounts.filter(a => a?.is_active).length}</p>
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
                <p className="text-2xl font-bold">{expiringSoonAccounts.length}</p>
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
                const platform = PLATFORMS.find(p => p.id === (account?.platform || ''));
                const Icon = platform?.icon || Users;
                const isExpiringSoon = account?.expires_at && new Date(account.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                const oauthVersion = account?.metadata?.oauth_version || platform?.oauthVersion || 'Unknown';
                
                return (
                  <div key={account?.id || Math.random()} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={account?.profile_image || ''} />
                        <AvatarFallback>
                          <Icon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{account?.name || 'Unknown'}</h3>
                          <Badge variant="secondary">{account?.platform || 'unknown'}</Badge>
                          <Badge variant="outline" className="text-xs">
                            OAuth {oauthVersion}
                          </Badge>
                          {isExpiringSoon && (
                            <Badge variant="destructive" className="text-xs">
                              Expires Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">@{account?.username || 'unknown'}</p>
                        <p className="text-xs text-slate-500">
                          Connected {account?.created_at ? format(new Date(account.created_at || ''), 'MMM d, yyyy') : 'Unknown date'}
                          {account?.expires_at && (
                            <span className="ml-2">
                              • Expires {format(new Date(account.expires_at || ''), 'MMM d, yyyy')}
                            </span>
                          )}
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
                        onClick={() => handleDisconnect(account?.id || '', platform?.name || account?.platform || 'unknown')}
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
          <CardTitle className="flex items-center justify-between">
            <span>Connect Platforms</span>
            <Badge variant="outline" className="text-xs">
              Multiple accounts per platform supported
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const platformAccounts = connectedAccounts.filter(account => account.platform === platform.id);
              const isLoading = connectingPlatform === platform.id;
              
              return (
                <div key={platform.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 rounded-lg ${platform.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{platform.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            OAuth {platform.oauthVersion}
                          </Badge>
                          {platformAccounts.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {platformAccounts.length} connected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{platform.description}</p>
                        {platformAccounts.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {platformAccounts.slice(0, 2).map((account) => (
                              <div key={account.id} className="text-xs text-slate-500 flex items-center">
                                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                @{account.username}
                              </div>
                            ))}
                            {platformAccounts.length > 2 && (
                              <div className="text-xs text-slate-500">
                                +{platformAccounts.length - 2} more accounts
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <Button
                        onClick={() => handleConnect(platform.id)}
                        disabled={isLoading || !platform.available}
                        size="sm"
                        variant={platformAccounts.length > 0 ? "outline" : "default"}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            {platformAccounts.length > 0 ? 'Add Another' : 'Connect'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
