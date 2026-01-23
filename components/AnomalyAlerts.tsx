'use client';

import { useState, useEffect } from 'react';
import { Anomaly } from '@/lib/analytics/anomaly-detection';

interface AnomalyAlertsProps {
  className?: string;
}

export function AnomalyAlerts({ className = '' }: AnomalyAlertsProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchAnomalies() {
      try {
        const response = await fetch('/api/analytics/anomalies');
        if (response.ok) {
          const data = await response.json();
          setAnomalies(data.anomalies || []);
        }
      } catch (error) {
        console.error('Failed to fetch anomalies:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnomalies();
  }, []);

  const handleDismiss = (index: number) => {
    setDismissed((prev) => new Set([...prev, `${index}`]));
  };

  const visibleAnomalies = anomalies.filter((_, i) => !dismissed.has(`${i}`));
  const highPriority = visibleAnomalies.filter((a) => a.severity === 'high');
  const mediumPriority = visibleAnomalies.filter((a) => a.severity === 'medium');

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-16 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (visibleAnomalies.length === 0) {
    return null; // Don't show if no anomalies
  }

  const displayAnomalies = expanded ? visibleAnomalies : visibleAnomalies.slice(0, 2);

  const getSeverityStyles = (severity: Anomaly['severity']) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          text: 'text-red-700',
        };
      case 'medium':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: 'text-amber-500',
          text: 'text-amber-700',
        };
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          text: 'text-blue-700',
        };
    }
  };

  return (
    <div className={`bg-white shadow rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Needs Attention</h3>
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
            {visibleAnomalies.length}
          </span>
        </div>
        {highPriority.length > 0 && (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            {highPriority.length} high priority
          </span>
        )}
      </div>

      <div className="space-y-2">
        {displayAnomalies.map((anomaly, index) => {
          const styles = getSeverityStyles(anomaly.severity);
          const originalIndex = anomalies.indexOf(anomaly);

          return (
            <div
              key={originalIndex}
              className={`${styles.bg} ${styles.border} border rounded-lg p-3`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {anomaly.severity === 'high' ? (
                      <svg
                        className={`w-4 h-4 ${styles.icon} flex-shrink-0`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className={`w-4 h-4 ${styles.icon} flex-shrink-0`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                    <p className={`text-sm font-medium ${styles.text} truncate`}>
                      {anomaly.title}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {anomaly.description}
                  </p>
                </div>
                <button
                  onClick={() => handleDismiss(originalIndex)}
                  className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                  title="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {visibleAnomalies.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              Show less
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </>
          ) : (
            <>
              Show {visibleAnomalies.length - 2} more
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </>
          )}
        </button>
      )}
    </div>
  );
}
