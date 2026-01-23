# Test Fixtures

Synthetic test data for Phase 2 validation. **No real user data is included.**

## CSV Files

### DistroKid Format

| File | Purpose | Rows | Notes |
|------|---------|------|-------|
| `distrokid-valid.csv` | Happy path testing | 25 | Multiple tracks, platforms, territories |
| `distrokid-duplicates.csv` | Duplicate detection | 7 | Contains 3 duplicate rows |
| `distrokid-formula-injection.csv` | Security testing | 7 | Malicious formula attempts |
| `distrokid-malformed.csv` | Error handling | 8 | Missing fields, invalid data |
| `distrokid-empty.csv` | Edge case | 0 | Headers only, no data rows |
| `distrokid-special-chars.csv` | Unicode/encoding | 9 | Quotes, unicode, newlines |
| `distrokid-matching-test.csv` | Song matching | 10 | Various title formats for fuzzy matching |
| `distrokid-large.csv` | Performance | 10K+ | Generate with script |

### BMI Format

| File | Purpose | Rows | Notes |
|------|---------|------|-------|
| `bmi-valid.csv` | Happy path testing | 20 | Multiple periods, platforms, use codes |

### Other

| File | Purpose | Notes |
|------|---------|-------|
| `unknown-format.csv` | Format detection | Generic CSV, should be rejected |
| `test-song-catalog.json` | Matching tests | Seed data for songs table |

## Generating Large Test Files

```bash
cd music-business-dashboard
npx tsx tests/fixtures/generate-large-csv.ts
```

Edit `ROW_COUNT` in the script to adjust size. Default is 10,000 rows.

## Test Data Details

### Synthetic Artists
- Test Artist
- Collab Artist
- Demo Band
- Sample Singer
- Synthetic Sounds
- Generated Music

### Synthetic Songs
- Midnight Dreams (USTEST0000001)
- Ocean Waves (USTEST0000002)
- City Lights (USTEST0000003)
- Starlight (USTEST0000004)
- Shared Song (USTEST0000005)

### ISRC Format
All test ISRCs follow format: `USTESTnnnnnnn`

### UPC Format
All test UPCs follow format: `123456789nnn`

## Usage in Tests

### Parser Tests
```typescript
import * as fs from 'fs';
import { parseCSV } from '@/lib/parsers';

const content = fs.readFileSync('tests/fixtures/distrokid-valid.csv', 'utf-8');
const result = parseCSV(content);
```

### Matching Tests
```typescript
import catalog from './test-song-catalog.json';
import { matchTransactionsToSongs } from '@/lib/matching';

const songs = catalog.songs.map(s => ({
  id: `test-${s.isrc}`,
  ...s
}));
```

## Security Note

Formula injection test file contains strings that would be dangerous if executed in a spreadsheet. The parser should sanitize these by prefixing with a single quote.

Dangerous prefixes tested:
- `=` (Excel/Sheets formula)
- `+` (Formula continuation)
- `-` (Formula continuation)
- `@` (Excel function)
- `\t` (Tab character)
