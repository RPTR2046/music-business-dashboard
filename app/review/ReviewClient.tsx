'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Song {
  id: string;
  title: string;
  artist_name: string | null;
  isrc: string | null;
}

interface GroupedTransaction {
  trackTitle: string;
  transactionCount: number;
  totalEarnings: number;
  platforms: string[];
  latestDate: string;
}

interface UnmatchedTransaction {
  id: string;
  trackTitle: string;
  platform: string;
  earnings: number;
  reportingPeriod: string;
  territory: string | null;
  createdAt: string;
}

interface ReviewClientProps {
  userEmail: string;
  songs: Song[];
}

export default function ReviewClient({ userEmail, songs }: ReviewClientProps) {
  const [viewMode, setViewMode] = useState<'grouped' | 'individual'>('grouped');
  const [groupedData, setGroupedData] = useState<GroupedTransaction[]>([]);
  const [individualData, setIndividualData] = useState<UnmatchedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ uniqueTracks: 0, totalTransactions: 0, totalEarnings: 0 });
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<string>('');
  const [linking, setLinking] = useState(false);
  const [availableSongs, setAvailableSongs] = useState<Song[]>(songs);
  const [creatingNew, setCreatingNew] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const groupBy = viewMode === 'grouped' ? 'true' : 'false';
      const response = await fetch(`/api/transactions/unmatched?page=${page}&limit=50&groupBy=${groupBy}`);
      const data = await response.json();

      if (viewMode === 'grouped') {
        setGroupedData(data.transactions || []);
      } else {
        setIndividualData(data.transactions || []);
      }
      setTotalPages(data.pagination?.totalPages || 1);
      setSummary({
        uniqueTracks: data.summary?.uniqueTracks || 0,
        totalTransactions: data.summary?.totalTransactions || 0,
        totalEarnings: data.summary?.totalEarnings || 0,
      });
    } catch (error) {
      console.error('Failed to fetch unmatched transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [viewMode, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleLinkTransaction = async (trackTitle: string, linkAll: boolean = true) => {
    if (!selectedSong) {
      alert('Please select a song to link to');
      return;
    }

    setLinking(true);
    try {
      // Get first transaction with this title to use its ID
      const response = await fetch(`/api/transactions/unmatched?page=1&limit=1&groupBy=false`);
      const data = await response.json();
      const transaction = data.transactions?.find(
        (t: UnmatchedTransaction) => t.trackTitle.toLowerCase() === trackTitle.toLowerCase()
      );

      if (!transaction) {
        alert('Transaction not found');
        return;
      }

      const linkResponse = await fetch(`/api/transactions/${transaction.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: selectedSong, linkAll }),
      });

      const result = await linkResponse.json();

      if (linkResponse.ok) {
        alert(result.message);
        setSelectedTrack(null);
        setSelectedSong('');
        fetchData();
      } else {
        alert(result.error || 'Failed to link transaction');
      }
    } catch (error) {
      console.error('Link error:', error);
      alert('Failed to link transaction');
    } finally {
      setLinking(false);
    }
  };

  const handleLinkIndividual = async (transactionId: string) => {
    if (!selectedSong) {
      alert('Please select a song to link to');
      return;
    }

    setLinking(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: selectedSong, linkAll: false }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message);
        setSelectedSong('');
        fetchData();
      } else {
        alert(result.error || 'Failed to link transaction');
      }
    } catch (error) {
      console.error('Link error:', error);
      alert('Failed to link transaction');
    } finally {
      setLinking(false);
    }
  };

  const handleCreateAndLink = async (trackTitle: string, linkAll: boolean = true) => {
    setCreatingNew(true);
    try {
      // First, create the song
      const createResponse = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trackTitle }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        alert(error.error || 'Failed to create song');
        return;
      }

      const newSongResponse = await createResponse.json();
      const newSong = newSongResponse.song;

      // Add the new song to available songs
      setAvailableSongs(prev => [...prev, newSong]);

      // Now link the transactions
      // Get first transaction with this title to use its ID
      const response = await fetch(`/api/transactions/unmatched?page=1&limit=1&groupBy=false`);
      const data = await response.json();
      const transaction = data.transactions?.find(
        (t: UnmatchedTransaction) => t.trackTitle.toLowerCase() === trackTitle.toLowerCase()
      );

      if (!transaction) {
        alert('Song created but could not find transaction to link');
        return;
      }

      const linkResponse = await fetch(`/api/transactions/${transaction.id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId: newSong.id, linkAll }),
      });

      const result = await linkResponse.json();

      if (linkResponse.ok) {
        alert(`Song "${trackTitle}" created and ${result.linkedCount || 1} transaction(s) linked!`);
        setSelectedTrack(null);
        setSelectedSong('');
        fetchData();
      } else {
        alert('Song created but failed to link: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Create and link error:', error);
      alert('Failed to create song');
    } finally {
      setCreatingNew(false);
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
                <Link href="/uploads" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                  Uploads
                </Link>
                <Link href="/review" className="text-blue-600 font-medium px-3 py-2">
                  Needs Review
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
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Unmatched Transactions</h2>
          <p className="text-gray-500 mt-1">
            These transactions don&apos;t have a linked song in your catalog. Link them to track earnings by song.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Unmatched Transactions</p>
            <p className="text-2xl font-semibold">{summary.totalTransactions.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Unique Tracks</p>
            <p className="text-2xl font-semibold">{summary.uniqueTracks.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">Unmatched Revenue</p>
            <p className="text-2xl font-semibold">{formatCurrency(summary.totalEarnings)}</p>
          </div>
        </div>

        {/* View Toggle and Content */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex space-x-4">
                <button
                  onClick={() => { setViewMode('grouped'); setPage(1); }}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    viewMode === 'grouped'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Grouped by Track
                </button>
                <button
                  onClick={() => { setViewMode('individual'); setPage(1); }}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    viewMode === 'individual'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Individual Transactions
                </button>
              </div>
              {availableSongs.length === 0 && (
                <p className="text-sm text-gray-500">
                  No songs in catalog. Use &quot;Create &amp; Link&quot; to add songs directly.
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading...</p>
            </div>
          ) : summary.totalTransactions === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-gray-600 font-medium">All transactions are matched!</p>
              <p className="text-sm text-gray-500">Great job - every transaction is linked to a song.</p>
            </div>
          ) : viewMode === 'grouped' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Track Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platforms</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Earnings</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupedData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {item.trackTitle}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.platforms.slice(0, 3).join(', ')}
                        {item.platforms.length > 3 && ` +${item.platforms.length - 3} more`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {item.transactionCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(item.totalEarnings)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        {selectedTrack === item.trackTitle ? (
                          <div className="flex items-center justify-end space-x-2">
                            <select
                              value={selectedSong}
                              onChange={(e) => setSelectedSong(e.target.value)}
                              className="text-sm border-gray-300 rounded-md"
                            >
                              <option value="">Select song...</option>
                              {availableSongs.map((song) => (
                                <option key={song.id} value={song.id}>
                                  {song.title} {song.isrc ? `(${song.isrc})` : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleLinkTransaction(item.trackTitle, true)}
                              disabled={linking || !selectedSong}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              {linking ? '...' : 'Link All'}
                            </button>
                            <button
                              onClick={() => handleCreateAndLink(item.trackTitle, true)}
                              disabled={creatingNew || linking}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                              title="Create a new song with this title and link all transactions"
                            >
                              {creatingNew ? '...' : 'Create & Link'}
                            </button>
                            <button
                              onClick={() => { setSelectedTrack(null); setSelectedSong(''); }}
                              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedTrack(item.trackTitle)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Link to Song
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Track Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Earnings</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {individualData.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {tx.trackTitle}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {tx.platform}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {tx.reportingPeriod}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(tx.earnings)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <select
                            value={selectedSong}
                            onChange={(e) => setSelectedSong(e.target.value)}
                            className="text-sm border-gray-300 rounded-md"
                          >
                            <option value="">Select song...</option>
                            {availableSongs.map((song) => (
                              <option key={song.id} value={song.id}>
                                {song.title}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleLinkIndividual(tx.id)}
                            disabled={linking || !selectedSong}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            Link
                          </button>
                          <button
                            onClick={() => handleCreateAndLink(tx.trackTitle, false)}
                            disabled={creatingNew || linking}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            title="Create a new song with this title and link this transaction"
                          >
                            {creatingNew ? '...' : 'Create & Link'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
