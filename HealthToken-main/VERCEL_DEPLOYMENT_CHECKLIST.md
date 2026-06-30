# Vercel Deployment Checklist

This checklist ensures all necessary steps are completed before deploying AfyaToken to Vercel.

## Pre-Deployment Setup

### 1. Repository Setup
- [ ] Push all changes to main branch
- [ ] Ensure CI/CD pipeline passes
- [ ] Create GitHub repository (if not already done)
- [ ] Grant Vercel access to repository

### 2. Vercel Project Setup
- [ ] Create Vercel account (https://vercel.com)
- [ ] Connect GitHub repository to Vercel
- [ ] Select appropriate team/workspace
- [ ] Configure project name and settings
- [ ] Set default branch to `main`

### 3. Environment Variables Configuration

Add the following in Vercel Project Settings → Environment Variables:

#### Required Environment Variables
```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
NEXTAUTH_SECRET=[generate using: openssl rand -base64 32]
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
ETHEREUM_RPC_URL=https://rpc.example.com
JWT_SECRET=[generate a secure key]
```

#### Optional Environment Variables
```
REDIS_URL=redis://[user]:[password]@[host]:[port]
LOG_LEVEL=info
NODE_ENV=production
```

**Pro Tip**: Use the same environment variables for different deployment environments:
- `Production`: For main branch production deployments
- `Preview`: For feature branch preview deployments
- `Development`: For local development (not on Vercel)

### 4. Database Preparation

Choose one option:

#### Option A: Vercel PostgreSQL (Easiest)
- [ ] Create PostgreSQL database in Vercel Dashboard
- [ ] Copy connection string to `DATABASE_URL`
- [ ] Skip to "Schema Setup"

#### Option B: External Database (Current Architecture)
- [ ] Provision PostgreSQL 16 instance
  - AWS RDS
  - DigitalOcean Managed Databases
  - Azure Database for PostgreSQL
  - Supabase
- [ ] Configure security groups/firewall for Vercel IPs
  - Add Vercel IP ranges: https://vercel.com/docs/concepts/infrastructure/regions/edge-locations
- [ ] Copy connection string to `DATABASE_URL`

#### Option C: Docker Container (Not Recommended for Vercel)
- [ ] Not recommended as Vercel is serverless
- [ ] Consider separate deployment for stateful services

### 5. Schema Setup

After database is ready:

```bash
# Install dependencies
npm install

# Run Prisma migrations
npm run db:migrate

# (Optional) Seed test data
npm run db:seed
```

### 6. Redis Configuration

For session management and rate limiting:

#### Option A: Remove Redis Dependency (Simplest)
- [ ] Modify API to use Vercel KV (serverless Redis)
- Or use database-backed sessions

#### Option B: External Redis Service
- [ ] Set up Redis Cloud, Upstash, or AWS ElastiCache
- [ ] Configure `REDIS_URL` environment variable
- [ ] Ensure Vercel can connect to Redis endpoint

### 7. Custom Domain Configuration

#### If Using Custom Domain:
- [ ] Purchase domain (Vercel Domains, GoDaddy, Namecheap, etc.)
- [ ] In Vercel: Project Settings → Domains
- [ ] Add custom domain (e.g., `app.afyatoken.co.ke`)
- [ ] Vercel will provide nameservers or DNS records
- [ ] Update DNS with Vercel's nameservers
- [ ] Wait for DNS propagation (5-48 hours)
- [ ] Enable SSL/TLS (automatic with Let's Encrypt)

#### If Using Vercel's Domain:
- [ ] Domain automatically assigned: `[project].vercel.app`
- [ ] No DNS configuration needed

### 8. Build Verification

Before production deployment:

```bash
# Test local build process
npm run build

# Check for any errors or warnings
npm run lint
npm run type-check

# Test build output
npm run start
```

Expected output:
- ✅ All three Next.js apps build successfully
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Types package builds correctly

### 9. API Configuration

#### Option A: Deploy API Separately (Recommended)
- [ ] Deploy Node.js API to:
  - Railway.app
  - Render.com
  - Heroku (deprecated, use Railway instead)
  - AWS Lambda
- [ ] Update `NEXT_PUBLIC_API_URL` to point to deployed API
- [ ] Test API connectivity
- [ ] Verify CORS configuration

#### Option B: Migrate to Next.js API Routes
- [ ] Convert Express routes to Next.js API routes
- [ ] Update imports and dependencies
- [ ] Test all endpoints
- [ ] This enables full serverless deployment

#### Option C: Keep in apps/api folder
- [ ] Vercel will attempt to deploy as Node.js function
- [ ] May have limitations on execution time and memory
- [ ] Requires proper configuration in vercel.json

### 10. Authentication Setup

- [ ] Configure NextAuth JWT secret (`NEXTAUTH_SECRET`)
- [ ] Set `NEXTAUTH_URL` to your domain
- [ ] Configure OAuth providers (if applicable)
- [ ] Test login flow in preview deployment

### 11. Blockchain Configuration

For smart contract interactions:

- [ ] Configure `ETHEREUM_RPC_URL` for Hyperledger Besu
- [ ] Test blockchain connectivity
- [ ] Verify contract addresses are correct
- [ ] Set up Web3 wallet if needed

### 12. Monitoring & Analytics

#### Enable Vercel Analytics
- [ ] In Vercel Dashboard → Analytics
- [ ] Monitor performance metrics
- [ ] Set up alerts for errors/slowness

#### Configure Logging
- [ ] Use Winston (configured in API)
- [ ] Configure log destination (CloudWatch, Datadog, etc.)
- [ ] Set `LOG_LEVEL` environment variable

### 13. Security Checklist

- [ ] All API keys are environment variables (not in code)
- [ ] `NEXTAUTH_SECRET` is cryptographically secure
- [ ] Database password is strong
- [ ] CORS is properly configured
- [ ] SSL/TLS is enabled (automatic on Vercel)
- [ ] Security headers are configured (done in next.config)
- [ ] Rate limiting is enabled on API
- [ ] Regular security audits: `npm audit`

### 14. Preview Deployment

First deployment should be preview (non-production):

```bash
vercel --token [your-vercel-token]
```

Or through GitHub:
- [ ] Create feature branch
- [ ] Push to GitHub
- [ ] Vercel automatically creates preview deployment
- [ ] Review preview URL
- [ ] Test all functionality

**Test Checklist for Preview:**
- [ ] Home page loads
- [ ] Admin dashboard accessible
- [ ] Authentication works
- [ ] API calls succeed
- [ ] Database queries work
- [ ] Blockchain interactions work
- [ ] Static assets load
- [ ] Mobile responsive
- [ ] No console errors

### 15. Production Deployment

After preview tests pass:

#### Via GitHub (Recommended)
- [ ] Merge feature branch to main
- [ ] Vercel automatically deploys to production
- [ ] Monitor build logs
- [ ] Verify production domain

#### Manual Deployment
```bash
vercel deploy --prod --token [your-vercel-token]
```

### 16. Post-Deployment Verification

- [ ] Production domain is accessible
- [ ] SSL certificate is valid
- [ ] All pages load correctly
- [ ] API responses are correct
- [ ] Database operations work
- [ ] Authentication flow works
- [ ] Monitor error logs
- [ ] Check Vercel Analytics dashboard

## Rollback Plan

If issues occur in production:

1. **Immediate Rollback**:
   ```bash
   vercel rollback
   ```

2. **Or revert to previous deployment**:
   - In Vercel Dashboard → Deployments
   - Click the previous successful deployment
   - Click "Promote to Production"

## Troubleshooting

### Build Fails: "turbo command not found"
- Ensure turbo is in root `package.json` devDependencies
- Vercel caches node_modules; try a clean rebuild

### Build Fails: "Cannot find module @afyaToken/types"
- Check that types package is in Turbo pipeline dependencies
- Verify types package.json has correct exports

### API Requests Fail with 502/503
- Check API deployment status (if separate service)
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS configuration
- Review API logs

### Database Connections Time Out
- Verify DATABASE_URL is correct and accessible
- Check firewall/security group allows Vercel IPs
- Ensure database credentials are correct

### Static Assets 404
- Check public directory is included in build
- Verify next.config output mode is 'standalone'
- Review .vercelignore for accidental exclusions

### Performance Issues
- Check build size in Vercel Analytics
- Enable image optimization
- Review API response times
- Consider edge caching for static content

## Performance Optimization

After deployment:

- [ ] Enable automatic image optimization
- [ ] Configure cache headers for static assets
- [ ] Enable edge caching where possible
- [ ] Monitor Core Web Vitals
- [ ] Profile database query performance
- [ ] Consider API caching strategies

## Maintenance

### Regular Tasks
- [ ] Monitor Vercel Analytics dashboard weekly
- [ ] Review error logs daily
- [ ] Update dependencies monthly: `npm update`
- [ ] Run security audits monthly: `npm audit`
- [ ] Test backup and restore procedures quarterly

### Scaling Considerations
- Vercel auto-scales serverless functions
- Monitor function execution times
- May need to increase function memory/timeout
- Database connection pooling may be needed for high traffic

## Success Criteria

✅ Deployment is successful when:
1. All three Next.js apps deploy and load correctly
2. API endpoints are functional
3. Database operations work
4. Authentication flow is complete
5. No errors in browser console
6. Performance metrics are acceptable
7. SSL certificate is valid
8. Monitoring alerts are configured

## Support

- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Turborepo Guides: https://turbo.build/repo/docs
- GitHub Issues: https://github.com/seaboard-technologies-ltd/afyaToken/issues
