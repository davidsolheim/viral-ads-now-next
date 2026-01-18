
# Database
DATABASE_URL='your_neon_database_url_here'

# Auth (Auth.js v5)
AUTH_SECRET='your_random_secret_here'  # Generate with: openssl rand -base64 32
AUTH_URL='https://your-app-name.vercel.app'  # Optional, auto-detected on Vercel

# Google OAuth
GOOGLE_CLIENT_ID='your_google_client_id'
GOOGLE_CLIENT_SECRET='your_google_client_secret'

# Email
RESEND_API_KEY='your_resend_api_key'
RESEND_FROM_EMAIL='your-email@example.com'

# AI Services
TEXT_AI_API_KEY='your_openai_api_key'
IMAGE_AI_API_KEY='your_replicate_token'
VIDEO_AI_API_KEY='your_kling_api_key'  # For Kling video generation
REPLICATE_IMAGE_MODEL_VERSION=your_version_id_here

# Storage
WASABI_ACCESS_KEY_ID='your_wasabi_access_key'
WASABI_SECRET_ACCESS_KEY='your_wasabi_secret_key'
WASABI_BUCKET_NAME='your_bucket_name'
WASABI_REGION='your_region'
WASABI_ENDPOINT='your_endpoint'

# Vercel Blob (blog images)
BLOB_READ_WRITE_TOKEN='your_vercel_blob_token'

# Stripe
STRIPE_SECRET_KEY='your_stripe_secret_key'
STRIPE_PUBLISHABLE_KEY='your_stripe_publishable_key'
STRIPE_WEBHOOK_SECRET='your_stripe_webhook_secret'
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY='your_stripe_publishable_key'

# RapidAPI
RAPID_API_KEY='your_rapidapi_key_here'

# Super Admin (comma-separated emails for admin access)
SUPER_ADMIN_EMAILS='admin@example.com,superadmin@example.com'