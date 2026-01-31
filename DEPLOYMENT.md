# Caravan Platform - Production Deployment Guide

## Pre-Deployment Checklist

### 1. Accounts You Need (Free tiers available)
- [ ] GitHub account (for code hosting)
- [ ] Supabase account (database) - supabase.com
- [ ] Netlify account (frontend hosting) - netlify.com
- [ ] Railway account (backend hosting) - railway.app

### 2. Domain (Optional but recommended)
- [ ] Purchase domain (Namecheap, GoDaddy, or Google Domains)
- [ ] Recommended: caravan.app, joincaravan.com, or similar

---

## Deployment Steps

### Step 1: Push Code to GitHub

```bash
cd /Users/ssweilem/Caravan-SocialNetwork
git init
git add .
git commit -m "Initial commit - Caravan Platform"
git remote add origin https://github.com/YOUR_USERNAME/caravan-platform.git
git push -u origin main
```

### Step 2: Create Supabase Database

1. Go to supabase.com and create a new project
2. Choose a region close to your users
3. Copy the connection string (Settings > Database > Connection string > URI)
4. It will look like: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`

### Step 3: Deploy Backend to Railway

1. Go to railway.app and sign in with GitHub
2. Click "New Project" > "Deploy from GitHub repo"
3. Select your repository, then select the `apps/server` directory
4. Add environment variables:
   ```
   DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
   JWT_SECRET=your-super-secret-jwt-key-min-32-chars
   CORS_ORIGIN=https://your-netlify-app.netlify.app
   NODE_ENV=production
   PORT=5180
   ```
5. Railway will auto-deploy and give you a URL like: `caravan-server-production.up.railway.app`

### Step 4: Run Database Migrations

In Railway console or locally:
```bash
cd apps/server
npx prisma migrate deploy
```

### Step 5: Deploy Frontend to Netlify

1. Go to netlify.com and sign in with GitHub
2. Click "Add new site" > "Import an existing project"
3. Connect your GitHub repository
4. Netlify will auto-detect the `netlify.toml` configuration
5. Add environment variable in Site Settings > Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
   ```
6. Click Deploy - Netlify will give you a URL like: `caravan-platform.netlify.app`

### Step 6: Connect Custom Domain

**In Netlify:**
1. Go to Site Settings > Domain management
2. Click "Add custom domain"
3. Add your domain (e.g., caravan.app)
4. Update DNS records as instructed (usually add CNAME or A record)

**Update CORS:**
In Railway, update `CORS_ORIGIN` to your custom domain.

---

## Environment Variables Summary

### Backend (Railway)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secure-random-string-at-least-32-characters
CORS_ORIGIN=https://caravan.app
NODE_ENV=production
PORT=5180
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (Netlify)
```env
NEXT_PUBLIC_API_URL=https://api.caravan.app
```

---

## Mobile App (Future)

### iOS App Store
1. Requires Apple Developer Account ($99/year)
2. Build using React Native or native Swift
3. Submit to App Store (1-2 week review process)
4. TestFlight for beta testing

### Android Play Store
1. Requires Google Play Developer Account ($25 one-time)
2. Build using React Native or native Kotlin
3. Submit to Play Store (1-3 day review process)

### PWA (Progressive Web App) - Quick Alternative
Your Next.js app can be installed as a PWA on phones without app store approval.
Add to `next.config.js`:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});
module.exports = withPWA({ ... });
```

---

## Estimated Costs

| Service | Monthly Cost |
|---------|-------------|
| Supabase (Free tier) | $0 |
| Railway (Starter) | $5-10 |
| Netlify (Free tier) | $0 |
| Domain | ~$1 (yearly ~$12) |
| **Total** | **~$6-11/month** |

---

## Production Security Checklist

- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Enable SSL/HTTPS (automatic on Netlify/Railway)
- [ ] Set strict CORS origins
- [ ] Enable rate limiting (already configured)
- [ ] Review Supabase Row Level Security policies
- [ ] Set up database backups

---

## Next Steps After Deployment

1. Set up monitoring (Netlify Analytics, Railway Logs)
2. Configure email service (Resend, SendGrid) for auth emails
3. Add file storage (Supabase Storage, Cloudinary) for images/videos
4. Set up push notifications (OneSignal, Firebase)

---

## Quick Commands

```bash
# Run backend locally
cd apps/server && npm run dev

# Run frontend locally
cd apps/web && npm run dev

# Build for production
cd apps/web && npm run build

# Run database migrations
cd apps/server && npx prisma migrate deploy
```
