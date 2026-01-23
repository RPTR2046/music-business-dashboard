# Phase 2 Test & Validation Plan

## Overview

This document outlines the test and validation plan for Phase 2 (Core Upload Pipeline) of the Music Business Ops Dashboard.

---

## 1. CSV Parser Tests

### 1.1 DistroKid Parser

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Valid file parsing | Standard DistroKid CSV | All rows parsed, correct field mapping | Pending |
| Column detection | File with DistroKid headers | Source detected as "distrokid" | Pending |
| ISRC extraction | Rows with ISRC values | ISRC correctly captured (e.g., QZHN72172666) | Pending |
| Earnings parsing | Various decimal formats | Correct float values (e.g., 0.000429137818) | Pending |
| Date normalization | "2025-10" format | Converted to "2025-10" (YYYY-MM) | Pending |
| Platform normalization | "TikTok (Social Media Pack)" | Normalized to "TikTok" | Pending |
| Territory codes | "US", "GB", "PL" | Preserved as 2-letter codes | Pending |
| Team percentage | "50", "100" | Parsed as ownership percentage | Pending |
| Empty rows | Rows with missing required fields | Skipped with error logged | Pending |
| Large file handling | 800K+ rows | Completes without memory issues | Pending |

### 1.2 BMI Parser

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Valid file parsing | Standard BMI CSV | All rows parsed, correct field mapping | Pending |
| Column detection | File with BMI headers | Source detected as "bmi" | Pending |
| Period conversion | "20252" (2025 Q2) | Converted to "2025-04" | Pending |
| Platform normalization | "AMAZON UNLTD" | Normalized to "Amazon Music" | Pending |
| Territory normalization | "UNITED STATES" | Converted to "US" | Pending |
| Royalty amount parsing | "0.04", "0.11" | Correct float values | Pending |
| Participant % parsing | "100.00", "50.00" | Parsed as ownership percentage | Pending |
| Use code mapping | "FF", "SD" | Mapped to readable usage types | Pending |

### 1.3 Format Detection

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| DistroKid detection | DistroKid headers | Returns "distrokid" | Pending |
| BMI detection | BMI headers | Returns "bmi" | Pending |
| Unknown format | Random CSV headers | Returns "unknown" | Pending |
| Mixed case headers | Headers with varying case | Still detects correctly | Pending |

### 1.4 Security - Formula Injection

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Equals prefix | Cell starting with "=" | Prefixed with single quote | Pending |
| Plus prefix | Cell starting with "+" | Prefixed with single quote | Pending |
| Minus prefix | Cell starting with "-" | Prefixed with single quote | Pending |
| At prefix | Cell starting with "@" | Prefixed with single quote | Pending |
| Normal values | Regular text/numbers | Unchanged | Pending |

---

## 2. File Upload API Tests

### 2.1 Validation

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Valid CSV upload | 1MB CSV file | 200 OK, file processed | Pending |
| File too large | 15MB CSV file | 400 error, size limit message | Pending |
| Wrong file type | .xlsx file | 400 error, type validation message | Pending |
| Empty file | 0 byte CSV | 400 error, empty file message | Pending |
| No file provided | Empty form data | 400 error, no file message | Pending |
| Invalid CSV structure | File with no commas | 400 error, invalid CSV message | Pending |

### 2.2 Authentication

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Authenticated user | Valid session | Upload succeeds | Pending |
| No authentication | No session cookie | 401 Unauthorized | Pending |
| Expired session | Expired token | 401 Unauthorized | Pending |

### 2.3 S3 Upload

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Successful upload | Valid file | File stored in S3, s3_key returned | Pending |
| Path structure | User upload | Path: uploads/{userId}/{timestamp}_{filename} | Pending |
| Filename sanitization | "My File (1).csv" | Sanitized to "my_file_1_.csv" | Pending |
| Metadata stored | File upload | user-id, original-filename in S3 metadata | Pending |

---

## 3. Upload Review Queue Tests

