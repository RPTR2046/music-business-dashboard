'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Song {
  id: string;
  title: string;
  artist_name: string | null;
  isrc: string | null;
  release_date: string | null;
  release_title: string | null;
  distributor: string | null;
  master_ownership_percent: number | null;
  publishing_ownership_percent: number | null;
  created_at: string;
}

type IssueType = 'missing_isrc' | 'incomplete_splits';

interface SongIssue {
  type: IssueType;
  label: string;
  description: string;
}

function getSongIssues(song: Song): SongIssue[] {
  const issues: SongIssue[] = [];

  if (!song.isrc) {
    issues.push({
      type: 'missing_isrc',
      label: 'No ISRC',
      description: 'Song is missing ISRC code - transactions may not match automatically',
    });
  }

  const hasOwnership = song.master_ownership_percent !== null || song.publishing_ownership_percent !== null;
  const ownershipIncomplete = hasOwnership && (
    song.master_ownership_percent === null || song.publishing_ownership_percent === null
  );

  if (ownershipIncomplete) {
    issues.push({
      type: 'incomplete_splits',
      label: 'Incomplete splits',
      description: 'Both master and publishing ownership percentages should be set',
    });
  }

  return issues;
}

interface UnmatchedTrack {
  title: string;
  artistName: string | null;
  isrc: string | null;
  platforms: string[];
  transactionCount: number;
  alreadyInCatalog: boolean;
  selected?: boolean;
}

interface CatalogClientProps {
  initialSongs: Song[];
  userEmail: string;
  unmatchedCount: number;
}

