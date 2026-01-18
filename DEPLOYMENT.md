# Deployment Guide - Viral Ads Now

This guide will walk you through deploying the Viral Ads Now application to Vercel.

## Prerequisites

Before deploying, ensure you have:

1. **Neon Database** - Already set up with schema deployed
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **API Keys** - Collect all required API keys (see below)

## Required API Keys

### 1. Google OAuth
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing
- Enable Google+ API
- Create OAuth 2.0 credentials
- Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
- Copy Client ID and Client Secret

### 2. Resend (Email)
- Sign up at [resend.com](https://resend.com)
- Create an API key
- Verify your sending domain
- Copy API key and set FROM email

### 3. OpenAI (Text AI)
- Sign up at [platform.openai.com](https://platform.openai.com)
- Create an API key
- Ensure you have credits available
- This key will be used as `TEXT_AI_API_KEY`

### 4. Replicate (Image AI)
- Sign up at [replicate.com](https://replicate.com)
- Go to Account Settings → API Tokens
- Create a new token
- Copy the token
- This key will be used as `IMAGE_AI_API_KEY`

### 4b. Kling (Video AI)
- Sign up at [klingai.com](https://klingai.com) (or your video AI provider)
- Create an API key
- This key will be used as `VIDEO_AI_API_KEY`

### 5. Shotstack
- Sign up at [shotstack.io](https://shotstack.io)
- Go to Dashboard → API Keys
- Copy your API key

### 6. Wasabi Storage
- Sign up at [wasabi.com](https://wasabi.com)
- Create a bucket
- Generate access keys
- Copy Access Key ID, Secret Access Key, and Bucket Name

## Deployment Steps

### Step 1: Connect to Vercel

1. Install Vercel CLI (optional):
   ```bash
   npm install -g vercel
   ```

2. Or use the Vercel Dashboard:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository: `davidsolheim/viral-ads-now-next`

### Step 2: Configure Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

```env
# Database
DATABASE_URL=postgresql://neondb_owner:npg_xxx@ep-xxx.neon.tech/neondb?sslmode=require

# NextAuth
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Resend
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# AI Services
TEXT_AI_API_KEY=sk-xxx  # OpenAI API key for text generation
IMAGE_AI_API_KEY=r8_xxx  # Replicate API token for image generation
VIDEO_AI_API_KEY=xxx  # Kling API key for video generation

# Wasabi
WASABI_ACCESS_KEY_ID=xxx
WASABI_SECRET_ACCESS_KEY=xxx
WASABI_BUCKET_NAME=your-bucket-name
WASABI_REGION=us-east-1
WASABI_ENDPOINT=https://s3.wasabisys.com
```

**Important:** Set all variables for Production, Preview, and Development environments.

### Step 3: Generate NextAuth Secret

Generate a secure secret:
```bash
openssl rand -base64 32
```

Copy the output and use it as `NEXTAUTH_SECRET`.

### Step 4: Deploy

#### Option A: Automatic Deployment (Recommended)
- Push to main branch on GitHub
- Vercel will automatically deploy

#### Option B: Manual Deployment
```bash
cd viral-ads-now-next
vercel --prod
```

### Step 5: Update Google OAuth Redirect URI

After deployment:
1. Note your Vercel domain (e.g., `https://viral-ads-now.vercel.app`)
2. Go to Google Cloud Console → Credentials
3. Add authorized redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
4. Update `NEXTAUTH_URL` in Vercel to match your domain

### Step 6: Test the Application

1. Visit your deployed URL
2. Test sign-in with Google
3. Test email sign-in
4. Create a test project
5. Run through the wizard steps

## Post-Deployment Configuration

### Custom Domain (Optional)

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to your custom domain
5. Update Google OAuth redirect URI

### Database Migrations

If you make schema changes:

```bash
# Generate migration
bun run db:generate

# Push to production database
bun run db:push
```

### Monitoring

- Check Vercel Dashboard for deployment logs
- Monitor function execution times
- Set up error tracking (optional: Sentry)

## Troubleshooting

### Build Fails

- Check build logs in Vercel Dashboard
- Ensure all dependencies are in package.json
- Verify TypeScript has no errors locally

### Authentication Not Working

- Verify `NEXTAUTH_URL` matches your domain exactly
- Check Google OAuth redirect URI is correct
- Ensure `NEXTAUTH_SECRET` is set

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check Neon database is active
- Ensure IP allowlist includes Vercel IPs (or set to allow all)

### API Errors

- Check API keys are valid and have credits
- Verify environment variables are set correctly
- Check function logs in Vercel Dashboard

## Performance Optimization

The application is already optimized with:
- React Compiler enabled
- Image optimization for remote patterns
- Server Actions with increased body size limit
- React Query for client-side caching

## Security Checklist

- ✅ All API keys stored as environment variables
- ✅ Database connection uses SSL
- ✅ NextAuth configured with secure secret
- ✅ CORS configured for API routes
- ✅ Input validation with Zod

## Support

For issues or questions:
- Check Vercel deployment logs
- Review error messages in browser console
- Verify all environment variables are set correctly

## Next Steps

1. Set up a custom domain
2. Configure email templates in Resend
3. Add more voice options
4. Implement music library
5. Add analytics tracking
