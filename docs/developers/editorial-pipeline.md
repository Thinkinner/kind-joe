# Kind Joe Editorial Pipeline (AdSense Readiness)

This workflow is the standard for publishing original editorial pieces and meeting AdSense quality requirements.

## Output Target

- Publish at least 10 original articles in a 14-day cycle.
- Minimum article body length: 600 words for publish/schedule.
- Minimum original "Kind Joe take" in body: 300 words for publish/schedule.

## 14-Day Cadence

- Days 1-3: Build queue and assign topics.
- Days 4-10: Publish one original editorial article per day.
- Days 11-14: Publish remaining pieces and update internal links.

## Required Mix for Each 10-Article Sprint

- 3 opinion pieces.
- 3 explainers/deep dives.
- 2 local Ventura or community impact pieces.
- 2 business or tech analysis pieces.

## Article Structure (Required)

1. Headline with clear claim or question.
2. Context paragraph: what happened and why now.
3. Kind Joe take section with original analysis (minimum 300 words).
4. Evidence section with cited source context.
5. Reader impact section (what this means next).
6. Conclusion with unresolved questions or scenarios.

## Publish Gate Checklist

Before pressing Publish now or Schedule:

- Meta description is unique and at least 70 characters.
- Summary excerpt is at least 12 words.
- Body includes at least 300 words of original analysis.
- Full body reaches at least 600 words.
- Category and tags are set accurately.
- Legal-safe language: no unsupported claims, no fabricated quotes.

## Aggregated Story Upgrade Rules

When an article starts from outside reporting:

- Do not publish as a rewrite-only draft.
- Add original framing: local impact, scenario analysis, or stakeholder implications.
- Include at least one "what this means" section in your own voice.

## Verification Commands

- Local lint and route integrity:
  - `npm run verify:adsense-readiness`
- Public link check only:
  - `npm run check:public-links`

`check:public-links` validates core nav/footer/legal/support routes for HTTP success and non-placeholder content.
