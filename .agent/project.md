# Caravan Project Configuration
## 0Gravity Social Network Platform

**Project**: Caravan (0G Social Network)  
**Current Phase**: Sovereign Communities Implementation - Week 1-2

---

## Tech Stack (Caravan-Specific)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Deployment**: Netlify
- **Styling**: Tailwind CSS v4
- **State**: React Context + TanStack Query

### Backend
- **Runtime**: Node.js + Express + TypeScript
- **Deployment**: Railway
- **Port**: 5180

### Database
- **Provider**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Connection**: Pooled (DATABASE_URL) + Direct (DIRECT_URL)

### Caching & Real-Time
- **Cache**: Railway Redis (using ioredis)
- **Real-Time**: Socket.IO with Redis adapter
- **Queue**: BullMQ (Redis-based)

### Storage
- **Provider**: Supabase Storage
- **Bucket**: `caravan-media`

### Authentication
- **Method**: JWT tokens
- **Library**: jsonwebtoken + bcryptjs

### Email
- **Provider**: Resend
- **From**: `Caravan <noreply@caravan.app>`

### Monitoring
- **Error Tracking**: Sentry (`@sentry/node`)
- **Logging**: Winston

---

## Key Features

### Current Features
1. **User Management**: Registration, login, profiles, avatars
2. **Social Graph**: Following, connections, blocking
3. **Content**: Posts, comments, topics, hashtags
4. **Territories**: Community spaces (CIRCLE, CLAN, TRIBE, NATION, WORLD)
5. **Messaging**: Direct messages, group chats
6. **Campfire**: Live streaming feature
7. **Notifications**: Real-time + email notifications
8. **Media**: Image/video uploads via Supabase Storage

### New Features (Sovereign Communities - In Progress)
1. **Territory Tiers**: TIER_1_PERSONAL, TIER_2_SOVEREIGN, TIER_3_FEDERATED
2. **Custom Feed Algorithms**: User-programmable ranking
3. **End-to-End Encryption**: Signal Protocol for Tier 1
4. **Feed Caching**: Redis-based materialization
5. **Algorithm Templates**: CHRONOLOGICAL, FAMILY_FEED, ACTIVIST, NEWS_HUB, BALANCED, CUSTOM

---

## Important Paths

### Monorepo Structure
```
/Users/ssweilem/Caravan-SocialNetwork/
├── apps/
│   ├── web/              # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/      # App router pages
│   │   │   └── components/
│   │   └── package.json
│   └── server/           # Express backend
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   │   └── cache/RedisCache.ts  # Redis service (already implemented!)
│       │   └── index.ts
│       ├── prisma/
│       │   └── schema.prisma  # Database schema
│       └── package.json
├── .agent/
│   └── project.md        # This file
└── README.md
```

---

## Environment Variables

### Backend (`apps/server/.env`)
```env
# NEVER commit this file! Use .env.example for reference

# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@aws-0-us-east-2.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@aws-0-us-east-2.pooler.supabase.com:5432/postgres

# Server
PORT=5180
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Authentication
JWT_SECRET=[GENERATED_SECRET]
JWT_EXPIRES_IN=7d

# Storage (Supabase)
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_SERVICE_KEY=[SERVICE_KEY]
STORAGE_BUCKET=caravan-media

# Email (Resend)
RESEND_API_KEY=re_[KEY]
FROM_EMAIL=Caravan <noreply@caravan.app>

# Redis (Railway - when provisioned)
REDIS_URL=redis://[HOST]:[PORT]
REDIS_TTL=3600
FEED_CACHE_ENABLED=true

# Monitoring (Sentry)
SENTRY_DSN=https://[KEY]@sentry.io/[PROJECT]
```

### Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5180
NEXT_PUBLIC_WS_URL=ws://localhost:5180
```

---

## Development Commands

### Start Development
```bash
# Backend (Terminal 1)
cd apps/server
npm run dev

# Frontend (Terminal 2)
cd apps/web
npm run dev

# Database Studio (Terminal 3)
cd apps/server
npx prisma studio
```

### Database Operations
```bash
# Create migration
cd apps/server
npx prisma migrate dev --name migration_name

# Apply migration (production)
npx prisma migrate deploy

# View migration status
npx prisma migrate status

# Reset database (DANGER - dev only!)
npx prisma migrate reset
```

### Testing
```bash
# Backend tests
cd apps/server
npm test

# Frontend tests  
cd apps/web
npm test

