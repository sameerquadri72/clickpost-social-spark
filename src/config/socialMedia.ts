
// Social Media API Configuration
export const SOCIAL_MEDIA_CONFIG = {
  linkedin: {
    clientId: import.meta.env.VITE_LINKEDIN_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_LINKEDIN_CLIENT_SECRET || '',
    redirectUri: `${window.location.origin}/auth/linkedin/callback`,
    scope: 'r_liteprofile r_emailaddress w_member_social',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    apiUrl: 'https://api.linkedin.com/v2'
  },
  facebook: {
    clientId: import.meta.env.VITE_FACEBOOK_APP_ID || '', // Using clientId for consistency
    clientSecret: import.meta.env.VITE_FACEBOOK_APP_SECRET || '', // Using clientSecret for consistency
    redirectUri: `${window.location.origin}/auth/facebook/callback`,
    scope: 'pages_manage_posts,pages_read_engagement,publish_to_groups',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    apiUrl: 'https://graph.facebook.com/v18.0'
  },
  twitter: {
    clientId: import.meta.env.VITE_TWITTER_CLIENT_ID || '',
    clientSecret: import.meta.env.VITE_TWITTER_CLIENT_SECRET || '',
    redirectUri: `${window.location.origin}/auth/twitter/callback`,
    scope: 'tweet.read tweet.write users.read',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    apiUrl: 'https://api.twitter.com/2'
  }
};

export const getAuthUrl = (platform: keyof typeof SOCIAL_MEDIA_CONFIG): string => {
  const config = SOCIAL_MEDIA_CONFIG[platform];
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    response_type: 'code',
    state: `${platform}_${Date.now()}`
  });

  return `${config.authUrl}?${params.toString()}`;
};
