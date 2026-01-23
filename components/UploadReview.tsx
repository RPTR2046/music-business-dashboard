'use client';

import { useState } from 'react';

interface UploadReviewProps {
  uploadId: string;
  source: string;
  summary: {
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    totalEarnings: number;
    uniqueTracks: number;
    dateRange: {
      earliest: string | null;
      latest: string | null;
    };
  };
  preview: Array<{
    trackTitle: string;
    artistName: string;
    platform: string;
    earnings: number;
    reportingPeriod: string;
    isrc: string | null;
    upc: string | null;
    quantity: number;
    territory: string | null;
    ownershipPercentage: number;
  }>;
  errors: Array<{
    row: number;
    message: string;
  }>;
  hasMoreTransactions: boolean;
  hasMoreErrors: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UploadReview({
  uploadId,
  source,
  summary,
  preview,
  errors,
  hasMoreTransactions,
  hasMoreErrors,
  onConfirm,
  onCancel,
}: UploadReviewProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'preview' | 'errors'>('summary');
  const [confirmResult, setConfirmResult] = useState<{
    success: boolean;
    message: string;
    imported?: number;
    duplicatesSkipped?: number;
  } | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatSource = (src: string) => {
    const sourceNames: Record<string, string> = {
      distrokid: 'DistroKid',
      bmi: 'BMI',
      ascap: 'ASCAP',
    };
    return sourceNames[src] || src;
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      const response = await fetch(`/api/upload/${uploadId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipDuplicates }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm upload');
      }

      setConfirmResult({
        success: true,
        message: data.message,
        imported: data.imported,
        duplicatesSkipped: data.duplicatesSkipped,
      });

      // Call onConfirm after a short delay to show the success message
      setTimeout(() => {
        onConfirm();
      }, 2000);
    } catch (error) {
      setConfirmResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to confirm upload',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await fetch(`/api/upload/${uploadId}`, {
        method: 'DELETE',
      });
      onCancel();
    } catch (error) {
      console.error('Failed to cancel upload:', error);
      onCancel();
    } finally {
      setIsCancelling(false);
    }
  };

  if (confirmResult) {
    return (
      <div className={`rounded-lg p-6 ${confirmResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex items-center">
          {confirmResult.success ? (
            <svg className="h-6 w-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <div>
            <p className={`font-medium ${confirmResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {confirmResult.message}
            </p>
            {confirmResult.success && confirmResult.imported !== undefined && (
              <p className="text-sm text-green-600 mt-1">
                Imported: {confirmResult.imported.toLocaleString()} transactions
                {confirmResult.duplicatesSkipped ? ` | Skipped: ${confirmResult.duplicatesSkipped.toLocaleString()} duplicates` : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Review Upload</h3>
          <p className="text-sm text-gray-500">
            Source: <span className="font-medium">{formatSource(source)}</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCancel}
            disabled={isCancelling || isConfirming}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {isCancelling ? 'Cancelling...' : 'Cancel'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isCancelling || isConfirming}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isConfirming ? 'Confirming...' : 'Confirm Import'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['summary', 'preview', 'errors'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm capitalize
                ${activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab}
              {tab === 'errors' && errors.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                  {errors.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Rows</p>
            <p className="text-2xl font-semibold">{summary.totalRows.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Valid Transactions</p>
            <p className="text-2xl font-semibold text-green-600">
              {summary.successfulRows.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-semibold">{formatCurrency(summary.totalEarnings)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Unique Tracks</p>
            <p className="text-2xl font-semibold">{summary.uniqueTracks}</p>
          </div>
          {summary.dateRange.earliest && summary.dateRange.latest && (
            <div className="col-span-2 bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Date Range</p>
              <p className="text-lg font-medium">
                {summary.dateRange.earliest} to {summary.dateRange.latest}
              </p>
            </div>
          )}
          {summary.failedRows > 0 && (
            <div className="col-span-2 bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-500">Failed Rows</p>
              <p className="text-lg font-medium text-red-600">
                {summary.failedRows.toLocaleString()} rows could not be parsed
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'preview' && (
        <div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Track</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Artist</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ISRC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UPC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Territory</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Own %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Earnings</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={tx.trackTitle}>{tx.trackTitle}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate" title={tx.artistName}>{tx.artistName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">{tx.isrc || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">{tx.upc || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tx.platform}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tx.territory || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{tx.reportingPeriod}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{tx.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-right">{tx.ownershipPercentage}%</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {formatCurrency(tx.earnings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMoreTransactions && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              Showing first 50 transactions. All {summary.successfulRows.toLocaleString()} will be imported.
            </p>
          )}
        </div>
      )}

      {activeTab === 'errors' && (
        <div>
          {errors.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No errors found</p>
          ) : (
            <div className="space-y-2">
              {errors.map((error, idx) => (
                <div key={idx} className="bg-red-50 rounded-lg p-3 text-sm">
                  <span className="font-medium text-red-700">Row {error.row}:</span>{' '}
                  <span className="text-red-600">{error.message}</span>
                </div>
              ))}
              {hasMoreErrors && (
                <p className="text-sm text-gray-500 text-center">
                  Showing first 20 errors. Total: {summary.failedRows}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Options */}
      <div className="bg-gray-50 rounded-lg p-4">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Skip duplicate transactions (recommended)
          </span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-7">
          Duplicates are detected by matching date, track, platform, and amount.
        </p>
      </div>
    </div>
  );
}
