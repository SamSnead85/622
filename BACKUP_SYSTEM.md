# Database Backup System

## Automated Backups

**Script:** `backup-database.sh`

**Schedule:** Daily at 2 AM (via cron)

**Setup cron job:**
```bash
crontab -e
# Add this line:
0 2 * * * cd /Users/ssweilem/Caravan-SocialNetwork && ./backup-database.sh >> backups/backup.log 2>&1
```

**Manual Backup:**
```bash
./backup-database.sh
```

---

## Supabase Point-in-Time Recovery

**Check if available:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Database → Backups
4. Look for "Point in Time Recovery" option
5. If available, you can restore to ANY point in last 7 days

**If this exists, you can recover the abujawad data!**

---

## Recovery Steps

### If Supabase has PITR:
1. Go to Supabase Dashboard
2. Database → Backups → Point in Time Recovery
3. Select timestamp: **Feb 5, 2026 at 2:00 PM** (before migration)
4. Restore

### If Supabase has manual backups:
1. Check if automatic daily backup exists from yesterday/this morning
2. Download backup
3. Restore using:
```bash
psql $DATABASE_URL < backup_file.sql
```

---

## Going Forward

**Backups will be saved to:**
`/Users/ssweilem/Caravan-SocialNetwork/backups/`

**Retention:** 30 days

**Format:** Compressed SQL dumps (.gz)

---

## Emergency Contact

If Supabase doesn't have backups, contact Supabase support:
- They may have infrastructure-level backups
- Explain you need recovery from ~2 PM today
