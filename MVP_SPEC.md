# Music Business Ops Dashboard – MVP Specification

**Revision:** 03
**Last Updated:** January 12, 2025
**Author:** Brian Fata

---

## Project Overview

Build a web-based platform for musicians, producers, and songwriters to centralize royalty data, song metadata, and contract information in one place. The product provides music business intelligence and catalog organization—explicitly not tax or legal advice.

**Core capabilities:**
- Upload royalty CSVs (including BMI and ASCAP)
- Track revenue by song, platform, and time period
- Store and manage complete song metadata
- Export clean, professional business reports

**Goal:** Replace fragmented spreadsheets with a single, reliable operations dashboard for music business management.

---

## Target Users

Independent artists, producers, and songwriters who:
- Release music via DistroKid, TuneCore, or CD Baby
- Receive royalties from BMI and/or ASCAP
- Self-manage splits, metadata, and contracts
- Want clearer visibility into income and catalog structure

---

## Supported Data Sources

### MVP Data Sources

| Category | Source |
|----------|--------|
| Distribution / Sales | DistroKid |
| Performance / Publishing | BMI, ASCAP |

### Deferred Data Sources

| Category | Source |
|----------|--------|
| Distribution / Sales | TuneCore, CD Baby, SoundExchange, Spotify for Artists, Bandcamp |

---

## Core MVP Features

### 1. Manual Song Creation & Catalog Management

Users can manually add songs to their catalog before or after uploading CSVs.

**Song creation form includes:**
- Basic info: Title, artist name, release date
- Identifiers: ISRC, ISWC, UPC
- Rights & ownership: Master %, Publishing %
- Writer splits (must total 100%)
- Contributors (writers, producers, featured artists)

**Validation:**
- ISRC: 12 characters (CC-XXX-YY-NNNNN format)
- ISWC: T- followed by 9 digits and check digit
- UPC: 12 digits
- Split percentages: 0-100, must total 100%

**User actions:**
- Create new song manually
- Edit existing song metadata
- View all songs in catalog with search/filter

This enables users to build their catalog proactively, improving CSV transaction matching accuracy.

### 2. Royalty CSV Upload & Normalization

Users upload CSV files from DistroKid, BMI, and ASCAP. The system detects source automatically and normalizes all files into a unified schema.

**Stored fields:**
- Track title
- Platform/source
- Reporting period (month/year)
- Revenue amount
- Territory (if available)
- Usage type (streaming, performance, etc.)

### 3. CSV-to-Song Matching Strategy

When processing uploaded CSVs, the system links transaction rows to existing songs in the catalog.

**Matching logic:**
1. **Primary: ISRC matching** - If CSV row contains ISRC and matches a song in catalog, link immediately
2. **Fallback: Fuzzy title matching** - If no ISRC match, use fuzzy string matching on track title
3. **Unmatched handling** - Transactions that don't match any song go to "Needs Review" queue

**Needs Review Queue:**
- Shows unmatched transactions
- User can manually select which song to link to
- User can create new song on-the-fly from unmatched transaction
- User can skip/ignore unmatched items

This approach balances automation with user control, ensuring data quality without blocking uploads.

### 4. Upload Review Queue

Before data commits to the database, users review a summary of parsed uploads.

**Review summary includes:**
- Total transaction count
- Total revenue amount
- Count of unique tracks
- Count of matched vs. unmatched transactions
- Ability to drill into individual line items before confirming

### 5. Original File Retention

Original CSV files are retained in cloud storage (S3) for traceability. Users can trace any revenue record back to its source document.

> **Consideration:** Store a snapshot of parsed output at upload time alongside the original file. Requires further investigation into implementation approach.

### 6. Unified Revenue Dashboard

Users can view:
- Total revenue over time
- Revenue by platform
- Revenue by song
- Streaming vs performance income

**Filters:** Date range, Platform, Track

### 7. Track-Level Performance Pages

Each song has a dedicated page showing:
- Lifetime earnings
- Monthly revenue trend
- Platform breakdown
- Usage type breakdown
- Territory distribution (if available)

