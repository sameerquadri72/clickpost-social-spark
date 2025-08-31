# ClickPost Social Spark

A comprehensive social media management platform that allows users to connect and manage multiple social media accounts, schedule posts, and analyze performance across platforms.

## 🚀 Features

### Social Media Integration
- **Twitter/X**: OAuth 1.0a integration for tweet posting and profile management
- **Facebook/Instagram**: OAuth 2.0 integration with page management and Instagram business account linking
- **LinkedIn**: OAuth 2.0 integration for professional content sharing
- **YouTube**: OAuth 2.0 integration for video uploads and channel management

### Core Functionality
- Secure OAuth authentication flows for all platforms
- Account connection and management
- Post scheduling and management
- Content calendar
- Performance analytics
- Multi-platform posting

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Shadcn/ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth
- **State Management**: React Context + TanStack Query
- **OAuth**: Platform-specific OAuth implementations

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clickpost-social-spark
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your OAuth credentials in `.env.local`

4. **Supabase Setup**
   - Create a new Supabase project
   - Set up the database schema (migrations are included)
   - Configure Edge Functions
   - Set environment secrets

5. **Start Development Server**
   ```bash
   npm run dev
   # or
   bun dev
   ```

## 🔐 OAuth Configuration

### Required Environment Variables

Create a `.env.local` file with your OAuth credentials:

```env
# Twitter/X OAuth 1.0a
VITE_TWITTER_CLIENT_ID=your_twitter_api_key
VITE_TWITTER_CLIENT_SECRET=your_twitter_api_secret

# Facebook/Instagram OAuth 2.0
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_FACEBOOK_APP_SECRET=your_facebook_app_secret

# LinkedIn OAuth 2.0
VITE_LINKEDIN_CLIENT_ID=your_linkedin_client_id
VITE_LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# YouTube/Google OAuth 2.0
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Supabase Secrets

Set these secrets in your Supabase project dashboard:

```bash
# Twitter
TWITTER_CONSUMER_KEY=your_twitter_api_key
TWITTER_CONSUMER_SECRET=your_twitter_api_secret

# Facebook
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# LinkedIn
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# YouTube/Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 🗄️ Database Schema

The application uses two main tables:

### `social_accounts`
Stores connected social media account information including:
- Platform credentials (access tokens, refresh tokens)
- User profile information
- Platform-specific metadata
- Token expiration tracking

### `oauth_states`
Manages OAuth flow security with:
- State parameter validation
- Temporary OAuth secrets (for Twitter OAuth 1.0a)
- Automatic cleanup of expired states

## 🔄 OAuth Flow Implementation

### Account Connection Process

1. **User clicks "Connect [Platform]"**
2. **OAuth initiation** via Edge Function
3. **Platform redirect** to OAuth authorization
4. **User authorization** on platform
5. **Callback processing** and token exchange
6. **Account storage** in Supabase
7. **Success confirmation** to user

### Platform-Specific Implementations

- **Twitter/X**: OAuth 1.0a with HMAC-SHA1 signature
- **Facebook/Instagram**: OAuth 2.0 with page permissions
- **LinkedIn**: OAuth 2.0 with professional scopes
- **YouTube**: OAuth 2.0 with Google API integration

## 🚀 Deployment

### 1. Deploy Edge Functions
```bash
supabase functions deploy
```

### 2. Set Environment Variables
Configure all required secrets in Supabase dashboard

### 3. Run Database Migrations
```bash
supabase db push
```

### 4. Build and Deploy Frontend
```bash
npm run build
# Deploy the dist folder to your hosting provider
```

## 📱 Usage

### Connecting Social Accounts

1. Navigate to `/accounts` page
2. Click "Connect [Platform]" for desired service
3. Complete OAuth authorization
4. Account appears in connected accounts list

### Managing Accounts

- View all connected accounts
- Disconnect accounts
- Monitor token expiration
- Access platform-specific features

## 🔒 Security Features

- **OAuth State Validation**: Prevents CSRF attacks
- **Row Level Security**: Users can only access their own data
- **Secure Token Storage**: Encrypted storage in Supabase
- **Automatic Cleanup**: Expired OAuth states are removed
- **HTTPS Required**: All OAuth callbacks require secure connections

## 🐛 Troubleshooting

### Common Issues

- **OAuth Credentials Not Configured**: Check Supabase secrets
- **Callback URL Mismatch**: Verify URLs in platform developer settings
- **Token Expiration**: Implement refresh logic for production
- **CORS Errors**: Edge Functions include proper CORS headers

### Debug Mode

Enable detailed logging in Edge Functions for troubleshooting OAuth flows.

## 📚 Documentation

- [Social Media Setup Guide](SOCIAL_MEDIA_SETUP.md)
- [API Documentation](docs/api.md)
- [Component Library](docs/components.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the [troubleshooting guide](#-troubleshooting)
- Review the [setup documentation](SOCIAL_MEDIA_SETUP.md)
- Open an issue on GitHub

## 🔮 Roadmap

- [ ] Advanced post scheduling
- [ ] Analytics dashboard
- [ ] Team collaboration features
- [ ] API rate limiting
- [ ] Bulk posting capabilities
- [ ] Content templates
- [ ] Performance optimization
