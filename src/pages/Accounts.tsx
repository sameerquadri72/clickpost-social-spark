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
    setupUrl: 'https://www.linkedin.com/developers/apps'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-500',
    description: 'Share posts to your Facebook profile or pages',
    available: true,
    setupUrl: 'https://developers.facebook.com/apps'
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-slate-800',
    description: 'Post tweets and engage with your Twitter audience',
    available: true,
    setupUrl: 'https://developer.twitter.com/en/portal/dashboard'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-500',
    description: 'Share photos and stories to Instagram (via Facebook Pages)',
    available: true,
    setupUrl: 'https://developers.facebook.com/apps'
  }
];

export const Accounts: React.FC = () => {
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const { accounts, loading, connectAccount, disconnectAccount, isAccountConnected } = useSocialAccounts();
  const { toast } = useToast();

  // Handle OAuth success/error messages from URL params
  useEffect(() => {
    // Only access window object in browser environment
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const success = urlParams.get('success');
      const error = urlParams.get('error');

      if (success) {
        toast({
          title: "Account Connected",
          description: `Your ${success} account has been successfully connected.`,
        });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (error) {
        setLastError(error);
        toast({
          title: "Connection Failed",
          description: error,
          variant: "destructive",
        });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
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

  const connectedAccounts = accounts.filter(account => account.is_active);
  const expiringSoonAccounts = accounts.filter(a => 
    a.expires_at && new Date(a.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
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

      {/* Setup Required Alert */}
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          <strong>OAuth Setup Required:</strong> To connect real social media accounts, OAuth credentials must be configured in your Supabase project secrets. 
          <a 
            href="https://supabase.com/docs/guides/functions/secrets" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline ml-1"
          >
            Learn how to set up secrets
            <ExternalLink className="h-3 w-3 inline ml-1" />
          </a>
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Connection Error:</strong> {lastError}
            {lastError.includes('credentials') && (
              <div className="mt-2 text-sm">
                <p>Required Supabase secrets for each platform:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>LinkedIn: LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET</li>
                  <li>Facebook: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET</li>
                  <li>Twitter: TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET</li>
                </ul>
              </div>
            )}
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
                <p className="text-2xl font-bold">{accounts.filter(a => a.is_active).length}</p>
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
                const platform = PLATFORMS.find(p => p.id === account.platform);
                const Icon = platform?.icon || Users;
                const isExpiringSoon = account.expires_at && new Date(account.expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                
                return (
                  <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={account.profile_image} />
                        <AvatarFallback>
                          <Icon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{account.name}</h3>
                          <Badge variant="secondary">{account.platform}</Badge>
                          {isExpiringSoon && (
                            <Badge variant="destructive" className="text-xs">
                              Expires Soon
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">@{account.username}</p>
                        <p className="text-xs text-slate-500">
                          Connected {format(new Date(account.created_at), 'MMM d, yyyy')}
                          {account.expires_at && (
                            <span className="ml-2">
                              • Expires {format(new Date(account.expires_at), 'MMM d, yyyy')}
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
              const isLoading = connectingPlatform === platform.id;
              
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
                        <a 
                          href={platform.setupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-flex items-center"
                        >
                          Developer Console
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
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
                          disabled={isLoading || !platform.available}
                          size="sm"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Connecting...
                            </>
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

      {/* Production Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Production Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <h4>Step 1: Create OAuth Applications</h4>
            <p>Create developer applications for each platform you want to support:</p>
            <ul>
              <li><strong>LinkedIn:</strong> <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">LinkedIn Developer Console</a></li>
              <li><strong>Facebook:</strong> <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Facebook Developer Console</a></li>
              <li><strong>Twitter:</strong> <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Twitter Developer Portal</a></li>
            </ul>
            
            <h4>Step 2: Configure OAuth Redirect URIs</h4>
            <p>In each OAuth application, set the redirect URI to:</p>
            <div className="bg-slate-100 p-3 rounded-lg font-mono text-sm">
              <p>LinkedIn: <code>{typeof window !== 'undefined' ? window.location.origin : 'YOUR_DOMAIN'}/functions/v1/linkedin-oauth/callback</code></p>
              <p>Facebook: <code>{typeof window !== 'undefined' ? window.location.origin : 'YOUR_DOMAIN'}/functions/v1/facebook-oauth/callback</code></p>
              <p>Twitter: <code>{typeof window !== 'undefined' ? window.location.origin : 'YOUR_DOMAIN'}/functions/v1/twitter-oauth/callback</code></p>
            </div>
            
            <h4>Step 3: Configure Supabase Secrets</h4>
            <p>Add the following secrets to your Supabase project:</p>
            <div className="bg-slate-100 p-3 rounded-lg">
              <ul className="space-y-1 text-sm font-mono">
                <li>LINKEDIN_CLIENT_ID</li>
                <li>LINKEDIN_CLIENT_SECRET</li>
                <li>FACEBOOK_APP_ID</li>
                <li>FACEBOOK_APP_SECRET</li>
                <li>TWITTER_CLIENT_ID</li>
                <li>TWITTER_CLIENT_SECRET</li>
              </ul>
            </div>
            
            <h4>Step 4: Deploy Edge Functions</h4>
            <p>The OAuth Edge Functions are already included in your project. Deploy them using:</p>
            <div className="bg-slate-100 p-3 rounded-lg font-mono text-sm">
              <code>supabase functions deploy</code>
            </div>
            
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h5 className="font-medium text-green-800">Security Features:</h5>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>• Secure token exchange on the backend</li>
                <li>• State parameter validation for CSRF protection</li>
                <li>• Automatic token expiration handling</li>
                <li>• Row-level security for user data isolation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};