### 8. Song Catalog & Metadata Manager

**Identifiers:**
- ISRC, ISWC
- Release UPC
- Release title, Release date
- Distributor/label

**Rights & Splits:**
- Master ownership %
- Publishing ownership %
- Writer splits
- Publisher information

**Contributor Information:**
- Legal names
- PRO affiliation (BMI/ASCAP/SESAC)
- IPI/CAE numbers
- Roles (writer, producer, featured artist, etc.)

**User actions:**
- Enter metadata manually
- Bulk import via CSV
- Link metadata records to royalty data

**System flags:**
- Missing ISRCs
- Missing or incomplete splits
- Ownership conflicts

### 9. Business Intelligence Exports

Users can export:
- Revenue summaries
- Track-level performance reports
- Catalog metadata

**Formats:** CSV or PDF

> **Note:** No tax forms, filings, or financial advice.

### 10. Transaction-Level Duplicate Detection

System detects duplicate transactions based on composite key: `date + track + platform + amount`

This catches overlaps even when users upload newer exports containing previously imported transactions.

**When duplicates are detected:**
- User is notified of the number of duplicates found
- User can review which transactions are duplicates vs. new
- User chooses to: skip duplicates and import new only, or cancel entire upload
- All skipped duplicates are logged for transparency

### 11. Data Versioning & Rollback

Each upload is treated as a discrete checkpoint, allowing users to undo faulty uploads.

**Version tracking:**
- Uploads are logged with timestamp, file source, and transaction count
- Every transaction record is tagged with its source upload ID
- Users can view upload history and see what each upload added

**Rollback functionality:**
- User selects an upload to undo
- System removes all transactions associated with that upload
- Rollback action is logged; original files remain in S3
- Rollback confirmation required to prevent accidents

---

## Security & Data Protection

### 1. CSV Sanitization (Formula Injection Protection)

CSV files can contain malicious formulas that execute when opened in spreadsheet software. The system sanitizes all uploaded CSV content before processing.

**Protection measures:**
- Detect and neutralize cells starting with `=`, `+`, `-`, or `@` characters
- Escape or prefix dangerous characters before storage
- Log sanitization actions for audit purposes

### 2. File Upload Validation

All file uploads are validated before processing to prevent malformed or malicious files from entering the system.

**Validation rules:**
- Maximum file size: 10MB
- MIME type must match .csv extension
- File structure validated before parsing (proper CSV format)
- Reject files that fail validation with clear error messages

### 3. Row-Level Security (RLS)

Supabase Row-Level Security policies ensure users can only access their own data.

**Implementation:**
- All tables include `user_id` foreign key
- RLS policies enforce `user_id = auth.uid()` on all operations
- Policies applied to: transactions, uploads, songs, metadata, exports
- All API routes verify session before database access

### 4. S3 Bucket Security

Original CSV files stored in S3 are protected from unauthorized access.

**Configuration:**
- Bucket set to private (no public access)
- Bucket policy restricts access to backend service only
- Signed URLs with 15-minute expiration for user downloads
- Files organized by user ID to prevent path traversal

### 5. Rate Limiting

Rate limiting prevents abuse and protects system resources.

**Limits:**
- Upload endpoint: 10 uploads per hour per user
- Export endpoint: 20 exports per hour per user
- API endpoints: 100 requests per minute per user
- Clear error messages when limits are exceeded

### 6. Input Validation

All user-provided data is validated against expected formats before storage.

**Validation rules:**
- ISRC: 12 characters (CC-XXX-YY-NNNNN format)
- ISWC: T- followed by 9 digits and check digit
- IPI/CAE: 9-11 digits
- UPC: 12 digits
- Percentage fields: 0-100, total splits must equal 100%
- All text fields sanitized before rendering to prevent XSS

---

## Front-End Specification

**Scope:** Desktop-first web application. Mobile/responsive design is deferred.

### Dashboard Views & Visualizations

