# Music Business Ops Dashboard – MVP Progress Checklist

**Started:** January 12, 2025
**Target:** 4-week build

---

## Phase 1: Foundation

- [ ] Project setup (Next.js, TypeScript, Tailwind, ESLint)
- [ ] Supabase project + client configuration
- [ ] S3 bucket creation + backend access config
- [ ] Vercel deployment + GitHub integration
- [ ] Authentication (Supabase Auth)
  - [ ] Email/password signup + login
  - [ ] Protected route middleware
  - [ ] Session management
- [ ] Database schema + RLS policies
  - [ ] `users` table
  - [ ] `uploads` table
  - [ ] `transactions` table
  - [ ] `songs` table
  - [ ] `contributors` table
  - [ ] `song_contributors` junction table
  - [ ] RLS policies on all tables

---

## Phase 2: Core Upload Pipeline

- [ ] CSV Parser Service
  - [ ] DistroKid format detection + parsing
  - [ ] BMI format detection + parsing
  - [ ] ASCAP format detection + parsing
  - [ ] Unified schema normalization
- [ ] File Upload API
  - [ ] 10MB size limit validation
  - [ ] MIME type validation
  - [ ] Formula injection sanitization
  - [ ] S3 upload + path organization by user
- [ ] Upload Review Queue UI
  - [ ] Summary display (count, revenue, unique tracks)
  - [ ] Line-item drill-down view
  - [ ] Confirm / Cancel actions
- [ ] Duplicate Detection
  - [ ] Composite key matching (date + track + platform + amount)
  - [ ] Duplicate flagging in review UI
  - [ ] User decision flow (skip dupes / import all / cancel)
- [ ] Transaction Commit
  - [ ] Write to DB with `source_upload_id`
  - [ ] Upload status update (pending → completed)
- [ ] CSV-to-Song Matching
  - [ ] ISRC-based matching (primary)
  - [ ] Fuzzy title matching (fallback)
  - [ ] Unmatched transaction handling
  - [ ] "Needs Review" queue for unmatched items

---

## Phase 3: Dashboard & Visualization

- [ ] Revenue Dashboard
  - [ ] Time-series chart component
  - [ ] Date presets (30d, 90d, YTD, 1yr, All)
  - [ ] Custom date range picker
  - [ ] Song overlay toggle (5-10 max)
- [ ] Key Metrics Panel
  - [ ] Monthly earnings
  - [ ] YTD earnings
  - [ ] Top 5 tracks
  - [ ] Top 5 periods
  - [ ] Top 5 sources
- [ ] Dashboard Filters
  - [ ] Date range filter
  - [ ] Platform filter
  - [ ] Track filter
- [ ] Empty state (no uploads yet)

---

## Phase 4: Catalog & Track Details

- [ ] Manual Song Creation Flow
  - [ ] Create new song form
  - [ ] Basic info fields (title, artist, release date)
  - [ ] Identifier fields (ISRC, ISWC, UPC)
  - [ ] Ownership fields (master %, publishing %)
  - [ ] Validation (ISRC format, split totals)
  - [ ] Save to songs table
- [ ] Song Catalog Page
  - [ ] List view with pagination
  - [ ] Search by title
  - [ ] Search by ISRC
  - [ ] Link to track detail
  - [ ] "Add New Song" button
- [ ] Track Detail Pages
  - [ ] Lifetime earnings display
  - [ ] Monthly revenue trend chart
  - [ ] Platform breakdown
  - [ ] Usage type breakdown
  - [ ] Territory distribution (if available)
- [ ] Metadata Manager
  - [ ] ISRC input + validation
  - [ ] ISWC input + validation
  - [ ] UPC input + validation
  - [ ] Release info (title, date, distributor)
  - [ ] Master ownership %
  - [ ] Publishing ownership %
  - [ ] Writer splits (must total 100%)
  - [ ] Contributor management
  - [ ] System flags (missing ISRC, incomplete splits, conflicts)

---

## Phase 5: History & Exports

- [ ] Upload History Page
  - [ ] List all uploads
  - [ ] Show timestamp, source, transaction count
  - [ ] Link to original file (signed S3 URL)
- [ ] Rollback Functionality
  - [ ] Select upload to undo
  - [ ] Confirmation modal
  - [ ] Delete linked transactions
  - [ ] Log rollback action
- [ ] Export Service
  - [ ] Revenue summary CSV
  - [ ] Revenue summary PDF
  - [ ] Track performance report
  - [ ] Catalog metadata export

---

## Phase 6: Polish & Security

- [ ] Rate Limiting
  - [ ] Upload endpoint (10/hr/user)
  - [ ] Export endpoint (20/hr/user)
  - [ ] API endpoints (100/min/user)
  - [ ] Clear error messages on limit
- [ ] Empty States & Loading
  - [ ] Dashboard empty state
  - [ ] Catalog empty state
  - [ ] Upload history empty state
  - [ ] Loading skeletons on data fetch
- [ ] Disclaimers
  - [ ] Footer disclaimer text
  - [ ] Relevant page disclaimers
- [ ] End-to-End Testing
  - [ ] Upload → Review → Confirm flow
  - [ ] Dashboard displays correct data
  - [ ] Rollback removes correct transactions
  - [ ] Export generates valid files
  - [ ] Parser test suite
    - [ ] DistroKid sample CSV parsing
    - [ ] BMI sample CSV parsing
    - [ ] ASCAP sample CSV parsing
    - [ ] Malformed CSV handling
    - [ ] Empty file handling
  - [ ] Duplicate detection edge cases
    - [ ] Exact duplicates
    - [ ] Partial overlaps (some new, some duplicate)
    - [ ] Same amount different dates
    - [ ] Same date different amounts
  - [ ] RLS policy verification
    - [ ] User A cannot access User B's transactions
    - [ ] User A cannot access User B's songs
    - [ ] User A cannot access User B's uploads
    - [ ] User A cannot delete User B's data
  - [ ] Manual song creation flow
    - [ ] Valid song creation
    - [ ] Invalid ISRC format rejection
    - [ ] Split total validation (must = 100%)
    - [ ] Duplicate ISRC handling
  - [ ] CSV-to-Song matching
    - [ ] ISRC match links correctly
    - [ ] Title fuzzy match works
    - [ ] Unmatched items go to review queue
    - [ ] User can manually link unmatched transactions

---

## Notes & Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-01-12 | Added manual song creation to Phase 4 | Users need ability to add songs before CSV upload for better matching |
| 2025-01-12 | Expanded test plan in Phase 6 | Added parser tests, duplicate detection edge cases, RLS verification, and matching tests |
| 2025-01-12 | Added CSV-to-Song matching to Phase 2 | Critical for linking transactions to catalog; uses ISRC primary, title fallback |

---

## Blockers & Open Questions

- [ ] Need sample CSVs from DistroKid, BMI, and ASCAP to validate parser assumptions
- [ ] Decide on fuzzy matching threshold for title matching (Levenshtein distance? String similarity %?)
- [ ] Define writer split rounding tolerance (99.99% acceptable? Or strict 100%?)

---

## Completed Milestones

| Milestone | Date Completed |
|-----------|----------------|
| | |
