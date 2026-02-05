---
description: Safe database migration workflow
---

# Database Migration Workflow

**CRITICAL: Follow these steps EXACTLY for any database changes.**

---

## Step 1: Create Backup (MANDATORY)

// turbo
```bash
cd /Users/ssweilem/Caravan-SocialNetwork
./backup-database.sh
```

**Verify backup created:**
```bash
ls -lh backups/ | tail -1
```

**If backup fails, STOP. Do not proceed.**

---

## Step 2: Make Schema Changes

Edit the Prisma schema:
```bash
# Open schema file
code apps/server/prisma/schema.prisma
```

**Make your changes (add models, fields, etc.)**

---

## Step 3: Create Migration (Dev Database)

**Use a SEPARATE dev database:**
```bash
cd apps/server

# Set dev database URL (NOT production!)
export DATABASE_URL="postgresql://dev_user:dev_pass@localhost:5432/dev_db"

# Create migration
npx prisma migrate dev --name describe_your_change
```

**Review the generated SQL:**
```bash
cat prisma/migrations/*/migration.sql
```

**Look for dangerous operations:**
- DROP TABLE
- TRUNCATE
- DELETE without WHERE
- ALTER COLUMN (data loss risk)

**If found, reconsider the approach.**

---

## Step 4: Test on Dev Database

**Run the migration on dev:**
```bash
DATABASE_URL="postgresql://dev_db_url" npx prisma migrate deploy
```

**Verify dev database still has data:**
```bash
DATABASE_URL="postgresql://dev_db_url" npx prisma studio
# Check that existing records are still there
```

**If data was lost in dev, FIX THE MIGRATION before production.**

---

## Step 5: Deploy to Production

**Only after Steps 1-4 are complete:**

```bash
cd apps/server

# Use production database URL
export DATABASE_URL="postgresql://production_url"

# Deploy migration
npx prisma migrate deploy
```

**Verify production data preserved:**
```bash
npx prisma studio
# Check that users, posts, etc. still exist
```

---

## Step 6: Post-Migration Verification

**Check that nothing broke:**

1. **Open the app:** http://localhost:3000
2. **Test login** with existing account
3. **Check feed** shows existing posts
4. **Verify new feature** works as expected

**If anything is broken, restore from backup:**
```bash
# Restore latest backup
gunzip backups/db_backup_*.sql.gz
psql $DATABASE_URL < backups/db_backup_*.sql
```

---

## EMERGENCY: If Data Lost

1. **STOP all operations**
2. **Do NOT make more changes**
3. **Check Supabase backups:**
   - Go to https://supabase.com/dashboard
   - Database → Backups → Point-in-Time Recovery
4. **Restore from local backup:**
   ```bash
   ./restore-database.sh backups/db_backup_YYYYMMDD.sql.gz
   ```

---

## Common Mistakes to Avoid

❌ **Running migrations without backups**  
❌ **Testing on production first**  
❌ **Ignoring migration SQL review**  
❌ **Using `migrate reset` in production**  
❌ **Not verifying data after migration**  

**Any of these mistakes can cause permanent data loss.**
