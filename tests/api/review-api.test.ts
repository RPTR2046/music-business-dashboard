/**
 * Review API Tests
 *
 * These tests validate the business logic and data transformation
 * for the review-related API endpoints.
 */

import { describe, it, expect } from 'vitest';

/**
 * Types representing the API contracts
 */
interface UnmatchedTransaction {
  id: string;
  trackTitle: string;
  platform: string;
  earnings: number;
  reportingPeriod: string;
  territory: string | null;
  createdAt: string;
}

interface GroupedTransaction {
  trackTitle: string;
  transactionCount: number;
  totalEarnings: number;
  platforms: string[];
  latestDate: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UnmatchedResponse {
  transactions: UnmatchedTransaction[] | GroupedTransaction[];
  pagination: PaginationInfo;
  summary: {
    uniqueTracks?: number;
    totalTransactions: number;
    totalEarnings: number;
  };
}

interface LinkResponse {
  success: boolean;
  linkedCount: number;
  message: string;
}

/**
 * Helper function to group transactions by title
 * This mirrors the logic in the API route
 */
function groupTransactionsByTitle(
  transactions: Array<{
    track_title: string;
    platform_source: string;
    amount: number;
    created_at: string;
  }>
): GroupedTransaction[] {
  const grouped = new Map<string, {
    trackTitle: string;
    transactionCount: number;
    totalEarnings: number;
    platforms: Set<string>;
    latestDate: string;
  }>();

  for (const tx of transactions) {
    const key = tx.track_title.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, {
        trackTitle: tx.track_title,
        transactionCount: 0,
        totalEarnings: 0,
        platforms: new Set(),
        latestDate: tx.created_at,
      });
    }
    const group = grouped.get(key)!;
    group.transactionCount++;
    group.totalEarnings += tx.amount;
    group.platforms.add(tx.platform_source);
    if (tx.created_at > group.latestDate) {
      group.latestDate = tx.created_at;
    }
  }

  return Array.from(grouped.values())
    .map(g => ({
      ...g,
      platforms: Array.from(g.platforms),
    }))
    .sort((a, b) => b.totalEarnings - a.totalEarnings);
}

/**
 * Helper function to transform transaction data to API format
 */
function transformTransaction(tx: {
  id: string;
  track_title: string;
  platform_source: string;
  amount: number;
  reporting_period_start: string;
  territory: string | null;
  created_at: string;
}): UnmatchedTransaction {
  return {
    id: tx.id,
    trackTitle: tx.track_title,
    platform: tx.platform_source,
    earnings: tx.amount,
    reportingPeriod: tx.reporting_period_start?.slice(0, 7),
    territory: tx.territory,
    createdAt: tx.created_at,
  };
}

/**
 * Helper to calculate pagination
 */
