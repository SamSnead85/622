# Join0G.com Domain Integration & Redirect Strategy

You have a massive asset in `join0g.com`. Using a dedicated "Action Domain" is a power move used by top tech companies (e.g., `wp.me`, `fb.com`, `t.co`).

**Verdict**: It is **NOT** a complication. It is a **Branding Force Multiplier**.

## Why use it?
1.  **Trust & Safety**: `join0g.com/r/sam` looks much safer than a long URL with query parameters.
2.  **Viral Velocity**: It's easier to say, type, and remember.
3.  **QR Code Density**: Shorter URLs produce simpler QR codes that scan faster and at greater distances.

## Required DNS / Cloud Config
For the invite links (e.g., `https://join0g.com/r/abc12345`) to work, you need a redirect rule.

### Option A: If hosting on Vercel (Recommended)
Add `join0g.com` as a domain to your project, but configure a **Rewrite** or **Redirect** in `next.config.js` or `vercel.json`.

**verccl.json example:**
```json
{
  "redirects": [
    {
      "source": "/r/:code",
      "destination": "https://zerogravity.app/signup?ref=:code",
      "permanent": true
    },
    {
      "source": "/",
      "destination": "https://zerogravity.app/signup",
      "permanent": true
    }
  ]
}
```

### Option B: Registrar Forwarding (Namecheap/GoDaddy)
1.  Go to Domain Management.
2.  Set **Forwarding** to `https://zerogravity.app/signup`.
3.  *Note*: Basic forwarding often drops the path/query, so Option A or a Cloudflare Rule is better for maintaining the referral code.

## The Strategy Implemented
I have updated the application to generate `join0g.com` links by default. 
**Action item**: Ensure the redirect logic is active, otherwise invite links will dead-end.
