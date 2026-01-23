'use client';

import { useState } from 'react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import UploadReview from '@/components/UploadReview';

interface Upload {
  id: string;
  source: string;
  original_filename: string;
  status: string;
  transaction_count: number;
  total_revenue: number;
  uploaded_at: string;
  processed_at: string | null;
  s3_key: string;
}

interface UploadResult {
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
}

interface UploadsClientProps {
  initialUploads: Upload[];
  userEmail: string;
}

export default function UploadsClient({ initialUploads, userEmail }: UploadsClientProps) {
  const [uploads, setUploads] = useState<Upload[]>(initialUploads);
  const [pendingUpload, setPendingUpload] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${month} ${day}, ${year}, ${hour12}:${minutes} ${ampm}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      rolled_back: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const handleUploadComplete = (result: UploadResult) => {
    setError(null);
    setPendingUpload(result);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
    setPendingUpload(null);
  };

  const handleConfirm = () => {
    setPendingUpload(null);
    // Refresh uploads list
    window.location.reload();
  };

  const handleCancel = () => {
    setPendingUpload(null);
  };

  const handleRollback = async (uploadId: string) => {
    if (!confirm('Are you sure you want to rollback this upload? All associated transactions will be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`/api/upload/${uploadId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUploads(uploads.map(u =>
          u.id === uploadId ? { ...u, status: 'rolled_back' } : u
        ));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to rollback upload');
      }
    } catch {
      alert('Failed to rollback upload');
    }
  };

  const handleDownload = async (uploadId: string) => {
    try {
      const response = await fetch(`/api/upload/${uploadId}/download`);

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to get download link');
        return;
      }

      const { url } = await response.json();
      window.open(url, '_blank');
    } catch {
      alert('Failed to download file');
    }
  };

  const handleCancelUpload = async (uploadId: string) => {
    if (!confirm('Are you sure you want to cancel this upload?')) {
      return;
    }

    try {
      const response = await fetch(`/api/upload/${uploadId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUploads(uploads.filter(u => u.id !== uploadId));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel upload');
      }
    } catch {
      alert('Failed to cancel upload');
    }
  };

  const handleResume = async (upload: Upload) => {
    try {
      // Fetch the upload details to get the preview
      const response = await fetch(`/api/upload/${upload.id}`);

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to load upload details');
        return;
      }

      const data = await response.json();
      setPendingUpload({
        uploadId: upload.id,
        source: upload.source,
        summary: data.summary,
        preview: data.preview || [],
        errors: data.errors || [],
        hasMoreTransactions: data.hasMoreTransactions || false,
        hasMoreErrors: data.hasMoreErrors || false,
      });
    } catch {
      alert('Failed to load upload details');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold">Music Business Dashboard</h1>
              <div className="hidden md:flex space-x-4">
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                  Dashboard
                </Link>
                <Link href="/uploads" className="text-blue-600 font-medium px-3 py-2">
                  Uploads
                </Link>
                <Link href="/review" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                  Review
                </Link>
                <Link href="/catalog" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                  Catalog
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{userEmail}</span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Upload Royalty CSV</h2>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {pendingUpload ? (
            <UploadReview
              uploadId={pendingUpload.uploadId}
              source={pendingUpload.source}
              summary={pendingUpload.summary}
              preview={pendingUpload.preview}
              errors={pendingUpload.errors}
              hasMoreTransactions={pendingUpload.hasMoreTransactions}
              hasMoreErrors={pendingUpload.hasMoreErrors}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          ) : (
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
            />
          )}
        </div>

        {/* Upload History */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Upload History</h2>

          {uploads.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-gray-500">No uploads yet</p>
              <p className="text-sm text-gray-400">Upload your first CSV to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">File</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">Import</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">Download</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">Remove</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploads.map((upload) => (
                    <tr key={upload.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {upload.original_filename}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatSource(upload.source)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(upload.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {upload.transaction_count?.toLocaleString() || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {upload.total_revenue ? formatCurrency(upload.total_revenue) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDate(upload.uploaded_at)}
                      </td>
                      {/* Import column */}
                      <td className="px-4 py-3 text-sm text-center">
                        {upload.status === 'pending' && (
                          <button
                            onClick={() => handleResume(upload)}
                            className="inline-flex items-center justify-center px-3 py-1 border border-green-300 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100"
                          >
                            Resume
                          </button>
                        )}
                      </td>
                      {/* Download column */}
                      <td className="px-4 py-3 text-sm text-center">
                        {upload.s3_key && (
                          <button
                            onClick={() => handleDownload(upload.id)}
                            className="inline-flex items-center justify-center px-3 py-1 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-blue-50 hover:bg-blue-100"
                          >
                            Download
                          </button>
                        )}
                      </td>
                      {/* Remove column */}
                      <td className="px-4 py-3 text-sm text-center">
                        {upload.status === 'pending' && (
                          <button
                            onClick={() => handleCancelUpload(upload.id)}
                            className="inline-flex items-center justify-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        )}
                        {upload.status === 'completed' && (
                          <button
                            onClick={() => handleRollback(upload.id)}
                            className="inline-flex items-center justify-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100"
                          >
                            Rollback
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
