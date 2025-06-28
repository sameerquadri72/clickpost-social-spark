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
  ExternalLink,
  Loader2,
  Settings,
  AlertTriangle
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
    secrets: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET']
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-500',
    description: 'Share posts to your Facebook profile or pages',
    available: true,
    secrets: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET']
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-slate-800',
    description: 'Post tweets and engage with your Twitter audience',
    available: true,
    secrets: ['TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET']
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-500',
    description: 'Share photos and stories to Instagram (via Facebook Pages)',
    available: true,
    secrets: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET']
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
      // Error is already handled in the context with toast notification
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

      {/* Configuration Status Alert */}
      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription>
          <strong>Configuration Required:</strong> To connect social media accounts, OAuth credentials must be configured as Supabase secrets. 
          {connectedAccounts.length === 0 && (
            <span className="block mt-1 text-sm">
              If connection attempts fail, check that the required API credentials are properly set in your Supabase project settings.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Error Alert */}
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Last Connection Error:</strong> {lastError}
            {lastError.includes('credentials') || lastError.includes('configured') ? (
              <div className="mt-2 text-sm">
                <p>This error indicates that OAuth credentials are not properly configured. Please:</p>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Go to your Supabase project dashboard</li>
                  <li>Navigate to Project Settings → Edge Functions → Secrets</li>
                  <li>Add the required secrets for the platform you're trying to connect</li>
                  <li>Ensure the secret names match exactly (case-sensitive)</li>
                </ol>
              </div>
            ) : null}
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
                        <div className="mt-2">
                          <p className="text-xs text-slate-500">Required secrets:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {platform.secrets.map((secret) => (
                              <code key={secret} className="text-xs bg-slate-100 px-1 py-0.5 rounded">
                                {secret}
                              </code>
                            ))}
                          </div>
                        </div>
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

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <h4>To connect real social media accounts, you need to:</h4>
            <ol>
              <li>Create developer applications for each platform</li>
              <li>Configure OAuth redirect URIs to point to your Edge Functions</li>
              <li>Set up Supabase secrets with your API credentials</li>
            </ol>
            
            <h4>Required Supabase Secrets:</h4>
            <ul>
              <li><code>LINKEDIN_CLIENT_ID</code> - LinkedIn App Client ID</li>
              <li><code>LINKEDIN_CLIENT_SECRET</code> - LinkedIn App Client Secret</li>
              <li><code>FACEBOOK_APP_ID</code> - Facebook App ID</li>
              <li><code>FACEBOOK_APP_SECRET</code> - Facebook App Secret</li>
              <li><code>TWITTER_CLIENT_ID</code> - Twitter App Client ID</li>
              <li><code>TWITTER_CLIENT_SECRET</code> - Twitter App Client Secret</li>
            </ul>
            
            <h4>OAuth Redirect URIs to configure in your apps:</h4>
            <ul>
              <li>LinkedIn: <code>{window.location.origin}/functions/v1/linkedin-oauth/callback</code></li>
              <li>Facebook: <code>{window.location.origin}/functions/v1/facebook-oauth/callback</code></li>
              <li>Twitter: <code>{window.location.origin}/functions/v1/twitter-oauth/callback</code></li>
            </ul>
            
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h5 className="font-medium text-amber-800">Troubleshooting Connection Issues:</h5>
              <p className="text-sm text-amber-700 mt-1">
                If you're getting "Edge Function returned a non-2xx status code" errors, this typically means:
              </p>
              <ul className="text-sm text-amber-700 mt-2 ml-4">
                <li>• The required OAuth credentials are not configured in Supabase secrets</li>
                <li>• The Edge Functions cannot access the environment variables</li>
                <li>• The OAuth app configuration is incorrect</li>
                <li>• The secret names don't match exactly (they are case-sensitive)</li>
              </ul>
              <p className="text-sm text-amber-700 mt-2">
                Double-check that all required secrets are properly set in your Supabase project settings under "Project Settings" → "Edge Functions" → "Secrets".
              </p>
            </div>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-medium text-blue-800">How to Set Up Supabase Secrets:</h5>
              <ol className="text-sm text-blue-700 mt-2 space-y-1">
                <li>1. Go to your Supabase project dashboard</li>
                <li>2. Click on "Project Settings" (gear icon in the sidebar)</li>
                <li>3. Navigate to "Edge Functions" in the left menu</li>
                <li>4. Click on the "Secrets" tab</li>
                <li>5. Click "Add new secret" for each required credential</li>
                <li>6. Enter the exact secret name (case-sensitive) and value</li>
                <li>7. Save each secret</li>
              </ol>
              <p className="text-sm text-blue-700 mt-2">
                <strong>Important:</strong> After adding secrets, it may take a few minutes for them to be available to your Edge Functions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};