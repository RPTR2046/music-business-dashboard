'use client';

import { useState, useEffect, useCallback } from 'react';

interface Contributor {
  id: string;
  legal_name: string;
  pro_affiliation: string | null;
  ipi_cae_number: string | null;
}

interface SongContributor {
  id: string;
  role: string | null;
  split_percent: number;
  contributor: Contributor;
}

interface ContributorManagerProps {
  songId: string;
}

const ROLES = [
  { value: 'writer', label: 'Writer' },
  { value: 'composer', label: 'Composer' },
  { value: 'producer', label: 'Producer' },
  { value: 'featured_artist', label: 'Featured Artist' },
  { value: 'performer', label: 'Performer' },
  { value: 'arranger', label: 'Arranger' },
  { value: 'other', label: 'Other' },
];

const PROS = ['BMI', 'ASCAP', 'SESAC', 'SOCAN', 'PRS', 'GEMA', 'SACEM', 'Other'];

export function ContributorManager({ songId }: ContributorManagerProps) {
  const [songContributors, setSongContributors] = useState<SongContributor[]>([]);
  const [allContributors, setAllContributors] = useState<Contributor[]>([]);
  const [totalSplit, setTotalSplit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewContributorModal, setShowNewContributorModal] = useState(false);
  const [editingContributor, setEditingContributor] = useState<SongContributor | null>(null);

  // Form states
  const [selectedContributorId, setSelectedContributorId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [splitPercent, setSplitPercent] = useState('');

  // New contributor form
  const [newLegalName, setNewLegalName] = useState('');
  const [newProAffiliation, setNewProAffiliation] = useState('');
  const [newIpiNumber, setNewIpiNumber] = useState('');

  const fetchSongContributors = useCallback(async () => {
    try {
      const response = await fetch(`/api/songs/${songId}/contributors`);
      if (response.ok) {
        const data = await response.json();
        setSongContributors(data.contributors || []);
        setTotalSplit(data.totalSplit || 0);
      }
    } catch (err) {
      console.error('Failed to fetch song contributors:', err);
    }
  }, [songId]);

  const fetchAllContributors = useCallback(async () => {
    try {
      const response = await fetch('/api/contributors');
      if (response.ok) {
        const data = await response.json();
        setAllContributors(data.contributors || []);
      }
    } catch (err) {
      console.error('Failed to fetch contributors:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSongContributors(), fetchAllContributors()]).finally(() => {
      setLoading(false);
    });
  }, [fetchSongContributors, fetchAllContributors]);

  const handleAddContributor = async () => {
    if (!selectedContributorId || !splitPercent) {
      setError('Please select a contributor and enter a split percentage');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/songs/${songId}/contributors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributorId: selectedContributorId,
          role: selectedRole || null,
          splitPercent: parseFloat(splitPercent),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add contributor');
      }

      // Reset form and refresh
      setSelectedContributorId('');
      setSelectedRole('');
      setSplitPercent('');
      setShowAddModal(false);
      await fetchSongContributors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateContributor = async () => {
    if (!editingContributor) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/songs/${songId}/contributors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songContributorId: editingContributor.id,
          role: selectedRole || null,
          splitPercent: parseFloat(splitPercent),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update contributor');
      }

      setEditingContributor(null);
      setSelectedRole('');
      setSplitPercent('');
      await fetchSongContributors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveContributor = async (songContributorId: string) => {
    if (!confirm('Are you sure you want to remove this contributor?')) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/songs/${songId}/contributors?songContributorId=${songContributorId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove contributor');
      }

      await fetchSongContributors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewContributor = async () => {
    if (!newLegalName.trim()) {
      setError('Legal name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/contributors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalName: newLegalName.trim(),
          proAffiliation: newProAffiliation || null,
          ipiCaeNumber: newIpiNumber || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create contributor');
      }

      const newContributor = await response.json();

      // Reset form
      setNewLegalName('');
      setNewProAffiliation('');
      setNewIpiNumber('');
      setShowNewContributorModal(false);

      // Refresh contributors list and select the new one
      await fetchAllContributors();
      setSelectedContributorId(newContributor.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (sc: SongContributor) => {
    setEditingContributor(sc);
    setSelectedRole(sc.role || '');
    setSplitPercent(String(sc.split_percent));
  };

  const cancelEdit = () => {
    setEditingContributor(null);
    setSelectedRole('');
    setSplitPercent('');
    setError(null);
  };

  const availableContributors = allContributors.filter(
    (c) => !songContributors.some((sc) => sc.contributor.id === c.id)
  );

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Contributors & Splits</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Add Contributor
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Split Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Total Split</span>
          <span className={`font-medium ${totalSplit === 100 ? 'text-green-600' : 'text-amber-600'}`}>
            {totalSplit}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              totalSplit === 100 ? 'bg-green-500' : totalSplit > 100 ? 'bg-red-500' : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(totalSplit, 100)}%` }}
          />
        </div>
        {totalSplit !== 100 && (
          <p className="text-xs text-amber-600 mt-1">
            {totalSplit < 100 ? `${(100 - totalSplit).toFixed(2)}% unallocated` : 'Exceeds 100%'}
          </p>
        )}
      </div>

      {/* Contributors List */}
      {songContributors.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No contributors added yet.</p>
          <p className="text-sm mt-1">Add contributors to track splits and royalty shares.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {songContributors.map((sc) => (
            <div
              key={sc.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              {editingContributor?.id === sc.id ? (
                // Edit mode
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{sc.contributor.legal_name}</p>
                    <div className="flex gap-2 mt-2">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="px-2 py-1 text-sm border rounded"
                      >
                        <option value="">No role</option>
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={splitPercent}
                        onChange={(e) => setSplitPercent(e.target.value)}
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-20 px-2 py-1 text-sm border rounded"
                        placeholder="%"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateContributor}
                      disabled={saving}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{sc.contributor.legal_name}</p>
                      {sc.contributor.pro_affiliation && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          {sc.contributor.pro_affiliation}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                      {sc.role && <span className="capitalize">{sc.role.replace('_', ' ')}</span>}
                      {sc.contributor.ipi_cae_number && (
                        <span className="font-mono text-xs">IPI: {sc.contributor.ipi_cae_number}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-900">{sc.split_percent}%</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(sc)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRemoveContributor(sc.id)}
                        disabled={saving}
                        className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Contributor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Add Contributor</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Contributor
                </label>
                {availableContributors.length > 0 ? (
                  <select
                    value={selectedContributorId}
                    onChange={(e) => setSelectedContributorId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Choose a contributor...</option>
                    {availableContributors.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legal_name}
                        {c.pro_affiliation ? ` (${c.pro_affiliation})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-500">
                    All contributors have been added or none exist.
                  </p>
                )}
                <button
                  onClick={() => setShowNewContributorModal(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  + Create new contributor
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">No specific role</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Split Percentage
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={splitPercent}
                    onChange={(e) => setSplitPercent(e.target.value)}
                    min="0"
                    max="100"
                    step="0.01"
                    className="flex-1 px-3 py-2 border rounded-md"
                    placeholder="Enter percentage"
                  />
                  <span className="text-gray-500">%</span>
                </div>
                {totalSplit < 100 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Remaining: {(100 - totalSplit).toFixed(2)}%
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedContributorId('');
                  setSelectedRole('');
                  setSplitPercent('');
                  setError(null);
                }}
                className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddContributor}
                disabled={saving || !selectedContributorId || !splitPercent}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Contributor Modal */}
      {showNewContributorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Create New Contributor</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Legal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newLegalName}
                  onChange={(e) => setNewLegalName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Full legal name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PRO Affiliation
                </label>
                <select
                  value={newProAffiliation}
                  onChange={(e) => setNewProAffiliation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">None / Unknown</option>
                  {PROS.map((pro) => (
                    <option key={pro} value={pro}>
                      {pro}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IPI/CAE Number
                </label>
                <input
                  type="text"
                  value={newIpiNumber}
                  onChange={(e) => setNewIpiNumber(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="9-11 digit number"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional. Found on PRO membership documents.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowNewContributorModal(false);
                  setNewLegalName('');
                  setNewProAffiliation('');
                  setNewIpiNumber('');
                  setError(null);
                }}
                className="px-4 py-2 text-gray-700 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewContributor}
                disabled={saving || !newLegalName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