**Revenue Over Time Chart (Primary):**
- Preset time frames: Last 30 days, 90 days, YTD, 1 year, All time
- Custom date picker for flexible range selection
- Toggle to overlay individual songs on the same chart
- Song overlay limit for legibility (5-10 songs max; requires UX testing)

**Key Metrics Panel (Top 5, Quarterly):**
- Monthly earnings
- YTD earnings
- Top 5 tracks
- Top 5 periods
- Top 5 sources (DSPs providing the most revenue)

**Empty State:** Dashboard structure is visible but displays no data until user completes first upload.

### Navigation Structure

| Page | Purpose |
|------|---------|
| Dashboard | Home/default view with revenue chart and key metrics |
| Catalog | Song list with metadata management and manual song creation |
| Uploads | Upload history, review queue, rollback functionality |
| Reports | Export functionality (CSV, PDF) |

### Key Interactions

- **Filters:** Date range, platform, track
- **Drill-down:** Click track in metrics panel to open track detail page
- **Search:** Search catalog by song title or ISRC
- **Manual Entry:** "Add New Song" button in catalog view

---

## Key User Workflows

### First Upload Flow (Option A: Upload First)

```
Upload CSV → Review summary (transaction count, total revenue, unique tracks)
→ Handle duplicates if flagged → Review unmatched transactions
→ Manually link or create songs → Confirm → See populated dashboard
```

### First Upload Flow (Option B: Catalog First)

```
Navigate to Catalog → Add songs manually with ISRCs
→ Upload CSV → System auto-matches via ISRC
→ Review summary → Confirm → See populated dashboard
```

### Adding/Editing Metadata

```
Navigate to Catalog → Select track → Edit fields → Save
```

### Rollback Flow

```
Navigate to Uploads → View upload history → Select upload to undo
→ Confirm rollback → Transactions removed
```

---

## Stretch Goals

*These features require additional definition before implementation.*

### Contract Upload & AI Summaries

Users upload producer agreements, publishing contracts, and distribution agreements. AI extracts:
- Ownership percentages
- Royalty splits
- Term length
- Payment obligations
- Key clauses

**Status:** Highest-risk feature from a user-trust perspective. Needs better definition around:
- Whether to show extracted data points vs narrative summaries
- User correction/verification workflow
- Disclaimer presentation

> All summaries must display: "This summary is for informational purposes only and is not legal advice."

---

## Deferred Features

*These features are explicitly excluded from MVP scope.*

### Additional Distributor Integrations
- TuneCore, CD Baby, SoundExchange, Spotify for Artists, Bandcamp

### Out of Scope (No Current Plans)
- Tax calculations or filings
- Legal advice or CPA guidance
- Banking or payout integrations
- Split payment processing
- Sync licensing tools
- Forecasting or projections
- Multi-artist accounts

---

## Legal & Risk Positioning

**The platform provides:**
- Financial visibility
- Catalog organization
- Informational contract summaries (stretch goal)

**The platform does NOT provide:**
- Tax advice
- Legal advice
- Filing instructions

Disclaimers are displayed throughout the application.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Next.js / React |
| Backend | Node.js or Python |
| Database | Supabase (Postgres) |
| File Storage | S3 |
| Auth | Supabase Auth or Clerk |
| AI (Stretch) | Claude API |
| Payments (Future) | Stripe |
| Hosting | Vercel |

---

## MVP User Flow

1. User signs up
2. (Optional) Adds songs manually to catalog with ISRCs
3. Uploads royalty CSVs (DistroKid, BMI, ASCAP)
4. Reviews upload summary and handles unmatched transactions
5. Confirms upload
6. Views unified revenue dashboard
7. Refines song metadata (ISRCs, splits, contributors)
8. Exports reports

**Goal:** First value delivered in under 10 minutes.

---

## Project Goal

Deliver a focused MVP that:
- Solves real operational pain for musicians
- Is fast to build using AI coding tools
- Avoids regulatory and legal exposure
- Maintains strong security posture to protect user data
- Can later support multiple monetization models