### 3.1 Summary Display

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Transaction count | Parsed file | Correct count displayed | Pending |
| Total revenue | Parsed file | Correct sum displayed | Pending |
| Unique tracks | Parsed file | Correct deduplicated count | Pending |
| Date range | Parsed file | Earliest and latest periods shown | Pending |
| Error count | File with parse errors | Error count displayed | Pending |

### 3.2 Preview Data

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| First 50 rows | Large file | Only first 50 shown in preview | Pending |
| All fields visible | Preview row | Track, artist, platform, period, earnings | Pending |
| "Has more" indicator | >50 rows | Message indicates more data | Pending |

### 3.3 User Actions

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Confirm button | Click confirm | Transactions committed | Pending |
| Cancel button | Click cancel | Upload cancelled, record deleted | Pending |
| Skip duplicates toggle | Toggle on/off | Setting respected on confirm | Pending |

---

## 4. Duplicate Detection Tests

### 4.1 Composite Key Matching

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Exact duplicate | Same date+track+platform+amount | Flagged as duplicate | Pending |
| Different date | Same track+platform+amount, diff date | Not a duplicate | Pending |
| Different amount | Same date+track+platform, diff amount | Not a duplicate | Pending |
| Different platform | Same date+track+amount, diff platform | Not a duplicate | Pending |
| Different track | Same date+platform+amount, diff track | Not a duplicate | Pending |

### 4.2 Within-File Duplicates

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Duplicate rows in file | Same row appears twice | Second occurrence skipped | Pending |

### 4.3 Cross-Upload Duplicates

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Re-upload same file | Previously imported file | All flagged as duplicates | Pending |
| Partial overlap | File with some new, some existing | Only new rows imported | Pending |

### 4.4 User Decision Flow

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Skip duplicates enabled | File with duplicates | Duplicates skipped, new imported | Pending |
| Skip duplicates disabled | File with duplicates | All attempted (may fail on constraint) | Pending |
| All duplicates | 100% duplicate file | Success message, 0 imported | Pending |

---

## 5. Transaction Commit Tests

### 5.1 Database Writes

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Single transaction | 1 row file | 1 record in transactions table | Pending |
| Batch insert | 1000+ rows | All records inserted | Pending |
| Large batch | 100K+ rows | Completes without timeout | Pending |
| Required fields | Transaction record | user_id, upload_id, track_title, platform_source, amount populated | Pending |
| Optional fields | Transaction record | territory, usage_type may be null | Pending |

### 5.2 Upload Status

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Pending → Completed | Successful confirm | status = "completed", processed_at set | Pending |
| Transaction count update | After confirm | upload.transaction_count matches actual | Pending |
| Revenue total update | After confirm | upload.total_revenue matches sum | Pending |

### 5.3 Rollback

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Delete completed upload | Rollback action | All transactions deleted | Pending |
| Status update | After rollback | status = "rolled_back" | Pending |
| Cancel pending | Cancel before confirm | Upload record deleted | Pending |

---

## 6. CSV-to-Song Matching Tests

### 6.1 ISRC Matching

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Exact ISRC match | Transaction ISRC = Song ISRC | song_id linked, matched_by = "isrc" | Pending |
| ISRC with hyphens | "US-ABC-12-34567" vs "USABC1234567" | Match found (normalized) | Pending |
| No ISRC in transaction | Transaction without ISRC | Falls back to title matching | Pending |
| No ISRC in catalog | Song without ISRC | Only title matching possible | Pending |

### 6.2 Fuzzy Title Matching

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Exact title match | "Searching" = "Searching" | Match at 100% confidence | Pending |
| Case insensitive | "SEARCHING" vs "Searching" | Match found | Pending |
| With feat. removed | "Song (feat. Artist)" vs "Song" | Match found | Pending |
| With remix removed | "Song - Remix" vs "Song" | Match found | Pending |
| Below threshold | "Completely Different" vs "Song" | No match (<85%) | Pending |
| At threshold | 85% similar titles | Match found | Pending |

