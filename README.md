# Viral Ads Now

A modern Next.js 16 application for instant viral video ad generation. Transform product links into professional video advertisements in seconds.

## Features

- **Instant Video Generation**: Drop a product link, select a style, and generate a complete video ad
- **Multi-Organization Support**: Users can belong to multiple organizations with role-based access control
- **Complete Workflow**: Automated script generation, scene creation, voiceover, music, and video compilation
- **Modern Stack**: Built with Next.js 16, Drizzle ORM, Neon Database, and Wasabi storage
- **Authentication**: Google OAuth and passwordless email sign-in via NextAuth.js

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation

### Backend
- **Database**: Neon (Serverless PostgreSQL)
- **ORM**: Drizzle ORM
- **Authentication**: NextAuth.js (Google OAuth + Email)
- **Email**: Resend
- **File Storage**: Wasabi (S3-compatible)

### External Services
- **LLM**: OpenAI API (script generation)
- **TTS**: Replicate (voiceover generation)
- **Video Rendering**: Shotstack API
- **Image/Video Generation**: Kling AI or Replicate

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- PostgreSQL database (Neon recommended)
- Wasabi account for file storage
- API keys for external services (OpenAI, Replicate, Shotstack)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/davidsolheim/viral-ads-now-next.git
cd viral-ads-now-next
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:
- Database URL (Neon)
- NextAuth configuration
- Google OAuth credentials
- Resend API key
- Wasabi credentials
- External AI service API keys

4. Generate and run database migrations:
```bash
bun run db:generate
bun run db:push
```

5. Start the development server:
```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
viral-ads-now-next/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   ├── (auth)/         # Authentication pages
│   │   └── (dashboard)/    # Dashboard pages
│   ├── components/         # React components
│   │   ├── ui/            # UI primitives
│   │   └── wizard/        # Video creation wizard steps
│   ├── db/                # Database configuration
│   │   ├── schema/        # Drizzle ORM schemas
│   │   └── index.ts       # Database connection
│   └── lib/               # Utility functions
├── drizzle/               # Generated migrations
├── public/                # Static assets
└── drizzle.config.ts      # Drizzle configuration
```

## Database Schema

The application uses a comprehensive schema with support for:

- **Users & Authentication**: NextAuth.js compatible tables
- **Organizations**: Multi-tenancy with role-based access
- **Projects**: Video creation workflow
- **Products**: Product information for ads
- **Scripts, Scenes, Media Assets**: All video components
- **Final Videos**: Rendered video outputs

See `src/db/schema/` for detailed schema definitions.

## Video Generation Workflow

1. **Product**: Enter product details or URL
2. **Script**: AI-generated conversational script
3. **Scenes**: Break script into visual scenes
4. **Images**: Generate images for each scene
5. **Video**: Animate images into video clips
6. **Voiceover**: Generate natural-sounding voiceover
7. **Music**: Add background music
8. **Captions**: Configure caption styling
9. **Preview**: Compile final video
10. **TikTok**: Generate metadata for posting

## Development

### Database Management

```bash
# Generate migrations
bun run db:generate

# Push schema to database
bun run db:push

# Open Drizzle Studio (database GUI)
bun run db:studio
```

### Code Quality

```bash
# Run linter
bun run lint

# Build for production
bun run build
```

## Deployment

This application is optimized for deployment on Vercel:

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables
4. Deploy

## Environment Variables

See `.env.example` for a complete list of required environment variables.

### Required
- `DATABASE_URL`: Neon database connection string
- `NEXTAUTH_URL`: Your application URL
- `NEXTAUTH_SECRET`: Random secret for NextAuth
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `RESEND_API_KEY`: Resend API key for emails

### Optional (for full functionality)
- `WASABI_*`: Wasabi storage credentials
- `OPENAI_API_KEY`: OpenAI API key
- `REPLICATE_API_TOKEN`: Replicate API token
- `SHOTSTACK_API_KEY`: Shotstack API key

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is proprietary and confidential.

## Support

For issues or questions, please open an issue on GitHub or contact the development team.
