# 0G Platform - Project Overview

## Critical Systems

### Database Management
**CRITICAL:** Read `.agent/rules/database-safety.md` BEFORE any database work.

**Workflow:** Use `.agent/workflows/database-migration.md` for all schema changes.

**Tools:**
- `./backup-database.sh` - Create database backup (run daily via cron)
- `./restore-database.sh` - Restore from backup in emergencies

---

## Architecture

- **Frontend:** Next.js 14 (TypeScript) - `/apps/web`
- **Backend:** Express (TypeScript) - `/apps/server`
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma

---

## Development Commands

**Start dev servers:**
```bash
# Frontend
cd apps/web && npm run dev

# Backend
cd apps/server && npm run dev
```

**Database:**
```bash
# View database
cd apps/server && npx prisma studio

# Create backup (ALWAYS do this before migrations)
./backup-database.sh

# Run migration (see workflow in .agent/workflows/database-migration.md)
cd apps/server && npx prisma migrate deploy
```

---

## Safety Rules

1. **NEVER** run `prisma migrate reset` in production
2. **ALWAYS** backup before schema changes
3. **ALWAYS** test migrations on dev database first
4. **READ** `.agent/rules/database-safety.md` before database work

---

## Recent Incidents

**Feb 5, 2026:** Database wipe due to improper migration. All safety systems now in place.

See `DATABASE_SAFETY.md` for full details and prevention measures.
