# Social Media OAuth Integration Setup Guide

## Overview
This project includes a complete social media posting and account connection system with OAuth flows for Twitter/X, Facebook/Instagram, LinkedIn, and YouTube.

## 🚀 Quick Start

### 1. Environment Variables
Copy `env.example` to `.env.local` and fill in your OAuth credentials:

```bash
cp env.example .env.local
```

### 2. Supabase Secrets Configuration
Set these secrets in your Supabase project dashboard:

#### Twitter/X OAuth 1.0a
```bash
TWITTER_CONSUMER_KEY=your_twitter_api_key
TWITTER_CONSUMER_SECRET=your_twitter_api_secret
```

#### Facebook/Instagram OAuth 2.0
```bash
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
```

#### LinkedIn OAuth 2.0
```bash
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

#### YouTube/Google OAuth 2.0
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 🔐 OAuth Flow Implementation

### Account Connection Process

#### 1. Twitter/X Connection
- **Flow**: OAuth 1.0a
- **Endpoint**: `/api/twitter/login` → Edge Function `twitter-oauth`
- **Callback**: `/api/twitter/callback`
- **Features**: Tweet posting, user profile access

#### 2. Facebook/Instagram Connection
- **Flow**: OAuth 2.0
- **Endpoint**: `/api/facebook/login` → Edge Function `facebook-oauth`
- **Callback**: `/api/facebook/callback`
- **Features**: Page management, Instagram business account linking

#### 3. LinkedIn Connection
- **Flow**: OAuth 2.0
- **Endpoint**: `/api/linkedin/login` → Edge Function `linkedin-oauth`
- **Callback**: `/api/linkedin/callback`
- **Features**: Profile posting, company page access

#### 4. YouTube Connection
- **Flow**: OAuth 2.0
- **Endpoint**: `/api/youtube/login` → Edge Function `youtube-oauth`
- **Callback**: `/api/youtube/callback`
- **Features**: Video uploads, channel management

## 🗄️ Database Schema

### Social Accounts Table
```sql
CREATE TABLE public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'twitter', 'instagram', 'youtube')),
  platform_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  profile_image TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_secret TEXT, -- For Twitter OAuth 1.0a
  page_access_token TEXT, -- For Facebook pages
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}', -- Platform-specific data
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### OAuth States Table
```sql
CREATE TABLE public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  redirect_url TEXT,
  oauth_token_secret TEXT, -- For Twitter OAuth 1.0a
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes')
);
```

## 🔧 Platform-Specific Setup

### Twitter/X Developer Setup
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Enable OAuth 1.0a
4. Set callback URL: `https://your-domain.com/auth/twitter/callback`
5. Get API Key and API Secret

### Facebook/Instagram Developer Setup
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs
5. Add Instagram Basic Display permissions
6. Set callback URL: `https://your-domain.com/auth/facebook/callback`

### LinkedIn Developer Setup
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create a new app
3. Configure OAuth 2.0 settings
4. Add required scopes: `r_liteprofile`, `r_emailaddress`, `w_member_social`
5. Set redirect URL: `https://your-domain.com/auth/linkedin/callback`

### YouTube/Google Developer Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Add YouTube scopes
6. Set redirect URI: `https://your-domain.com/auth/youtube/callback`

## 🚀 Deployment

### 1. Deploy Edge Functions
```bash
supabase functions deploy
```

### 2. Set Environment Variables
Set all required secrets in Supabase dashboard

### 3. Test OAuth Flows
1. Start your development server
2. Navigate to `/accounts` page
3. Click "Connect [Platform]" for each service
4. Complete OAuth flow
5. Verify account appears in connected accounts

## 🔍 Troubleshooting

### Common Issues

#### OAuth Credentials Not Configured
- Ensure all environment variables are set in Supabase secrets
- Check that Edge Functions have access to secrets

#### Callback URL Mismatch
- Verify callback URLs match exactly in platform developer settings
- Check for trailing slashes or protocol mismatches

#### Token Expiration
- Implement token refresh logic in production
- Monitor token expiration times

#### CORS Issues
- Edge Functions include proper CORS headers
- Check browser console for CORS errors

## 📱 Frontend Integration

### Connect Account Button
```tsx
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';

const { connectAccount } = useSocialAccounts();

<Button onClick={() => connectAccount('twitter')}>
  Connect Twitter
</Button>
```

### Account Status Check
```tsx
import { useSocialAccounts } from '@/contexts/SocialAccountsContext';

const { isAccountConnected, accounts } = useSocialAccounts();

const twitterConnected = isAccountConnected('twitter');
const twitterAccount = accounts.find(acc => acc.platform === 'twitter');
```

## 🔒 Security Considerations

1. **OAuth State Validation**: All OAuth flows include state parameter validation
2. **Token Storage**: Access tokens stored securely in Supabase with RLS
3. **User Isolation**: Users can only access their own social accounts
4. **Token Expiration**: Automatic cleanup of expired OAuth states
5. **HTTPS Required**: All OAuth callbacks require HTTPS in production

## 📚 Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/rfc6819)
- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [Facebook Graph API](https://developers.facebook.com/docs/graph-api)
- [LinkedIn API Documentation](https://developer.linkedin.com/docs)
- [YouTube Data API](https://developers.google.com/youtube/v3)
