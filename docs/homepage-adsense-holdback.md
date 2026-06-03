# Homepage AdSense holdback (temporary)

> **Magic phrase for Cursor / AI:** `AdSense approved — restore homepage`
>
> Say that exact line when Google AdSense is live and approved. The agent should follow the **Restore checklist** below.

---

## Message to Ben (copy/paste)

Hey Ben —

**Google AdSense rejected us again.** So we made some homepage changes to fix what they probably didn’t like.

I pushed the updates to **preview** (not on the live site yet).

**What we changed:**
- **Kind Joe stories show first** on the homepage (our own articles, not outside links)
- **RSS / outside news links** moved to the **bottom** and only **a few** show (labeled “External sources”)
- **Markets snapshot (stocks ticker)** — moved out of the homepage sidebar and put in a **bar right under the navbar**. It shows on **every public page** now (not just the homepage), so live market numbers are always visible at the top.
- **Trust bar** added (About, Editorial, Contact)
- **Editor’s picks** + **newsletter** in the sidebar
- **Empty ad boxes hidden** for now — we’ll turn ads on after approval
- **Mobile layout** fixes so nothing overflows on phones

**Why:** AdSense wants a real publisher site with **our content first**, not a page that mostly sends people to other websites.

**We’ll bring the bigger RSS section back** once AdSense is approved and ads are live.

**Can you check preview and tell me if it looks good?** If yes, I’ll push it live.

Thanks!

---

## Team message (copy/paste, general)

**Subject: Homepage update — AdSense rejected again**

Hey team —

**Google AdSense rejected us again**, so we updated the homepage to better match what they want.

**What changed:**
- **Our Kind Joe stories show first**
- **Outside RSS links** moved to the **bottom** (only a few for now)
- **Markets snapshot (stocks ticker)** — now in a **bar under the navbar on every page** (was on the homepage sidebar before)
- **Trust bar**, newsletter, Editor’s picks added
- **Ad placeholders hidden** until we’re approved

**Why?** They want the site to look like **our** news site, not mostly links to other publishers.

**RSS feed comes back** after AdSense is approved and ads are live. Nothing was deleted — just moved.

Thanks!

---

## Why the RSS / external feed changed

| Before (roughly) | Now (AdSense holdback) |
|------------------|-------------------------|
| Homepage felt like a **grid of outside news links** | Homepage leads with **Kind Joe articles** |
| Many external links opened other sites | External RSS is **at the bottom**, max **6** items |
| Label was easy to miss | Section says **“External sources”** and **“Opens in new tab”** |

**Reason:** AdSense reviewers check that the site has **enough original content** and is not mainly **outbound links** to other publishers.

---

## What else changed on the homepage (same holdback)

- **Markets ticker** → now under the navbar on all public pages (`app/(public)/layout.tsx`)
- **Social widget** (“Connect with The Kindjoe Show”) → removed from homepage sidebar
- **Trust bar** + **newsletter** + **Editor’s picks** → added for publisher trust
- **Homepage ad placeholders** → hidden for now (mobile + sidebar). Restore after AdSense approval — see checklist
- **Main article list** → text + image cards, Kind Joe stories first

Reference for old-style layout: `app/(public)/(kindjoe-stories)/news/page.tsx` (still has stocks + social widget pattern).

---

## Restore checklist (after AdSense is approved)

When someone says **`AdSense approved — restore homepage`**, do this:

### 1. RSS / external headlines (`components/rss-news/external-headlines-section.tsx`)

- [ ] Change `MAX_HEADLINES` from `6` back to `36` (or previous product choice)
- [ ] Move section **up** on the homepage — e.g. into `<main>` above or beside articles, not only at the bottom
- [ ] Optionally restore a **larger grid** layout (see `NewsArticleGridSkeleton` in `components/rss-news/home-page-fallbacks.tsx` for the old 3-column grid classes)

### 2. Homepage layout (`app/(public)/page.tsx`)

- [ ] Re-order sections if product wants RSS more prominent again
- [ ] Remove or reduce holdback comment block at top of file (search `ADSENSE_HOLDBACK`)

### 3. Homepage sidebar (`components/home/homepage-sidebar.tsx`)

- [ ] Optionally add back `SocialWidget` from `@/components/ventura-county/social-widget` if team wants it
- [ ] Re-enable `AdvertisementSlot` (sidebar ad) — uncomment / restore import and component

### 4. Homepage mobile ad (`app/(public)/page.tsx`)

- [ ] Re-add `<HomepageMobileAd />` below `<PublisherTrustBar />` (import from `@/components/home/homepage-mobile-ad`)

### 5. Keep (usually do **not** revert)

- Markets bar under navbar (unless team asks)
- `public/ads.txt` and AdSense ad units
- Trust bar, privacy policy, cookie consent
- SEO fixes (redirects, sitemap, canonicals)

### 6. Deploy

- [ ] Deploy to production
- [ ] Confirm AdSense still shows ads after layout change

---

## Files to touch for restore

| File | What to restore |
|------|-----------------|
| `components/rss-news/external-headlines-section.tsx` | `MAX_HEADLINES`, layout, position |
| `app/(public)/page.tsx` | Section order, RSS placement |
| `components/home/homepage-sidebar.tsx` | Optional SocialWidget |

---

## AdSense signup reminder

Register the site in AdSense as **`www.kindjoe.com`** (not the bare `kindjoe.com`) so `ads.txt` is found.
