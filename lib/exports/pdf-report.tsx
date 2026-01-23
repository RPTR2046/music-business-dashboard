/**
 * PDF Report Generator
 *
 * Generates professional PDF reports for royalty statements.
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  DashboardStatsResponse,
  MonthlyRevenue,
  PlatformRevenue,
  TopTrack,
  TerritoryRevenue,
} from '@/lib/dashboard/types';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  dateRange: {
    fontSize: 10,
    color: '#888',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  summaryCard: {
    width: '33%',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111',
  },
  summaryChange: {
    fontSize: 8,
    marginTop: 2,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableCell: {
    fontSize: 9,
  },
  barContainer: {
    marginTop: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  barLabel: {
    width: 100,
    fontSize: 9,
  },
  barWrapper: {
    flex: 1,
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    marginRight: 8,
  },
  bar: {
    height: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  barValue: {
    width: 60,
    fontSize: 9,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#888',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 8,
    color: '#888',
  },
  incomeBreakdown: {
    flexDirection: 'row',
    marginTop: 10,
  },
  incomeCard: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    marginRight: 10,
  },
  incomeLabel: {
    fontSize: 9,
    color: '#666',
    marginBottom: 2,
  },
  incomeValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  incomePercent: {
    fontSize: 8,
    color: '#888',
  },
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(2)}K`;
  }
  return formatCurrency(amount);
}

interface ReportPDFProps {
  data: DashboardStatsResponse;
  dateRange: { from: string; to: string };
  generatedAt: string;
}

export function ReportPDF({ data, dateRange, generatedAt }: ReportPDFProps) {
  const maxPlatformRevenue = Math.max(...data.revenueByPlatform.map((p) => p.revenue), 1);
  const maxTerritoryRevenue = Math.max(...data.revenueByTerritory.map((t) => t.revenue), 1);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Royalty Statement</Text>
          <Text style={styles.subtitle}>Music Business Dashboard Report</Text>
          <Text style={styles.dateRange}>
            Period: {dateRange.from} to {dateRange.to}
          </Text>
          <Text style={styles.dateRange}>Generated: {generatedAt}</Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Revenue</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(data.summary.totalRevenue)}
              </Text>
              {data.comparison && data.comparison.revenueChangePercent !== null && (
                <Text
                  style={[
                    styles.summaryChange,
                    {
                      color:
                        data.comparison.revenueChangePercent >= 0 ? '#16a34a' : '#dc2626',
                    },
                  ]}
                >
                  {data.comparison.revenueChangePercent >= 0 ? '+' : ''}
                  {data.comparison.revenueChangePercent.toFixed(1)}% vs previous period
                </Text>
              )}
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Transactions</Text>
              <Text style={styles.summaryValue}>
                {data.summary.transactionCount.toLocaleString()}
              </Text>
              {data.comparison && data.comparison.transactionChangePercent !== null && (
                <Text
                  style={[
                    styles.summaryChange,
                    {
                      color:
                        data.comparison.transactionChangePercent >= 0 ? '#16a34a' : '#dc2626',
                    },
                  ]}
                >
                  {data.comparison.transactionChangePercent >= 0 ? '+' : ''}
                  {data.comparison.transactionChangePercent.toFixed(1)}% vs previous period
                </Text>
              )}
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Songs in Catalog</Text>
              <Text style={styles.summaryValue}>{data.summary.songCount}</Text>
            </View>
          </View>

          {/* Income Breakdown */}
          <View style={styles.incomeBreakdown}>
            <View style={styles.incomeCard}>
              <Text style={styles.incomeLabel}>Master/Recording Income</Text>
              <Text style={styles.incomeValue}>
                {formatCurrency(data.incomeBreakdown.masterRevenue)}
              </Text>
              <Text style={styles.incomePercent}>
                {data.incomeBreakdown.masterPercentage.toFixed(1)}% of total
              </Text>
            </View>
            <View style={[styles.incomeCard, { marginRight: 0 }]}>
              <Text style={styles.incomeLabel}>Publishing Income</Text>
              <Text style={styles.incomeValue}>
                {formatCurrency(data.incomeBreakdown.publishingRevenue)}
              </Text>
              <Text style={styles.incomePercent}>
                {data.incomeBreakdown.publishingPercentage.toFixed(1)}% of total
              </Text>
            </View>
          </View>
        </View>

        {/* Top Tracks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Tracks</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Track</Text>
              <Text style={[styles.tableHeaderCell, { width: 80, textAlign: 'right' }]}>
                Revenue
              </Text>
              <Text style={[styles.tableHeaderCell, { width: 60, textAlign: 'right' }]}>
                Txns
              </Text>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Platforms</Text>
            </View>
            {data.topTracks.slice(0, 10).map((track, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{track.trackTitle}</Text>
                <Text style={[styles.tableCell, { width: 80, textAlign: 'right' }]}>
                  {formatCurrency(track.revenue)}
                </Text>
                <Text style={[styles.tableCell, { width: 60, textAlign: 'right' }]}>
                  {track.transactionCount.toLocaleString()}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, fontSize: 8 }]}>
                  {track.platforms.slice(0, 3).join(', ')}
                  {track.platforms.length > 3 ? '...' : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This report is for informational purposes only and does not constitute financial advice.
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>

      {/* Page 2: Platform & Territory Breakdown */}
      <Page size="A4" style={styles.page}>
        {/* Platform Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue by Platform</Text>
          <View style={styles.barContainer}>
            {data.revenueByPlatform.slice(0, 10).map((platform, index) => (
              <View key={index} style={styles.barRow}>
                <Text style={styles.barLabel}>{platform.platform}</Text>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${(platform.revenue / maxPlatformRevenue) * 100}%`,
                        backgroundColor: platform.color || '#3b82f6',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>
                  {formatCompactCurrency(platform.revenue)} ({platform.percentage.toFixed(1)}%)
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Territory Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue by Territory</Text>
          <View style={styles.barContainer}>
            {data.revenueByTerritory.slice(0, 10).map((territory, index) => (
              <View key={index} style={styles.barRow}>
                <Text style={styles.barLabel}>{territory.territoryName}</Text>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: `${(territory.revenue / maxTerritoryRevenue) * 100}%`,
                        backgroundColor: '#8b5cf6',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barValue}>
                  {formatCompactCurrency(territory.revenue)} ({territory.percentage.toFixed(1)}%)
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Monthly Revenue Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Revenue</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Month</Text>
              <Text style={[styles.tableHeaderCell, { width: 100, textAlign: 'right' }]}>
                Revenue
              </Text>
              <Text style={[styles.tableHeaderCell, { width: 80, textAlign: 'right' }]}>
                Transactions
              </Text>
            </View>
            {data.revenueByMonth.map((month, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{month.month}</Text>
                <Text style={[styles.tableCell, { width: 100, textAlign: 'right' }]}>
                  {formatCurrency(month.revenue)}
                </Text>
                <Text style={[styles.tableCell, { width: 80, textAlign: 'right' }]}>
                  {month.transactionCount.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          This report is for informational purposes only and does not constitute financial advice.
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}

export interface PDFReportData {
  dashboardData: DashboardStatsResponse;
  dateRange: { from: string; to: string };
}
