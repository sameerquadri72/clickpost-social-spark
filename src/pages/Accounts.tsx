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
  AlertTriangle,
  Info
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
    envVars: ['VITE_LINKEDIN_CLIENT_ID']
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-500',
    description: 'Share posts to your Facebook profile or pages',
    available: true,
    envVars: ['VITE_FACEBOOK_APP_ID']
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-slate-800',
    description: 'Post tweets and engage with your Twitter audience',
    available: true,
    envVars: ['VITE_TWITTER_CLIENT_ID']
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-500',
    description: 'Share photos and stories to Instagram (via Facebook Pages)',
    available: false, // Disabled for now as it requires Facebook setup
    envVars: ['VITE_FACEBOOK_APP_ID']
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

  const checkEnvVars = (envVars: string[]) => {
    return envVars.every(envVar => {
      const value = import.meta.env[envVar];
      return value && value.trim() !== '';
    });
  };

  const hasAnyEnvVars = PLATFORMS.some(platform => checkEnvVars(platform.envVars));

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

      {/* Demo Mode Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Demo Mode:</strong> This version creates mock connections for demonstration purposes. 
          In a production environment, you would need to set up proper OAuth credentials and implement 
          secure token exchange on the backend.
        </AlertDescription>
      </Alert>

      {/* Environment Variables Status */}
      {!hasAnyEnvVars && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>No OAuth credentials configured:</strong> To test the OAuth flow with real credentials, 
            copy <code>.env.example</code> to <code>.env</code> and fill in your OAuth app credentials.
            <div className="mt-2 text-sm">
              <p>For now, you can test with mock connections that simulate the OAuth flow.</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error Alert */}
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Last Connection Error:</strong> {lastError}
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
                          {account.access_token.startsWith('mock_') && (
                            <Badge variant="outline" className="text-blue-600 border-blue-600">
                              Demo
                            </Badge>
                          )}
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
              const hasEnvVars = checkEnvVars(platform.envVars);
              
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
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${hasEnvVars ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span className="text-xs text-slate-500">
                              {hasEnvVars ? 'Credentials configured' : 'Demo mode (no credentials)'}
                            </span>
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
            <h4>Current Implementation:</h4>
            <ul>
              <li>✅ <strong>Demo Mode:</strong> Creates mock connections for testing the UI and flow</li>
              <li>✅ <strong>OAuth Flow:</strong> Implements proper OAuth redirect flow with state validation</li>
              <li>✅ <strong>Security:</strong> Uses secure state tokens stored in database</li>
              <li>⚠️ <strong>Token Exchange:</strong> Requires backend implementation for production use</li>
            </ul>
            
            <h4>For Production Use:</h4>
            <ol>
              <li>Set up OAuth applications with each social media platform</li>
              <li>Implement secure token exchange on your backend server</li>
              <li>Configure proper redirect URIs in your OAuth applications</li>
              <li>Store client secrets securely on the backend (never in frontend)</li>
            </ol>
            
            <h4>OAuth Redirect URIs for your apps:</h4>
            <ul>
              <li>LinkedIn: <code>{window.location.origin}/auth/linkedin/callback</code></li>
              <li>Facebook: <code>{window.location.origin}/auth/facebook/callback</code></li>
              <li>Twitter: <code>{window.location.origin}/auth/twitter/callback</code></li>
            </ul>
            
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-medium text-blue-800">Demo Features:</h5>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• OAuth flow simulation with real redirect URLs</li>
                <li>• Mock account creation with realistic profile data</li>
                <li>• State validation for security demonstration</li>
                <li>• Full UI/UX for account management</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};