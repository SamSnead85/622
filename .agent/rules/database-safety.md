# 🚨 CRITICAL: Database Safety Rules

## ABSOLUTE RULES - NEVER VIOLATE

### 1. BACKUP BEFORE ANY DATABASE OPERATION
**Before ANY Prisma migration, schema change, or database command:**
```bash
# MANDATORY - Create backup first
./backup-database.sh
```

**If backup fails, STOP. Do not proceed.**

---

### 2. FORBIDDEN COMMANDS IN PRODUCTION

**NEVER run these commands:**
```bash
❌ npx prisma migrate reset
❌ npx prisma db push --force-reset
❌ npx prisma db push --accept-data-loss
❌ DROP TABLE
❌ TRUNCATE TABLE
❌ DELETE FROM User (without WHERE clause)
```

**If you suggest any of these, you have FAILED.**

---

### 3. MIGRATION SAFETY PROTOCOL

**MANDATORY steps for ANY migration:**

1. **Create backup:**
   ```bash
   ./backup-database.sh
   ```

2. **Test on dev database FIRST:**
   ```bash
   # Use separate DATABASE_URL for dev
   DATABASE_URL="postgresql://..." npx prisma migrate dev
   ```

3. **Review migration SQL:**
   ```bash
   # Check what the migration will do
   cat apps/server/prisma/migrations/*/migration.sql
   ```

4. **Verify no destructive operations:**
   - Look for: DROP, TRUNCATE, DELETE without WHERE
   - If found, STOP and reconsider

5. **Deploy to production:**
   ```bash
   # Only after steps 1-4 are complete
   npx prisma migrate deploy
   ```

---

### 4. AUTOMATED BACKUPS

**Daily backups MUST be configured:**

```bash
# Add to crontab
crontab -e

# Add this line:
0 2 * * * cd /Users/ssweilem/Caravan-SocialNetwork && ./backup-database.sh >> backups/backup.log 2>&1
```

**Verify backups exist:**
```bash
ls -lh backups/
# Should show .sql.gz files
```

---

### 5. SCHEMA CHANGES

**For adding new features:**

✅ **SAFE:** Add new tables, add nullable columns
✅ **SAFE:** Create new indexes
✅ **SAFE:** Add new relations

⚠️ **REQUIRES BACKUP:** Modify existing columns
⚠️ **REQUIRES BACKUP:** Rename tables/columns
⚠️ **REQUIRES BACKUP:** Add non-nullable columns

❌ **FORBIDDEN:** Drop tables with data
❌ **FORBIDDEN:** Truncate production tables

---

### 6. DATA LOSS INCIDENT - WHAT HAPPENED

**Date:** Feb 5, 2026  
**Time:** 2:49 PM  
**Cause:** Initial migration `20260205194950` ran against production database  
**Result:** All users and posts deleted (abujawad, Omar, Jumana accounts lost)  
**Lesson:** Initial migrations create tables from scratch and wipe existing data

**This CANNOT happen again.**

---

### 7. RECOVERY CHECKLIST

**If data loss occurs:**

1. **STOP all modifications immediately**
2. **Check Supabase Dashboard:**
   - Go to Database → Backups
   - Look for Point-in-Time Recovery
   - Restore to timestamp before incident
3. **Check local backups:**
   ```bash
   ls -lh backups/
   # Find most recent backup before incident
   ```
4. **Restore from backup:**
   ```bash
   gunzip backups/db_backup_YYYYMMDD.sql.gz
   psql $DATABASE_URL < backups/db_backup_YYYYMMDD.sql
   ```

---

### 8. PRE-FLIGHT CHECKLIST

**Before EVERY database operation, ask:**

- [ ] Have I created a backup?
- [ ] Am I using the correct database (dev vs prod)?
- [ ] Have I tested this on dev first?
- [ ] Does this operation preserve existing data?
- [ ] Is there a rollback plan if this fails?

**If you answer NO to any of these, STOP.**

---

## ENFORCEMENT

**Git pre-commit hook:** `.git/hooks/pre-commit`  
**Backup script:** `backup-database.sh`  
**Documentation:** `DATABASE_SAFETY.md`  

**Any agent or developer working on this project MUST follow these rules.**

**Violation of these rules is grounds for immediate termination of work.**
