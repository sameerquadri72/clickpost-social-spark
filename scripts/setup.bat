@echo off
REM ClickPost Social Spark - Setup Script (Windows)
REM This script helps you set up the social media OAuth integration

echo 🚀 ClickPost Social Spark - Setup Script
echo ========================================
echo.

REM Check if .env.local exists
if not exist .env.local (
    echo 📝 Creating .env.local file from template...
    copy env.example .env.local
    echo ✅ .env.local created! Please edit it with your OAuth credentials.
    echo.
) else (
    echo ✅ .env.local already exists.
)

REM Check if Supabase CLI is installed
supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Supabase CLI not found. Please install it first:
    echo    npm install -g supabase
    echo    or visit: https://supabase.com/docs/guides/cli
    echo.
) else (
    echo ✅ Supabase CLI found.
)

echo 🔧 Next Steps:
echo 1. Edit .env.local with your OAuth credentials
echo 2. Set up your Supabase project
echo 3. Configure OAuth apps in each platform's developer portal
echo 4. Set secrets in Supabase dashboard
echo 5. Deploy Edge Functions: supabase functions deploy
echo 6. Run database migrations: supabase db push
echo 7. Start development server: npm run dev
echo.
echo 📚 For detailed setup instructions, see:
echo    - SOCIAL_MEDIA_SETUP.md
echo    - README.md
echo.
echo 🎉 Happy coding!
pause
