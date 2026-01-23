'use client';

import { useState } from 'react';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function monthsAgo(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString().slice(0, 10);
}

function startOfYear(): string {
  const date = new Date();
  return `${date.getFullYear()}-01-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const PRESETS = [
  { label: '30 days', getValue: () => ({ from: daysAgo(30), to: today() }) },
  { label: '90 days', getValue: () => ({ from: daysAgo(90), to: today() }) },
  { label: '6 months', getValue: () => ({ from: monthsAgo(6), to: today() }) },
  { label: '12 months', getValue: () => ({ from: monthsAgo(12), to: today() }) },
  { label: 'YTD', getValue: () => ({ from: startOfYear(), to: today() }) },
  { label: 'All time', getValue: () => ({ from: '', to: '' }) },
];

function isActivePreset(
  preset: (typeof PRESETS)[number],
  currentFrom: string,
  currentTo: string
): boolean {
  const { from, to } = preset.getValue();
  return from === currentFrom && to === currentTo;
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetClick = (preset: (typeof PRESETS)[number]) => {
    const { from: newFrom, to: newTo } = preset.getValue();
    onChange(newFrom, newTo);
    setShowCustom(false);
  };

  return (
    <div className="bg-white shadow rounded-lg p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500 mr-2">Period:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePresetClick(preset)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              isActivePreset(preset, from, to)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            showCustom
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => onChange(e.target.value, to)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => onChange(from, e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              onChange(from, to);
              setShowCustom(false);
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
