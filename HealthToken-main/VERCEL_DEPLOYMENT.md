# Vercel Deployment Configuration

This document describes the Vercel deployment setup for the AfyaToken monorepo.

## Overview

The AfyaToken platform is a Turborepo monorepo with multiple Next.js applications and a Node.js Express backend. This configuration enables seamless deployment to Vercel with automatic builds, previews, and production deployments.

## Project Structure

```
afyaToken-platform/
├── apps/
│   ├── web/           # Next.js 14 admin dashboard (main app)
│   ├── internal/      # Next.js 16 internal management portal
│   ├── seaboard/      # Next.js 16 seaboard admin functionality
│   └── api/           # Node.js Express backend API
├── packages/
│   └── types/         # Shared TypeScript types
├── vercel.json        # Vercel configuration
└── .vercelignore      # Files to ignore in Vercel builds
```

## Configuration Files

### Root `package.json`

The root package.json includes:
- **Turborepo workspaces** configuration for monorepo management
- **Build scripts** optimized for Vercel (`vercel-build` command)
- **Turbo pipeline** configuration for proper build dependency order

Key changes:
- Added `vercel-build` script that builds only the web applications
- Optimized Turborepo pipeline to skip unnecessary builds
- Configured cache settings for faster deployments

### `vercel.json`

Main Vercel configuration at project root:

```json
{
  "buildCommand": "npm run vercel-build",
  "framework": "nextjs",
  "builds": [
    { "src": "apps/web", "use": "@vercel/next" },
    { "src": "apps/internal", "use": "@vercel/next" },
    { "src": "apps/seaboard", "use": "@vercel/next" }
  ]
}
```

**Key settings:**
- `buildCommand`: Custom build targeting only web applications
- `framework`: Indicates Next.js as primary framework
- `builds`: Specifies all three Next.js apps to build
- `regions`: Set to Frankfurt (fra1) for EU deployment
- Routing configured for different app paths

### `.vercelignore`

Excludes unnecessary files from deployment:
- `contracts/` - Smart contracts (not needed for web deployment)
- `ml-service/` - ML service (deployed separately)
- `apps/mobile/` - Mobile app (deployed via EAS)
- `k8s/` - Kubernetes configs (not used)
- Build artifacts, tests, documentation

## Per-Application Configuration

### Web App (`apps/web`)

**Framework:** Next.js 14.2.35 with React 18

**next.config.mjs updates:**
- `output: 'standalone'` - Enables standalone server mode for Vercel
- Optimized image handling with Avif/WebP formats
- Security headers (X-Content-Type-Options, X-Frame-Options, etc.)
- Compression enabled by default

**package.json updates:**
- Added TypeScript and ESLint dependencies
- Added `type-check` script for type safety
- Proper version pinning for all dependencies

### Internal App (`apps/internal`)

**Framework:** Next.js 16.2.4 with React 19

**next.config.ts updates:**
- Same optimization as web app
- `output: 'standalone'` mode
- Strict TypeScript configuration

**package.json updates:**
- Added complete dev dependencies
- Proper module type declaration

### Seaboard App (`apps/seaboard`)

**Framework:** Next.js 16.2.4 with React 19

Same configuration as internal app for consistency.

### API Service (`apps/api`)

**Framework:** Node.js Express with TypeScript

**Key updates:**
- Added `exports` field for proper module resolution
- Added `type: "module"` for ESM support
- Added `type-check` and `engines` specifications
- Complete ESLint and TypeScript dev dependencies

## Deployment Workflow

### Manual Deployment

1. **Link project to Vercel:**
   ```bash
   vercel link
   ```

2. **Deploy:**
   ```bash
   vercel deploy
   ```

3. **Production deployment:**
   ```bash
   vercel deploy --prod
   ```

### Automatic Deployment (via GitHub)

1. Connect your GitHub repository to Vercel
2. Vercel will automatically:
   - Build on every push to main/develop branches
   - Create preview deployments for pull requests
   - Deploy to production on main branch merges

### Build Process

The Vercel build process follows these steps:

1. **Install dependencies**: `npm install`
2. **Run build command**: `npm run vercel-build`
   - Builds `@afyaToken/types` (shared types)
   - Builds `apps/web`
   - Builds `apps/internal`
   - Builds `apps/seaboard`
3. **Optimize output**: Vercel applies optimizations
4. **Deploy**: Upload to Vercel infrastructure

## Environment Variables

Create a `.env.local` file with required variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/db

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# API
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# Blockchain
ETHEREUM_RPC_URL=https://rpc.url

# Redis (if needed for Vercel deployment)
REDIS_URL=redis://host:6379
```

## Deployment Considerations

### Database & External Services

Since Vercel is a serverless platform:
- **PostgreSQL**: Use managed database (Vercel Postgres, AWS RDS, or similar)
- **Redis**: Use managed Redis (Redis Cloud, Upstash, etc.)
- **Blockchain**: Continue using same RPC endpoints

### API Deployment Options

1. **Next.js API Routes** (recommended for Vercel):
   - Migrate Express routes to Next.js API routes
   - Runs as serverless functions
   - Better integration with Vercel platform

2. **Separate Service** (current setup):
   - Deploy API separately (Railway, Render, Heroku)
   - Update `NEXT_PUBLIC_API_URL` env variable
   - Keep current Express.js implementation

### Build Timeout

Vercel has a build timeout of 45 minutes. Current build should complete in < 5 minutes.

### Storage

Vercel deployment is ephemeral. For persistent storage:
- Use managed databases (PostgreSQL, MongoDB)
- Use cloud storage (AWS S3, Azure Blob)
- Don't store files on Vercel filesystem

## Troubleshooting

### Build Failures

**Issue**: `turbo command not found`
- **Solution**: Ensure `turbo` is in root `package.json` devDependencies

**Issue**: Missing environment variables
- **Solution**: Add all required env vars in Vercel project settings

**Issue**: Cannot find module `@afyaToken/types`
- **Solution**: Ensure types are built before apps. Turbo pipeline dependency order should handle this.

### Performance Issues

- Check Vercel Analytics dashboard
- Enable caching for static assets
- Review build logs for optimization opportunities

## Migration from Current Setup

Current deployment: AWS EKS + Docker

**To migrate to Vercel:**

1. Update package.json files (✓ Done)
2. Create vercel.json (✓ Done)
3. Create .vercelignore (✓ Done)
4. Update next.config files (✓ Done)
5. Set up environment variables in Vercel
6. Configure database (PostgreSQL)
7. Configure Redis or remove if not critical
8. Deploy API separately or migrate to Next.js API routes
9. Test all functionality in preview deployment
10. Deploy to production

## References

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment/vercel)
- [Turborepo on Vercel](https://turbo.build/repo/docs/guides/platforms/vercel)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