# Lint
npm run lint
```

---

## Deployment

### Backend (Railway)
- **Auto-deploy**: On push to `main` branch
- **Build**: `npm run build`
- **Start**: `npm run start`
- **Health check**: `/health` endpoint

**Manual deploy**:
```bash
railway up
railway logs --tail
```

### Frontend (Netlify)
- **Auto-deploy**: On push to `main` branch
- **Build**: `npm run build`
- **Publish**: `.next` directory

**Manual deploy**:
```bash
cd apps/web
netlify deploy --prod
```

---

## Skills to Use

### ⭐ Primary Skills (Use These Daily)

**Deployment**:
- `railway-deploy` - Deploy backend to Railway
- `netlify-deploy` - Deploy frontend to Netlify
- `env-management` - Manage environment variables

**Database**:
- `prisma-migration` - Safe database migrations
- `prisma-patterns` - Prisma best practices
- `postgres-optimization` - Query optimization

**Development**:
- `typescript-expert` - TypeScript code review
- `react-patterns` - React best practices
- `nextjs-optimization` - Next.js performance

**Real-Time** (for Campfire):
- `socket-io-patterns` - Socket.IO optimization
- `redis-patterns` - Redis caching strategies

**Security**:
- `api-security` - API security checklist
- `jwt-auth-patterns` - JWT best practices

**Testing**:
- `test-driven-development` - TDD workflow
- `test-coverage` - Coverage requirements

---

## Sovereign Communities Specific

### Current Implementation Phase
**Week 1-2**: Database Schema Enhancements

**Models Added**:
- `CommunityEncryption`
- `TerritoryFeedCache`
- Enhanced `TerritoryAlgorithmSettings`
- Enhanced `Territory` (with tier, maxMembers)

**Enums Added**:
- `TerritoryTier`
- `EncryptionScheme`
- `KeyRotationPolicy`
- `AlgorithmTemplate`

### Next Steps
- **Week 3-4**: Feed Algorithm Service + Redis Integration
- **Week 5-6**: Encryption Service (Signal Protocol)
- **Week 7-10**: Frontend Components (Algorithm Builder, Community Settings)

### Related Artifacts
- Implementation Plan: `.gemini/antigravity/brain/[conversation]/phase1_implementation_plan.md`
- Vision: `.gemini/antigravity/brain/[conversation]/sovereign_communities_vision.md`
- Infrastructure: `.gemini/antigravity/brain/[conversation]/infrastructure_requirements.md`

---

## AI Assistant Guidelines

When working on Caravan:

### Always
- ✅ Use skills for deployment, migrations, testing
- ✅ Follow Prisma patterns for database code
- ✅ Use TypeScript strict mode
- ✅ Reference existing RedisCache service (don't recreate)
- ✅ Check if Socket.IO is already configured
- ✅ Use Supabase Storage for media (not S3 unless specified)

### Never
- ❌ Commit .env files
- ❌ Suggest Vercel (we use Netlify)
- ❌ Suggest AWS RDS (we use Supabase PostgreSQL)
- ❌ Recreate existing services (check first!)
- ❌ Use MongoDB (this is a PostgreSQL project)

### Before Creating New Code
1. Check if service already exists (e.g., RedisCache.ts)
2. Check Prisma schema for existing models
3. Check package.json for existing dependencies
4. Use `typescript-expert` skill for code review

### For Sovereign Communities Work
- Reference the Phase 1 Implementation Plan
- Use the established schema (don't modify without discussion)
- Test algorithm templates one by one
- Verify Redis connection before implementing feed cache

---

## Common Commands Reference

```bash
# Quick start everything
cd apps/server && npm run dev &
cd apps/web && npm run dev

# Apply pending migration
cd apps/server && npx prisma migrate deploy

# Generate Prisma client after schema change
cd apps/server && npx prisma generate

# View database
cd apps/server && npx prisma studio

# Check logs (Railway)
railway logs --tail

# Deploy frontend (Netlify)
cd apps/web && netlify deploy --prod

# Run tests
npm test (in either apps/server or apps/web)
```

---

## Notes

- **Redis**: Code is ready, just needs Railway Redis plugin provisioned
- **Encryption**: Signal Protocol SDK will be installed in Week 3-4
- **Mobile**: Not yet implemented, web-first strategy
- **Demo Data**: Can use Prisma seed scripts if needed

---

**Last Updated**: 2026-02-06  
**Current Focus**: Sovereign Communities Database Schema (Week 1-2)
