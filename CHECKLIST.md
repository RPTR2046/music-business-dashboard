# Music Business Ops Dashboard – MVP Progress Checklist

**Started:** January 12, 2025
**Target:** 4-week build

---

## Phase 1: Foundation

- [x] Project setup (Next.js, TypeScript, Tailwind, ESLint)
- [x] Supabase project + client configuration
- [x] S3 bucket creation + backend access config
- [ ] Vercel deployment + GitHub integration
- [x] Authentication (Supabase Auth)
  - [x] Email/password signup + login
  - [x] Protected route middleware
  - [x] Session management
- [x] Database schema + RLS policies
  - [x] `users` table
  - [x] `uploads` table
  - [x] `transactions` table
  - [x] `songs` table
  - [x] `contributors` table
  - [x] `song_contributors` junction table
  - [x] RLS policies on all tables

---

## Phase 2: Core Upload Pipeline

- [x] CSV Parser Service
  - [x] DistroKid format detection + parsing
  - [x] BMI format detection + parsing
  - [ ] ASCAP format detection + parsing (pending sample)
  - [x] Unified schema normalization
- [x] File Upload API
  - [x] 10MB size limit validation
  - [x] MIME type validation
  - [x] Formula injection sanitization
  - [x] S3 upload + path organization by user
- [x] Upload Review Queue UI
  - [x] Summary display (count, revenue, unique tracks)
  - [x] Line-item drill-down view
  - [x] Confirm / Cancel actions
- [x] Duplicate Detection
  - [x] Composite key matching (date + track + platform + amount)
  - [x] Duplicate flagging in review UI
  - [x] User decision flow (skip dupes / import all / cancel)
- [x] Transaction Commit
  - [x] Write to DB with `source_upload_id`
  - [x] Upload status update (pending → completed)
- [x] CSV-to-Song Matching
  - [x] ISRC-based matching (primary)
  - [x] Fuzzy title matching (fallback) - 85% threshold using Levenshtein distance
  - [x] Unmatched transaction handling
  - [ ] "Needs Review" queue for unmatched items (UI pending)

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
- [x] Empty state (no uploads yet)

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

- [x] Upload History Page
  - [x] List all uploads
  - [x] Show timestamp, source, transaction count
  - [ ] Link to original file (signed S3 URL)
- [x] Rollback Functionality
  - [x] Select upload to undo
  - [x] Confirmation modal
  - [x] Delete linked transactions
  - [x] Log rollback action (status = rolled_back)
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
- [x] Empty States & Loading
  - [x] Dashboard empty state
  - [ ] Catalog empty state
  - [x] Upload history empty state
  - [ ] Loading skeletons on data fetch
- [x] Disclaimers
  - [x] Footer disclaimer text
  - [ ] Relevant page disclaimers
- [ ] End-to-End Testing
  - [ ] Upload → Review → Confirm flow
  - [ ] Dashboard displays correct data
  - [ ] Rollback removes correct transactions
  - [ ] Export generates valid files
  - [x] Parser test suite
    - [x] DistroKid sample CSV parsing
    - [x] BMI sample CSV parsing
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
| 2025-01-16 | Set fuzzy matching threshold to 85% | Uses Levenshtein distance with normalized title comparison |
| 2025-01-16 | Completed Phase 2 core implementation | CSV parsers, upload API, review UI, duplicate detection, song matching |

---

## Blockers & Open Questions

- [x] Need sample CSVs from DistroKid, BMI, and ASCAP to validate parser assumptions (DistroKid & BMI samples received)
- [x] Decide on fuzzy matching threshold for title matching (Levenshtein distance? String similarity %?) - Set to 85%
- [x] Define writer split rounding tolerance (99.99% acceptable? Or strict 100%?) - ±0.01% tolerance per existing schema

---

## Completed Milestones

| Milestone | Date Completed |
|-----------|----------------|
| Phase 1: Foundation | January 12, 2025 |
| Phase 2: Core Upload Pipeline | January 16, 2025 |