### 6.3 Match Results

| Test Case | Input | Expected Result | Status |
|-----------|-------|-----------------|--------|
| ISRC match priority | Both ISRC and title match | ISRC match used (100% confidence) | Pending |
| Match confidence stored | Fuzzy match | match_confidence field populated | Pending |
| Unmatched transactions | No matching song | song_id = null, matched_by = null | Pending |

---

## 7. Integration Tests

### 7.1 End-to-End Upload Flow

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Happy path | Upload → Review → Confirm | Transactions in DB, dashboard updated | Pending |
| Cancel flow | Upload → Review → Cancel | No transactions, upload deleted | Pending |
| With duplicates | Upload file twice | Second upload shows duplicate count | Pending |
| With song matching | Upload after adding songs | Transactions linked to songs | Pending |

### 7.2 Error Handling

| Test Case | Scenario | Expected Result | Status |
|-----------|----------|-----------------|--------|
| S3 failure | S3 unavailable | Error message, no partial state | Pending |
| DB failure | Database unavailable | Error message, file still in S3 | Pending |
| Timeout | Very large file | Graceful timeout message | Pending |

---

## 8. Manual Testing Checklist

### Pre-Testing Setup
- [ ] Ensure Supabase database is accessible
- [ ] Ensure S3 bucket is configured
- [ ] Have test user account ready
- [ ] Have sample CSV files available

### Upload Flow Testing
- [ ] Navigate to /uploads page
- [ ] Verify drag-and-drop zone is visible
- [ ] Upload a DistroKid CSV file
- [ ] Verify summary tab shows correct stats
- [ ] Verify preview tab shows first 50 transactions
- [ ] Verify errors tab shows any parse errors
- [ ] Toggle "Skip duplicates" checkbox
- [ ] Click "Confirm Import"
- [ ] Verify success message with counts
- [ ] Verify upload appears in history table

### Dashboard Verification
- [ ] Navigate to /dashboard
- [ ] Verify total revenue reflects imported data
- [ ] Verify transaction count is correct
- [ ] Verify upload count incremented

### Rollback Testing
- [ ] Find completed upload in history
- [ ] Click "Rollback" button
- [ ] Confirm rollback action
- [ ] Verify status changed to "rolled_back"
- [ ] Verify transactions removed from dashboard counts

### Edge Cases
- [ ] Upload empty CSV file
- [ ] Upload non-CSV file
- [ ] Upload file larger than 10MB
- [ ] Upload same file twice
- [ ] Cancel upload during review

---

## 9. Performance Benchmarks

| Metric | Target | Test Method |
|--------|--------|-------------|
| Parse 100K rows | < 10 seconds | Time parseCSV() call |
| Upload 10MB file | < 30 seconds | Time end-to-end upload |
| Insert 100K transactions | < 60 seconds | Time confirm with large file |
| Duplicate check 100K rows | < 30 seconds | Time checkForDuplicates() |
| Song matching 100K rows | < 30 seconds | Time matchTransactionsToSongs() |

---

## 10. Test Data Requirements

### Sample Files Needed
- [x] DistroKid CSV (standard format)
- [x] BMI CSV (standard format)
- [ ] ASCAP CSV (pending sample)
- [ ] Malformed CSV (missing columns)
- [ ] CSV with formula injection attempts
- [ ] Large CSV (500K+ rows)
- [ ] CSV with special characters in titles

### Test Database State
- [ ] User with no uploads (empty state)
- [ ] User with songs in catalog (for matching tests)
- [ ] User with existing transactions (for duplicate tests)

---

## Execution Notes

1. **Environment**: Tests should run against a development/staging environment, not production
2. **Data Cleanup**: Reset test data between test runs to ensure consistent results
3. **Parallel Testing**: Upload tests should not run in parallel due to potential race conditions
4. **Logging**: Enable verbose logging during test execution for debugging