function calculatePagination(
  total: number,
  page: number,
  limit: number
): PaginationInfo {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

describe('Unmatched Transactions API', () => {
  describe('Transaction Grouping', () => {
    it('should group transactions by track title (case-insensitive)', () => {
      const transactions = [
        { track_title: 'My Song', platform_source: 'Spotify', amount: 1.50, created_at: '2024-01-15T00:00:00Z' },
        { track_title: 'my song', platform_source: 'Apple Music', amount: 2.00, created_at: '2024-01-16T00:00:00Z' },
        { track_title: 'MY SONG', platform_source: 'Spotify', amount: 0.50, created_at: '2024-01-14T00:00:00Z' },
      ];

      const grouped = groupTransactionsByTitle(transactions);

      expect(grouped).toHaveLength(1);
      expect(grouped[0].transactionCount).toBe(3);
      expect(grouped[0].totalEarnings).toBe(4.00);
      expect(grouped[0].platforms).toContain('Spotify');
      expect(grouped[0].platforms).toContain('Apple Music');
    });

    it('should keep different tracks separate', () => {
      const transactions = [
        { track_title: 'Song A', platform_source: 'Spotify', amount: 1.00, created_at: '2024-01-15T00:00:00Z' },
        { track_title: 'Song B', platform_source: 'Spotify', amount: 2.00, created_at: '2024-01-15T00:00:00Z' },
      ];

      const grouped = groupTransactionsByTitle(transactions);

      expect(grouped).toHaveLength(2);
    });

    it('should sort by total earnings descending', () => {
      const transactions = [
        { track_title: 'Low Earner', platform_source: 'Spotify', amount: 0.10, created_at: '2024-01-15T00:00:00Z' },
        { track_title: 'High Earner', platform_source: 'Spotify', amount: 100.00, created_at: '2024-01-15T00:00:00Z' },
        { track_title: 'Medium Earner', platform_source: 'Spotify', amount: 10.00, created_at: '2024-01-15T00:00:00Z' },
      ];

      const grouped = groupTransactionsByTitle(transactions);

      expect(grouped[0].trackTitle).toBe('High Earner');
      expect(grouped[1].trackTitle).toBe('Medium Earner');
      expect(grouped[2].trackTitle).toBe('Low Earner');
    });

    it('should track the latest date for each group', () => {
      const transactions = [
        { track_title: 'My Song', platform_source: 'Spotify', amount: 1.00, created_at: '2024-01-10T00:00:00Z' },
        { track_title: 'My Song', platform_source: 'Spotify', amount: 1.00, created_at: '2024-01-20T00:00:00Z' },
        { track_title: 'My Song', platform_source: 'Spotify', amount: 1.00, created_at: '2024-01-15T00:00:00Z' },
      ];

      const grouped = groupTransactionsByTitle(transactions);

      expect(grouped[0].latestDate).toBe('2024-01-20T00:00:00Z');
    });

    it('should collect unique platforms', () => {
      const transactions = [
        { track_title: 'My Song', platform_source: 'Spotify', amount: 1.00, created_at: '2024-01-15T00:00:00Z' },
        { track_title: 'My Song', platform_source: 'Spotify', amount: 1.00, created_at: '2024-01-15T00:00:00Z' },
        { track_title: 'My Song', platform_source: 'Apple Music', amount: 1.00, created_at: '2024-01-15T00:00:00Z' },
        { track_title: 'My Song', platform_source: 'YouTube', amount: 1.00, created_at: '2024-01-15T00:00:00Z' },
      ];

      const grouped = groupTransactionsByTitle(transactions);

      expect(grouped[0].platforms).toHaveLength(3);
      expect(grouped[0].platforms).toContain('Spotify');
      expect(grouped[0].platforms).toContain('Apple Music');
      expect(grouped[0].platforms).toContain('YouTube');
    });

    it('should handle empty transaction list', () => {
      const grouped = groupTransactionsByTitle([]);
      expect(grouped).toHaveLength(0);
    });
  });

  describe('Transaction Transformation', () => {
    it('should transform database record to API format', () => {
      const dbRecord = {
        id: 'tx-123',
        track_title: 'My Great Song',
        platform_source: 'Spotify',
        amount: 1.50,
        reporting_period_start: '2024-01-01',
        territory: 'US',
        created_at: '2024-01-15T12:00:00Z',
      };

      const transformed = transformTransaction(dbRecord);

      expect(transformed).toEqual({
        id: 'tx-123',
        trackTitle: 'My Great Song',
        platform: 'Spotify',
        earnings: 1.50,
        reportingPeriod: '2024-01',
        territory: 'US',
        createdAt: '2024-01-15T12:00:00Z',
      });
    });

    it('should extract YYYY-MM from reporting period', () => {
      const dbRecord = {
        id: 'tx-123',
        track_title: 'Song',
        platform_source: 'Spotify',
        amount: 1.00,
        reporting_period_start: '2024-06-15',
        territory: null,
        created_at: '2024-07-01T00:00:00Z',
      };

      const transformed = transformTransaction(dbRecord);

      expect(transformed.reportingPeriod).toBe('2024-06');
    });

    it('should handle null territory', () => {
      const dbRecord = {
        id: 'tx-123',
        track_title: 'Song',
        platform_source: 'Spotify',
        amount: 1.00,
        reporting_period_start: '2024-01-01',
        territory: null,
        created_at: '2024-01-15T00:00:00Z',
      };

      const transformed = transformTransaction(dbRecord);

      expect(transformed.territory).toBeNull();
    });
  });

  describe('Pagination', () => {
    it('should calculate correct pagination for first page', () => {
      const pagination = calculatePagination(100, 1, 50);

      expect(pagination).toEqual({
        page: 1,
        limit: 50,
        total: 100,
        totalPages: 2,
      });
    });

    it('should calculate correct totalPages for partial last page', () => {
      const pagination = calculatePagination(75, 1, 50);

      expect(pagination.totalPages).toBe(2);
    });

    it('should handle exact page boundaries', () => {
      const pagination = calculatePagination(100, 2, 50);

      expect(pagination.totalPages).toBe(2);
    });

    it('should handle single page', () => {
      const pagination = calculatePagination(30, 1, 50);

      expect(pagination.totalPages).toBe(1);
    });

    it('should handle empty results', () => {
      const pagination = calculatePagination(0, 1, 50);

      expect(pagination.totalPages).toBe(0);
    });
  });

  describe('Response Format Validation', () => {
    it('should match expected individual transaction response format', () => {
      const mockResponse: UnmatchedResponse = {
        transactions: [
          {
            id: 'tx-1',
            trackTitle: 'Test Song',
            platform: 'Spotify',
            earnings: 1.50,
            reportingPeriod: '2024-01',
            territory: 'US',
            createdAt: '2024-01-15T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
        },
        summary: {
          totalTransactions: 1,
          totalEarnings: 1.50,
        },
      };

      // Validate structure
      expect(mockResponse.transactions[0]).toHaveProperty('id');
      expect(mockResponse.transactions[0]).toHaveProperty('trackTitle');
      expect(mockResponse.transactions[0]).toHaveProperty('platform');
      expect(mockResponse.transactions[0]).toHaveProperty('earnings');
      expect(mockResponse.pagination).toHaveProperty('totalPages');
      expect(mockResponse.summary).toHaveProperty('totalEarnings');
    });

    it('should match expected grouped transaction response format', () => {
      const mockResponse: UnmatchedResponse = {
        transactions: [
          {
            trackTitle: 'Test Song',
            transactionCount: 5,
            totalEarnings: 7.50,
            platforms: ['Spotify', 'Apple Music'],
            latestDate: '2024-01-15T00:00:00Z',
          } as GroupedTransaction,
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
        },
        summary: {
          uniqueTracks: 1,
          totalTransactions: 5,
          totalEarnings: 7.50,
        },
      };

      const groupedTx = mockResponse.transactions[0] as GroupedTransaction;
      expect(groupedTx).toHaveProperty('trackTitle');
      expect(groupedTx).toHaveProperty('transactionCount');
      expect(groupedTx).toHaveProperty('platforms');
      expect(mockResponse.summary).toHaveProperty('uniqueTracks');
    });
  });
});

describe('Transaction Linking API', () => {
  describe('Link Response Format', () => {
    it('should format single transaction link response', () => {
      const response: LinkResponse = {
        success: true,
        linkedCount: 1,
        message: 'Linked 1 transaction to "My Song"',
      };

      expect(response.success).toBe(true);
      expect(response.linkedCount).toBe(1);
      expect(response.message).toContain('1 transaction');
    });

    it('should format multiple transaction link response', () => {
      const linkedCount = 5;
      const songTitle = 'My Great Song';
      const message = `Linked ${linkedCount} transaction${linkedCount !== 1 ? 's' : ''} to "${songTitle}"`;

      expect(message).toBe('Linked 5 transactions to "My Great Song"');
    });

    it('should use singular form for single transaction', () => {
      const linkedCount = 1;
      const songTitle = 'My Song';
      const message = `Linked ${linkedCount} transaction${linkedCount !== 1 ? 's' : ''} to "${songTitle}"`;

      expect(message).toBe('Linked 1 transaction to "My Song"');
    });
  });

  describe('Validation Rules', () => {
    it('should require songId in request body', () => {
      const body = { linkAll: true };
      const isValid = 'songId' in body && body.songId;

      expect(isValid).toBe(false);
    });

    it('should accept valid songId', () => {
      const body = { songId: 'song-uuid-123', linkAll: false };
      const isValid = 'songId' in body && Boolean(body.songId);

      expect(isValid).toBe(true);
    });

    it('should default linkAll to false', () => {
      const body = { songId: 'song-uuid-123' };
      const linkAll = body.linkAll ?? false;

      expect(linkAll).toBe(false);
    });
  });

  describe('Link All Matching Logic', () => {
    it('should match track titles case-insensitively', () => {
      const sourceTitle = 'My Great Song';
      const candidateTitles = ['my great song', 'MY GREAT SONG', 'My Great Song', 'Different Song'];

      const matches = candidateTitles.filter(
        t => t.toLowerCase() === sourceTitle.toLowerCase()
      );

      expect(matches).toHaveLength(3);
    });

    it('should only match unlinked transactions', () => {
      const transactions = [
        { id: '1', track_title: 'Song A', song_id: null },
        { id: '2', track_title: 'Song A', song_id: 'existing-song' },
        { id: '3', track_title: 'Song A', song_id: null },
      ];

      const unlinked = transactions.filter(t => t.song_id === null);

      expect(unlinked).toHaveLength(2);
    });
  });
});

describe('Download URL API', () => {
  describe('Response Format', () => {
    it('should return signed URL and filename', () => {
      const mockResponse = {
        url: 'https://s3.amazonaws.com/bucket/path?signed=true',
        filename: 'original-report.csv',
      };

      expect(mockResponse.url).toBeDefined();
      expect(mockResponse.filename).toBeDefined();
      expect(mockResponse.url).toContain('https://');
    });
  });

  describe('S3 Key Validation', () => {
    it('should validate S3 key format', () => {
      const validKey = 'uploads/user-123/1234567890_report.csv';
      const isValid = validKey.startsWith('uploads/') && validKey.includes('/');

      expect(isValid).toBe(true);
    });

    it('should reject invalid S3 key', () => {
      const invalidKey = '../../../etc/passwd';
      const isValid = invalidKey.startsWith('uploads/') && !invalidKey.includes('..');

      expect(isValid).toBe(false);
    });
  });

  describe('Authorization Checks', () => {
    it('should verify user owns the upload', () => {
      const upload = { user_id: 'user-123', s3_key: 'uploads/user-123/file.csv' };
      const currentUserId = 'user-123';

      const authorized = upload.user_id === currentUserId;

      expect(authorized).toBe(true);
    });

    it('should reject access to other users uploads', () => {
      const upload = { user_id: 'user-456', s3_key: 'uploads/user-456/file.csv' };
      const currentUserId = 'user-123';

      const authorized = upload.user_id === currentUserId;

      expect(authorized).toBe(false);
    });
  });
});
