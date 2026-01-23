import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  validateFileSize,
  validateMimeType,
  validateFileExtension,
  validateCSVStructure,
  validateUploadFile,
  sanitizeFilename,
  generateS3Key,
  MAX_FILE_SIZE,
} from '../../lib/upload/validation';

const fixturesDir = path.join(__dirname, '../fixtures');

describe('File Validation', () => {
  describe('File Size Validation', () => {
    it('should accept files under 10MB', () => {
      const result = validateFileSize(5 * 1024 * 1024); // 5MB
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should accept files exactly at 10MB', () => {
      const result = validateFileSize(MAX_FILE_SIZE);
      expect(result.valid).toBe(true);
    });

    it('should reject files over 10MB', () => {
      const result = validateFileSize(15 * 1024 * 1024); // 15MB
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('exceeds');
    });

    it('should reject empty files', () => {
      const result = validateFileSize(0);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('empty');
    });

    it('should accept small files', () => {
      const result = validateFileSize(100); // 100 bytes
      expect(result.valid).toBe(true);
    });
  });

  describe('MIME Type Validation', () => {
    it('should accept text/csv', () => {
      const result = validateMimeType('text/csv');
      expect(result.valid).toBe(true);
    });

    it('should accept application/csv', () => {
      const result = validateMimeType('application/csv');
      expect(result.valid).toBe(true);
    });

    it('should accept text/plain (common for CSV)', () => {
      const result = validateMimeType('text/plain');
      expect(result.valid).toBe(true);
    });

    it('should accept application/vnd.ms-excel', () => {
      const result = validateMimeType('application/vnd.ms-excel');
      expect(result.valid).toBe(true);
    });

    it('should handle MIME type with charset', () => {
      const result = validateMimeType('text/csv; charset=utf-8');
      expect(result.valid).toBe(true);
    });

    it('should reject application/json', () => {
      const result = validateMimeType('application/json');
      expect(result.valid).toBe(false);
    });

    it('should reject image types', () => {
      const result = validateMimeType('image/png');
      expect(result.valid).toBe(false);
    });

    it('should be lenient with null MIME type', () => {
      const result = validateMimeType(null);
      expect(result.valid).toBe(true); // Be lenient
    });
  });

  describe('File Extension Validation', () => {
    it('should accept .csv extension', () => {
      const result = validateFileExtension('data.csv');
      expect(result.valid).toBe(true);
    });

    it('should accept .CSV extension (uppercase)', () => {
      const result = validateFileExtension('DATA.CSV');
      expect(result.valid).toBe(true);
    });

    it('should reject .xlsx extension', () => {
      const result = validateFileExtension('data.xlsx');
      expect(result.valid).toBe(false);
    });

    it('should reject .txt extension', () => {
      const result = validateFileExtension('data.txt');
      expect(result.valid).toBe(false);
    });

    it('should reject files without extension', () => {
      const result = validateFileExtension('datafile');
      expect(result.valid).toBe(false);
    });

    it('should handle empty filename', () => {
      const result = validateFileExtension('');
      expect(result.valid).toBe(false);
    });

    it('should handle multiple dots in filename', () => {
      const result = validateFileExtension('my.data.file.csv');
      expect(result.valid).toBe(true);
    });
  });

  describe('CSV Structure Validation', () => {
    it('should accept valid CSV content', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );
      const result = validateCSVStructure(content);
      expect(result.valid).toBe(true);
    });

    it('should reject empty content', () => {
      const result = validateCSVStructure('');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('empty');
    });

    it('should reject whitespace-only content', () => {
      const result = validateCSVStructure('   \n   \n   ');
      expect(result.valid).toBe(false);
    });

    it('should reject single line (header only without data)', () => {
      const result = validateCSVStructure('col1,col2,col3');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('header row and at least one data row');
    });

    it('should accept header with one data row', () => {
      const result = validateCSVStructure('col1,col2,col3\nval1,val2,val3');
      expect(result.valid).toBe(true);
    });

    it('should reject files without commas', () => {
      const result = validateCSVStructure('not a csv file\njust plain text');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('no commas');
    });
  });

  describe('Comprehensive File Validation', () => {
    it('should validate a complete valid file', () => {
      const content = fs.readFileSync(
        path.join(fixturesDir, 'distrokid-valid.csv'),
        'utf-8'
      );

      const result = validateUploadFile(
        {
          size: content.length,
          type: 'text/csv',
          name: 'distrokid-valid.csv',
        },
        content
      );

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail with multiple validation errors', () => {
      const result = validateUploadFile({
        size: 15 * 1024 * 1024, // Too large
        type: 'image/png', // Wrong type
        name: 'data.xlsx', // Wrong extension
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

describe('Filename Sanitization', () => {
  it('should lowercase the filename', () => {
    const result = sanitizeFilename('MyFile.CSV');
    expect(result).toBe('myfile.csv');
  });

  it('should replace special characters with underscores', () => {
    const result = sanitizeFilename('My File (1).csv');
    expect(result).toBe('my_file_1_.csv');
  });

  it('should collapse multiple underscores', () => {
    const result = sanitizeFilename('my___file.csv');
    expect(result).toBe('my_file.csv');
  });

  it('should remove leading dots', () => {
    const result = sanitizeFilename('.hidden.csv');
    expect(result).toBe('hidden.csv');
  });

  it('should add .csv extension if missing', () => {
    const result = sanitizeFilename('datafile');
    expect(result).toBe('datafile.csv');
  });

  it('should handle path separators', () => {
    const result = sanitizeFilename('/path/to/file.csv');
    expect(result).toBe('file.csv');
  });

  it('should handle Windows path separators', () => {
    const result = sanitizeFilename('C:\\Users\\data\\file.csv');
    expect(result).toBe('file.csv');
  });

  it('should return default for empty input', () => {
    const result = sanitizeFilename('');
    expect(result).toBe('upload.csv');
  });

  it('should handle unicode characters', () => {
    const result = sanitizeFilename('日本語ファイル.csv');
    // Non-alphanumeric characters are replaced, resulting in 'csv.csv'
    // The implementation replaces non-alphanumeric with underscores, then cleans up
    expect(result).toMatch(/\.csv$/);
  });
});

describe('S3 Key Generation', () => {
  it('should generate key with correct structure', () => {
    const userId = 'user-123';
    const filename = 'data.csv';
    const key = generateS3Key(userId, filename);

    expect(key).toMatch(/^uploads\/user-123\/\d+_data\.csv$/);
  });

  it('should include timestamp in key', () => {
    const before = Date.now();
    const key = generateS3Key('user-123', 'data.csv');
    const after = Date.now();

    const timestampMatch = key.match(/\/(\d+)_/);
    expect(timestampMatch).not.toBeNull();

    const timestamp = parseInt(timestampMatch![1], 10);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  it('should sanitize filename in key', () => {
    const key = generateS3Key('user-123', 'My Data (1).CSV');
    expect(key).toContain('my_data_1_.csv');
  });

  it('should use user ID for path isolation', () => {
    const key1 = generateS3Key('user-aaa', 'data.csv');
    const key2 = generateS3Key('user-bbb', 'data.csv');

    expect(key1).toContain('/user-aaa/');
    expect(key2).toContain('/user-bbb/');
    expect(key1).not.toBe(key2);
  });
});
