/**
 * CSV-to-Song Matching Service
 *
 * Matches imported transactions to songs in the catalog using:
 * 1. Primary: ISRC-based exact matching
 * 2. Fallback: Fuzzy title matching using Levenshtein distance
 */

import { NormalizedTransaction } from '../parsers/types';

export interface Song {
  id: string;
  title: string;
  artist_name: string | null;
  isrc: string | null;
}

export interface MatchResult {
  transaction: NormalizedTransaction;
  matchedSong: Song | null;
  matchType: 'isrc' | 'title_fuzzy' | null;
  matchConfidence: number; // 0-100
}

export interface MatchingSummary {
  total: number;
  matchedByIsrc: number;
  matchedByTitle: number;
  unmatched: number;
  results: MatchResult[];
}

// Default fuzzy match threshold (percentage)
const DEFAULT_FUZZY_THRESHOLD = 85;

/**
 * Match transactions to songs in the catalog
 */
export function matchTransactionsToSongs(
  transactions: NormalizedTransaction[],
  songs: Song[],
  fuzzyThreshold: number = DEFAULT_FUZZY_THRESHOLD
): MatchingSummary {
  // Build lookup maps for efficient matching
  const isrcMap = new Map<string, Song>();
  const titleMap = new Map<string, Song[]>();

  for (const song of songs) {
    // ISRC map (exact match)
    if (song.isrc) {
      isrcMap.set(normalizeIsrc(song.isrc), song);
    }

    // Title map (for fuzzy matching)
    const normalizedTitle = normalizeTitle(song.title);
    if (!titleMap.has(normalizedTitle)) {
      titleMap.set(normalizedTitle, []);
    }
    titleMap.get(normalizedTitle)!.push(song);
  }

  const results: MatchResult[] = [];
  let matchedByIsrc = 0;
  let matchedByTitle = 0;
  let unmatched = 0;

  for (const transaction of transactions) {
    let matchResult: MatchResult = {
      transaction,
      matchedSong: null,
      matchType: null,
      matchConfidence: 0,
    };

    // Try ISRC match first (highest confidence)
    if (transaction.isrc) {
      const normalizedIsrc = normalizeIsrc(transaction.isrc);
      const matchedSong = isrcMap.get(normalizedIsrc);

      if (matchedSong) {
        matchResult = {
          transaction,
          matchedSong,
          matchType: 'isrc',
          matchConfidence: 100,
        };
        matchedByIsrc++;
        results.push(matchResult);
        continue;
      }
    }

    // Fallback to fuzzy title matching
    const titleMatch = findBestTitleMatch(
      transaction.trackTitle,
      songs,
      fuzzyThreshold
    );

    if (titleMatch) {
      matchResult = {
        transaction,
        matchedSong: titleMatch.song,
        matchType: 'title_fuzzy',
        matchConfidence: titleMatch.confidence,
      };
      matchedByTitle++;
    } else {
      unmatched++;
    }

    results.push(matchResult);
  }

  return {
    total: transactions.length,
    matchedByIsrc,
    matchedByTitle,
    unmatched,
    results,
  };
}

/**
 * Find the best title match for a transaction
 */
function findBestTitleMatch(
  trackTitle: string,
  songs: Song[],
  threshold: number
): { song: Song; confidence: number } | null {
  const normalizedTitle = normalizeTitle(trackTitle);
  let bestMatch: { song: Song; confidence: number } | null = null;

  for (const song of songs) {
    const normalizedSongTitle = normalizeTitle(song.title);

    // Calculate similarity
    const similarity = calculateSimilarity(normalizedTitle, normalizedSongTitle);
    const confidence = Math.round(similarity * 100);

    if (confidence >= threshold) {
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { song, confidence };
      }
    }
  }

  return bestMatch;
}

/**
 * Normalize ISRC for comparison
 * Removes hyphens and converts to uppercase
 */
function normalizeIsrc(isrc: string): string {
  return isrc.replace(/[-\s]/g, '').toUpperCase();
}

/**
 * Normalize title for comparison
 * - Convert to lowercase
 * - Remove special characters
 * - Remove common suffixes like "(feat. ...)", "[Remix]", etc.
 * - Collapse multiple spaces
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\(feat\.?[^)]*\)/gi, '') // Remove (feat. ...)
    .replace(/\s*\[feat\.?[^\]]*\]/gi, '') // Remove [feat. ...]
    .replace(/\s*\(ft\.?[^)]*\)/gi, '')    // Remove (ft. ...)
    .replace(/\s*\[ft\.?[^\]]*\]/gi, '')   // Remove [ft. ...]
    .replace(/\s*\(remix\)/gi, '')         // Remove (remix)
    .replace(/\s*\[remix\]/gi, '')         // Remove [remix]
    .replace(/\s*-\s*remix$/gi, '')        // Remove - remix suffix
    .replace(/[^\w\s]/g, '')               // Remove special characters
    .replace(/\s+/g, ' ')                  // Collapse multiple spaces
    .trim();
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns a value between 0 and 1
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  return 1 - distance / maxLength;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create distance matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill in the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Group unmatched transactions by similar titles
 * Useful for bulk song creation from unmatched items
 */
export function groupUnmatchedByTitle(
  results: MatchResult[]
): Map<string, NormalizedTransaction[]> {
  const unmatched = results.filter((r) => r.matchedSong === null);
  const groups = new Map<string, NormalizedTransaction[]>();

  for (const result of unmatched) {
    const normalizedTitle = normalizeTitle(result.transaction.trackTitle);

    if (!groups.has(normalizedTitle)) {
      groups.set(normalizedTitle, []);
    }
    groups.get(normalizedTitle)!.push(result.transaction);
  }

  return groups;
}

/**
 * Get unique unmatched track suggestions
 * Returns deduplicated list of unmatched tracks with aggregated data
 */
export function getUnmatchedSuggestions(
  results: MatchResult[]
): Array<{
  title: string;
  isrc: string | null;
  artistName: string;
  transactionCount: number;
  totalEarnings: number;
}> {
  const unmatched = results.filter((r) => r.matchedSong === null);
  const titleMap = new Map<
    string,
    {
      title: string;
      isrc: string | null;
      artistName: string;
      count: number;
      earnings: number;
    }
  >();

  for (const result of unmatched) {
    const tx = result.transaction;
    const key = tx.isrc || normalizeTitle(tx.trackTitle);

    if (!titleMap.has(key)) {
      titleMap.set(key, {
        title: tx.trackTitle,
        isrc: tx.isrc,
        artistName: tx.artistName,
        count: 0,
        earnings: 0,
      });
    }

    const entry = titleMap.get(key)!;
    entry.count++;
    entry.earnings += tx.earnings;
  }

  return Array.from(titleMap.values())
    .map((entry) => ({
      title: entry.title,
      isrc: entry.isrc,
      artistName: entry.artistName,
      transactionCount: entry.count,
      totalEarnings: entry.earnings,
    }))
    .sort((a, b) => b.totalEarnings - a.totalEarnings);
}