function AddSongModal({
  isOpen,
  onClose,
  onSongAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSongAdded: (song: Song) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      artist_name: formData.get('artist_name') as string || null,
      isrc: formData.get('isrc') as string || null,
      release_date: formData.get('release_date') as string || null,
      release_title: formData.get('release_title') as string || null,
      distributor: formData.get('distributor') as string || null,
      master_ownership_percent: formData.get('master_ownership_percent')
        ? parseFloat(formData.get('master_ownership_percent') as string)
        : null,
      publishing_ownership_percent: formData.get('publishing_ownership_percent')
        ? parseFloat(formData.get('publishing_ownership_percent') as string)
        : null,
    };

    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to add song');
        return;
      }

      onSongAdded(result.song);
      onClose();
    } catch {
      setError('Failed to add song');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Add New Song</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Song title"
              />
            </div>

            <div>
              <label htmlFor="artist_name" className="block text-sm font-medium text-gray-700 mb-1">
                Artist Name
              </label>
              <input
                type="text"
                id="artist_name"
                name="artist_name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Artist or band name"
              />
            </div>

            <div>
              <label htmlFor="isrc" className="block text-sm font-medium text-gray-700 mb-1">
                ISRC
              </label>
              <input
                type="text"
                id="isrc"
                name="isrc"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., USRC17607839"
              />
              <p className="text-xs text-gray-500 mt-1">International Standard Recording Code</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="release_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Release Date
                </label>
                <input
                  type="date"
                  id="release_date"
                  name="release_date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="distributor" className="block text-sm font-medium text-gray-700 mb-1">
                  Distributor
                </label>
                <input
                  type="text"
                  id="distributor"
                  name="distributor"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., DistroKid"
                />
              </div>
            </div>

            <div>
              <label htmlFor="release_title" className="block text-sm font-medium text-gray-700 mb-1">
                Release/Album Title
              </label>
              <input
                type="text"
                id="release_title"
                name="release_title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Album or EP name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="master_ownership_percent" className="block text-sm font-medium text-gray-700 mb-1">
                  Master Ownership %
                </label>
                <input
                  type="number"
                  id="master_ownership_percent"
                  name="master_ownership_percent"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                />
              </div>

              <div>
                <label htmlFor="publishing_ownership_percent" className="block text-sm font-medium text-gray-700 mb-1">
                  Publishing Ownership %
                </label>
                <input
                  type="number"
                  id="publishing_ownership_percent"
                  name="publishing_ownership_percent"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Song'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ImportFromTransactionsModal({
  isOpen,
  onClose,
  onImportComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (songs: Song[]) => void;
}) {
  const [tracks, setTracks] = useState<UnmatchedTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; linked: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTracks();
    }
  }, [isOpen]);

  async function fetchTracks() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/songs/import-from-transactions');
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to fetch tracks');
        return;
      }
      // Pre-select all new tracks
      setTracks(
        data.tracks.map((t: UnmatchedTrack) => ({
          ...t,
          selected: !t.alreadyInCatalog,
        }))
      );
    } catch {
      setError('Failed to fetch tracks');
    } finally {
      setIsLoading(false);
    }
  }

  function toggleTrack(title: string) {
    setTracks(
      tracks.map((t) =>
        t.title === title ? { ...t, selected: !t.selected } : t
      )
    );
  }

  function selectAll() {
    setTracks(tracks.map((t) => ({ ...t, selected: !t.alreadyInCatalog })));
  }

  function deselectAll() {
    setTracks(tracks.map((t) => ({ ...t, selected: false })));
  }

  async function handleImport() {
    const selectedTracks = tracks.filter((t) => t.selected && !t.alreadyInCatalog);
    if (selectedTracks.length === 0) {
      setError('No tracks selected');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const response = await fetch('/api/songs/import-from-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracks: selectedTracks.map((t) => ({
            title: t.title,
            artistName: t.artistName,
            isrc: t.isrc,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to import tracks');
        return;
      }

      setResult({ created: data.created, linked: data.linked });
      onImportComplete(data.songs || []);
    } catch {
      setError('Failed to import tracks');
    } finally {
      setIsImporting(false);
    }
  }

  if (!isOpen) return null;

  const newTracks = tracks.filter((t) => !t.alreadyInCatalog);
  const selectedCount = tracks.filter((t) => t.selected && !t.alreadyInCatalog).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Import Songs from Transactions</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Select tracks from your uploaded transactions to add to your catalog
          </p>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {result && (
          <div className="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            Successfully added {result.created} songs and linked {result.linked} transactions!
            <button
              onClick={onClose}
              className="ml-4 underline hover:no-underline"
            >
              Close
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No unmatched transactions found. Upload a CSV file first.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">
                  {newTracks.length} new tracks found ({selectedCount} selected)
                </span>
                <div className="space-x-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Select all
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {tracks.map((track) => (
                  <div
                    key={track.title}
                    className={`flex items-center p-3 rounded-lg border ${
                      track.alreadyInCatalog
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : track.selected
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={track.selected || false}
                      disabled={track.alreadyInCatalog}
                      onChange={() => toggleTrack(track.title)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900">
                        {track.title}
                        {track.alreadyInCatalog && (
                          <span className="ml-2 text-xs text-gray-500 font-normal">
                            (already in catalog)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {track.artistName && <span>{track.artistName} • </span>}
                        {track.isrc && <span className="font-mono">{track.isrc} • </span>}
                        {track.transactionCount} transactions via {track.platforms.join(', ')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {!result && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || selectedCount === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isImporting
                  ? 'Importing...'
                  : `Import ${selectedCount} Song${selectedCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BulkEditModal({
  type,
  selectedCount,
  onClose,
  onSave,
  isLoading,
}: {
  type: 'artist' | 'release_date';
  selectedCount: number;
  onClose: () => void;
  onSave: (field: string, value: string | null) => void;
  isLoading: boolean;
}) {
  const [value, setValue] = useState('');

  const title = type === 'artist' ? 'Change Artist' : 'Change Release Date';
  const field = type === 'artist' ? 'artist_name' : 'release_date';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(field, value || null);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            This will update {selectedCount} selected song{selectedCount !== 1 ? 's' : ''}.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="bulk-value" className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'artist' ? 'New Artist Name' : 'New Release Date'}
              </label>
              {type === 'artist' ? (
                <input
                  type="text"
                  id="bulk-value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter artist name (leave empty to clear)"
                />
              ) : (
                <input
                  type="date"
                  id="bulk-value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {type === 'artist' && (
                <p className="text-xs text-gray-500 mt-1">Leave empty to clear the artist name</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : `Update ${selectedCount} Song${selectedCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function IssuesBadge({ issues }: { issues: SongIssue[] }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (issues.length === 0) {
    return <span className="text-green-600 text-sm">OK</span>;
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 cursor-help">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
      </span>
      {showTooltip && (
        <div className="absolute z-50 left-0 mt-1 w-64 bg-gray-900 text-white text-xs rounded-md shadow-lg py-2 px-3">
          <ul className="space-y-1">
            {issues.map((issue) => (
              <li key={issue.type} className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                <span>
                  <span className="font-medium">{issue.label}:</span> {issue.description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SongRow({
  song,
  isSelected,
  onToggleSelect,
  onDelete,
}: {
  song: Song;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const issues = getSongIssues(song);

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this song? This will unlink any associated transactions.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/songs/${song.id}`, { method: 'DELETE' });
      if (response.ok) {
        onDelete(song.id);
      }
    } catch {
      console.error('Failed to delete song');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <tr
      className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
      onClick={() => onToggleSelect(song.id)}
    >
      <td className="px-6 py-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(song.id)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
        />
      </td>
      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
        <Link href={`/catalog/${song.id}`} className="block">
          <div className="font-medium text-blue-600 hover:text-blue-800">{song.title}</div>
          {song.release_title && (
            <div className="text-sm text-gray-500">{song.release_title}</div>
          )}
        </Link>
      </td>
      <td className="px-6 py-4 text-gray-700">{song.artist_name || '-'}</td>
      <td className="px-6 py-4 text-gray-700 font-mono text-sm">{song.isrc || '-'}</td>
      <td className="px-6 py-4 text-gray-700">{song.distributor || '-'}</td>
      <td className="px-6 py-4 text-gray-700">
        {song.release_date ? new Date(song.release_date).toLocaleDateString() : '-'}
      </td>
      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
        <IssuesBadge issues={issues} />
      </td>
      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-800 disabled:opacity-50 cursor-pointer"
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </td>
    </tr>
  );
}

export default function CatalogClient({ initialSongs, userEmail, unmatchedCount }: CatalogClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [bulkEditModal, setBulkEditModal] = useState<'artist' | 'release_date' | null>(null);
  const [showBulkDropdown, setShowBulkDropdown] = useState(false);

  // Auto-open import modal if ?import=true is in URL
  useEffect(() => {
    if (searchParams.get('import') === 'true' && unmatchedCount > 0) {
      setIsImportModalOpen(true);
      // Remove the query param from URL
      router.replace('/catalog', { scroll: false });
    }
    // Handle search query from URL
    const urlSearch = searchParams.get('search');
    if (urlSearch && urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams, unmatchedCount, router, searchQuery]);

  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.isrc?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleSongAdded(song: Song) {
    setSongs([song, ...songs]);
  }

  function handleSongsImported(newSongs: Song[]) {
    setSongs([...newSongs, ...songs]);
  }

  function handleSongDeleted(id: string) {
    setSongs(songs.filter((s) => s.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleSelectSong(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filteredSongs.map((s) => s.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} song${count !== 1 ? 's' : ''}? This will unlink any associated transactions.`)) {
      return;
    }

    setIsBulkOperating(true);
    setShowBulkDropdown(false);
    try {
      const response = await fetch('/api/songs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        const data = await response.json();
        setSongs(songs.filter((s) => !selectedIds.has(s.id)));
        setSelectedIds(new Set());
        alert(`Successfully deleted ${data.deleted} song${data.deleted !== 1 ? 's' : ''}`);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete songs');
      }
    } catch {
      alert('Failed to delete songs');
    } finally {
      setIsBulkOperating(false);
    }
  }

  async function handleBulkUpdate(field: string, value: string | null) {
    if (selectedIds.size === 0) return;

    setIsBulkOperating(true);
    try {
      const response = await fetch('/api/songs/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          updates: { [field]: value },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state
        setSongs(songs.map((s) =>
          selectedIds.has(s.id) ? { ...s, [field]: value } : s
        ));
        setSelectedIds(new Set());
        setBulkEditModal(null);
        alert(`Successfully updated ${data.updated} song${data.updated !== 1 ? 's' : ''}`);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update songs');
      }
    } catch {
      alert('Failed to update songs');
    } finally {
      setIsBulkOperating(false);
    }
  }

  const allVisibleSelected = filteredSongs.length > 0 && filteredSongs.every((s) => selectedIds.has(s.id));

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
                <Link href="/catalog" className="text-blue-600 font-medium px-3 py-2">
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
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Song Catalog</h2>
                <p className="text-sm text-gray-500">
                  {songs.length} {songs.length === 1 ? 'song' : 'songs'} in your catalog
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search songs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {unmatchedCount > 0 && (
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 whitespace-nowrap flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import ({unmatchedCount})
                  </button>
                )}
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
                >
                  Add Song
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions Toolbar */}
          {selectedIds.size > 0 && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedIds.size} song{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={deselectAll}
                  className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Clear selection
                </button>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowBulkDropdown(!showBulkDropdown)}
                  disabled={isBulkOperating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isBulkOperating ? 'Processing...' : 'Bulk Actions'}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showBulkDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setBulkEditModal('artist');
                          setShowBulkDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Change Artist
                      </button>
                      <button
                        onClick={() => {
                          setBulkEditModal('release_date');
                          setShowBulkDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Change Release Date
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleBulkDelete}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Selected
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Table */}
          {filteredSongs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {searchQuery ? 'No songs found' : 'No songs in your catalog'}
              </h3>
              <p className="mt-2 text-gray-500">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add songs to your catalog to start tracking royalties'}
              </p>
              {!searchQuery && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {unmatchedCount > 0 && (
                    <button
                      onClick={() => setIsImportModalOpen(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Import {unmatchedCount} Songs from Transactions
                    </button>
                  )}
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Song Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={() => allVisibleSelected ? deselectAll() : selectAllVisible()}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Artist
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ISRC
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Distributor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Release Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSongs.map((song) => (
                    <SongRow
                      key={song.id}
                      song={song}
                      isSelected={selectedIds.has(song.id)}
                      onToggleSelect={toggleSelectSong}
                      onDelete={handleSongDeleted}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900">How song matching works</h3>
          <p className="mt-1 text-sm text-blue-700">
            When you upload royalty statements, the system will automatically try to match
            transactions to songs in your catalog using the ISRC code. If no ISRC match is found,
            you can manually link transactions from the Review page.
          </p>
        </div>
      </main>

      {/* Add Song Modal */}
      <AddSongModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSongAdded={handleSongAdded}
      />

      {/* Import from Transactions Modal */}
      <ImportFromTransactionsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleSongsImported}
      />

      {/* Bulk Edit Modal */}
      {bulkEditModal && (
        <BulkEditModal
          type={bulkEditModal}
          selectedCount={selectedIds.size}
          onClose={() => setBulkEditModal(null)}
          onSave={handleBulkUpdate}
          isLoading={isBulkOperating}
        />
      )}
    </div>
  );
}
