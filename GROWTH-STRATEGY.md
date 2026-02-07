# ZeroG Growth Strategy — Launch Playbook

**Last Updated:** February 2026
**Status:** Phase 1 — Pre-launch / Early Access

---

## Three-Pronged Growth Strategy

### Prong 1: Community Needs Board (Grassroots Capture)

**The Insight:** Real communities are using Google Groups, WhatsApp broadcasts, and email chains to coordinate around urgent needs. These tools are fragmented, unsearchable, and have zero discoverability. ZeroG can be the central hub.

**Execution:**
1. **Public Needs Board** (`/needs`) — No login required to browse. SEO-optimized. Shareable.
2. Identify 10-15 active community groups (mosques, cultural organizations, mutual aid groups) in target cities (Tampa, Orlando, Houston, Detroit, Chicago, NYC).
3. Reach out to group admins. Offer to digitize their community board on ZeroG for free.
4. Each need/fundraiser/event gets a shareable link that drives traffic to ZeroG.
5. Viewers see the CTA: "Have a need? Share it with your community. Get Early Access to ZeroG."

**Target Cities (Phase 1):**
- Tampa, FL (home base — start here)
- Orlando, FL
- Houston, TX
- Detroit/Dearborn, MI
- Chicago, IL

**KPIs:**
- 50 community needs posted in first 30 days
- 5 community groups actively using the board
- 500 unique visitors to `/needs` per week

---

### Prong 2: Event Sponsorships (Brand Visibility)

**The Insight:** Community events (iftar nights, fundraisers, cultural gatherings) draw 100-500+ attendees who are exactly the target demographic. Sponsoring these events puts ZeroG in front of engaged, real community members.

**Execution:**
1. **Campaign System** (`/c/{slug}`) — Each sponsored event gets a branded landing page with signup form and raffle entry.
2. Sponsor 2-3 iftar nights during Ramadan 2026 (March/April).
3. Each event: QR codes at tables, mentions during announcements, branded signage.
4. Raffle incentive: 1 in 100 signups wins a $100 gift card.
5. All signups get early access codes.

**Budget Estimate (per event):**
| Item | Cost |
|------|------|
| Event sponsorship | $500-1,000 |
| Gift card (raffle) | $100 |
| QR code signage | $50 |
| **Total per event** | **$650-1,150** |

**Campaign Flow:**
1. Attendee scans QR code → lands on `/c/ramadan-iftar-tampa`
2. Enters name + email → gets raffle entry + early access code
3. After event → receives email with access code + "Join ZeroG"
4. Raffle winner announced on ZeroG (drives return visits)

**Example Campaigns to Create:**
- `ramadan-iftar-tampa-2026` — Ramadan Iftar Night, Tampa
- `ramadan-iftar-orlando-2026` — Ramadan Iftar Night, Orlando
- `tampa-community-drive` — Community Needs Drive, Tampa
- `eid-celebration-2026` — Eid Community Celebration

**KPIs:**
- 3 events sponsored in first 60 days
- 300+ signups per event
- 30% conversion from signup to platform account

---

### Prong 3: Creator Ambassador Program (Network Effects)

**The Insight:** Content creators on TikTok/Instagram face real risk — TikTok bans, algorithm changes, account suspensions. ZeroG is their "insurance policy." Recruit creators to bring their audience.

**Execution:**
1. **Creator Program Page** (`/creators`) — Public application with de-risking pitch.
2. Target 3 types of creators:
   - **Community leaders** (imams, community organizers, activists) — 500-5K followers
   - **Content creators** (food, fashion, comedy, faith) — 5K-50K followers
   - **Influencers** (established names) — 50K+ followers
3. Incentive structure:
   - **Ambassador** (500+): 10 invite codes, verified badge, priority support
   - **Creator** (5K+): 50 codes, featured on Discover, analytics dashboard
   - **Partner** (50K+): Unlimited codes, revenue share, dedicated support

**The Pitch (for Creators):**
> "TikTok gets banned. Instagram changes its algorithm. Your audience disappears overnight. ZeroG is the hedge. Build your community on a platform that can't be taken away. It takes 5 minutes to set up, one post to tell your audience, and you have a permanent home."

