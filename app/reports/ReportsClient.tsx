'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Song {
  id: string;
  title: string;
  artist_name: string | null;
}

interface ReportsClientProps {
  userEmail: string;
  songs: Song[];
}

type DatePreset = '30d' | '90d' | '6m' | '12m' | 'ytd' | 'all';

export default function ReportsClient({ userEmail, songs }: ReportsClientProps) {
  const [revenuePreset, setRevenuePreset] = useState<DatePreset>('12m');
  const [revenuePlatform, setRevenuePlatform] = useState<string>('all');
  const [selectedSong, setSelectedSong] = useState<string>('');
  const [trackPreset, setTrackPreset] = useState<DatePreset>('all');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const getDateRange = (preset: DatePreset): { from: string; to: string } => {
    const to = new Date();
    const from = new Date();

    switch (preset) {
      case '30d':
        from.setDate(from.getDate() - 30);
        break;
      case '90d':
        from.setDate(from.getDate() - 90);
        break;
      case '6m':
        from.setMonth(from.getMonth() - 6);
        break;
      case '12m':
        from.setMonth(from.getMonth() - 12);
        break;
      case 'ytd':
        from.setMonth(0);
        from.setDate(1);
        break;
      case 'all':
        from.setFullYear(2000);
        break;
    }

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  };

  const handleRevenueExport = async () => {
    setIsExporting('revenue');
    try {
      const { from, to } = getDateRange(revenuePreset);
      const params = new URLSearchParams({ from, to });
      if (revenuePlatform !== 'all') {
        params.append('platform', revenuePlatform);
      }

      const response = await fetch(`/api/exports/revenue?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `revenue_summary_${from}_to_${to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        alert(data.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setIsExporting(null);
    }
  };

  const handleCatalogExport = async () => {
    setIsExporting('catalog');
    try {
      const response = await fetch('/api/exports/catalog');
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalog_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        alert(data.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setIsExporting(null);
    }
  };

  const handleTrackExport = async () => {
    if (!selectedSong) {
      alert('Please select a song');
      return;
    }

    setIsExporting('track');
    try {
      const { from, to } = getDateRange(trackPreset);
      const params = new URLSearchParams({ from, to });

      const response = await fetch(`/api/exports/track/${selectedSong}?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const songName = songs.find(s => s.id === selectedSong)?.title || 'track';
        a.href = url;
        a.download = `${songName.replace(/[^a-z0-9]/gi, '_')}_performance.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        alert(data.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setIsExporting(null);
    }
  };

  const [pdfPreset, setPdfPreset] = useState<DatePreset>('12m');

  const handlePdfExport = async () => {
    setIsExporting('pdf');
    try {
      const { from, to } = getDateRange(pdfPreset);
      const params = new URLSearchParams({ from, to });

      const response = await fetch(`/api/exports/pdf?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `royalty-report-${from}-to-${to}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        alert(data.error || 'Export failed');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed');
    } finally {
      setIsExporting(null);
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
                <Link href="/review" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                  Review
                </Link>
                <Link href="/catalog" className="text-gray-600 hover:text-gray-900 px-3 py-2">
                  Catalog
                </Link>
                <Link href="/reports" className="text-blue-600 font-medium px-3 py-2">
                  Reports
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Reports & Exports</h2>

        <div className="space-y-6">
          {/* PDF Report */}
          <div className="bg-white shadow rounded-lg p-6 border-2 border-blue-100">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Professional Royalty Statement</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Generate a professional PDF report with revenue breakdown, top tracks, platform and territory analysis. Perfect for sharing with managers, accountants, or record labels.
                </p>

                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Report Period
                    </label>
                    <select
                      value={pdfPreset}
                      onChange={(e) => setPdfPreset(e.target.value as DatePreset)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                      <option value="6m">Last 6 months</option>
                      <option value="12m">Last 12 months</option>
                      <option value="ytd">Year to date</option>
                      <option value="all">All time</option>
                    </select>
                  </div>

                  <button
                    onClick={handlePdfExport}
                    disabled={isExporting === 'pdf'}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium"
                  >
                    {isExporting === 'pdf' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Summary Export */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Revenue Summary</h3>
            <p className="text-sm text-gray-500 mb-4">
              Export a summary of your revenue by period, platform, and track.
            </p>

            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  value={revenuePreset}
                  onChange={(e) => setRevenuePreset(e.target.value as DatePreset)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="6m">Last 6 months</option>
                  <option value="12m">Last 12 months</option>
                  <option value="ytd">Year to date</option>
                  <option value="all">All time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform
                </label>
                <select
                  value={revenuePlatform}
                  onChange={(e) => setRevenuePlatform(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Platforms</option>
                  <option value="Spotify">Spotify</option>
                  <option value="Apple Music">Apple Music</option>
                  <option value="YouTube Music">YouTube Music</option>
                  <option value="Amazon Music">Amazon Music</option>
                  <option value="Tidal">Tidal</option>
                  <option value="Deezer">Deezer</option>
                </select>
              </div>

              <button
                onClick={handleRevenueExport}
                disabled={isExporting === 'revenue'}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isExporting === 'revenue' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download CSV
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Catalog Export */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Catalog Export</h3>
            <p className="text-sm text-gray-500 mb-4">
              Export all song metadata including ISRCs, release info, and ownership details.
            </p>

            <button
              onClick={handleCatalogExport}
              disabled={isExporting === 'catalog'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isExporting === 'catalog' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CSV
                </>
              )}
            </button>
          </div>

          {/* Track Performance Export */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Track Performance Report</h3>
            <p className="text-sm text-gray-500 mb-4">
              Export detailed performance data for a specific track.
            </p>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Song
                </label>
                <select
                  value={selectedSong}
                  onChange={(e) => setSelectedSong(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Select a song...</option>
                  {songs.map((song) => (
                    <option key={song.id} value={song.id}>
                      {song.title} {song.artist_name ? `- ${song.artist_name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  value={trackPreset}
                  onChange={(e) => setTrackPreset(e.target.value as DatePreset)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="6m">Last 6 months</option>
                  <option value="12m">Last 12 months</option>
                  <option value="ytd">Year to date</option>
                  <option value="all">All time</option>
                </select>
              </div>

              <button
                onClick={handleTrackExport}
                disabled={isExporting === 'track' || !selectedSong}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isExporting === 'track' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