**Outreach Channels:**
- DM creators directly on Instagram/TikTok
- Post in creator-focused Facebook groups and Discord servers
- Attend creator meetups and conferences
- Partner with existing creator networks

**Affiliate Tracking:**
- Each creator gets a unique referral code (e.g., `CR-SAMIRA`)
- Dashboard shows: signups, active users, conversion rate
- Monthly reports emailed

**KPIs:**
- 20 creator applications in first 30 days
- 5 approved creators actively promoting
- 1,000 signups via creator referral codes in first 90 days

---

## Immediate Action Items

### Week 1: Foundation
- [x] Build Campaign system (schema, API, landing pages)
- [x] Build Creator Program page with application form
- [x] Build Public Needs Board
- [x] Build Admin Campaign Manager
- [x] Build Admin Creator Review page
- [ ] Create first campaign: `ramadan-iftar-tampa-2026`
- [ ] Identify 5 Tampa-area community groups to reach out to
- [ ] Draft outreach email/DM templates for community leaders

### Week 2: Outreach
- [ ] Send outreach to 5 community group admins (offer free community board)
- [ ] Contact 3-5 mosque/community center event coordinators about Ramadan sponsorship
- [ ] Identify and DM 10 content creators in target niches
- [ ] Post the Tampa community need (car donation) on the public needs board

### Week 3: Launch Campaigns
- [ ] Finalize Ramadan iftar sponsorship deals
- [ ] Create campaign landing pages for each event
- [ ] Generate QR codes for event signage
- [ ] Set up raffle system (drawing date, notification emails)

### Week 4: Creator Activation
- [ ] Review and approve first wave of creator applications
- [ ] Send creator welcome kits (how-to guide, talking points, graphics)
- [ ] Track initial referral performance
- [ ] Adjust incentives based on early data

---

## Content for the Tampa Community Need

Based on the Google Groups email received, here's how to post this on ZeroG's needs board:

**Title:** Urgent: Car Needed for Orphan Family
**Type:** NEED / Community Need
**Category:** COMMUNITY
**Content:** A family in our community is in need of a reliable vehicle. If you have a vehicle you can donate or contribute toward purchasing one, it would make a huge difference. Your generosity could provide essential transportation for a family going through a tough time. The immediate need is about $7,000 towards a reliable car, insha'Allah.
**External Link:** [Donation Link]
**Location:** Tampa, FL
**Tags:** donation, family, community-support, tampa

---

## Growth Metrics Dashboard

Track these weekly:

| Metric | Week 1 | Week 2 | Week 3 | Week 4 | Month 2 |
|--------|--------|--------|--------|--------|---------|
| Total signups | - | - | - | - | - |
| Campaign signups | - | - | - | - | - |
| Creator applications | - | - | - | - | - |
| Active creators | - | - | - | - | - |
| Needs board posts | - | - | - | - | - |
| Needs board views | - | - | - | - | - |
| Referral conversions | - | - | - | - | - |
| Event attendees | - | - | - | - | - |

---

## Technical Infrastructure (Built)

| Component | Route | Status |
|-----------|-------|--------|
| Campaign landing pages | `/c/{slug}` | Built |
| Public needs board | `/needs` | Built |
| Creator program page | `/creators` | Built |
| Admin campaign manager | `/admin/campaigns` | Built |
| Admin creator review | `/admin/creators` | Built |
| Campaign API | `/api/v1/campaigns/*` | Built |
| Creator API | `/api/v1/creators/*` | Built |
| Referral tracking | `/api/invite/*` | Existing |
| Early access system | `/early-access` | Existing |

---

## Budget Summary (First 90 Days)

| Category | Estimated Cost |
|----------|---------------|
| Event sponsorships (3 events) | $2,000-3,500 |
| Raffle prizes | $300 |
| QR code signage & materials | $150 |
| Creator incentives (gift cards) | $500 |
| **Total** | **$2,950-4,450** |

This is a lean, community-first growth strategy. No paid ads. No influencer marketing agencies. Just real communities, real needs, and real people building something together.
