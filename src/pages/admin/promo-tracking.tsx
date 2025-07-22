// src/pages/admin/promo-tracking.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabaseClient';
import { PageContainer } from '../../components/ui/page-container';
import { Button } from '../../components/ui/button';
import { Loader2, RefreshCw, Download } from 'lucide-react';

interface TrackingData {
  promo_code: string;
  action_type: string;
  user_email: string;
  action_timestamp: string;
  browser_name: string;
  device_type: string;
  country_code: string;
  metadata: any;
}

interface PromoStats {
  promo_code: string;
  unique_viewers: number;
  unique_clickers: number;
  unique_activations: number;
  conversion_rate: number;
}

export function PromoTrackingPage() {
  const { user } = useAuth();
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
  const [promoStats, setPromoStats] = useState<PromoStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recent' | 'stats' | 'failed'>('recent');

  const adminEmails = ['adamkiil@outlook.com', 'adamkiil79@gmail.com', 'adamkiil@yahoo.co.uk'];
  const isAdmin = user?.email && adminEmails.includes(user.email);

  useEffect(() => {
    if (isAdmin) {
      fetchTrackingData();
    }
  }, [isAdmin, activeTab]);

  const fetchTrackingData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'recent') {
        // Fetch recent events
        const { data, error } = await supabase
          .from('promo_code_tracking')
          .select('*')
          .order('action_timestamp', { ascending: false })
          .limit(100);

        if (!error && data) {
          setTrackingData(data);
        }
      } else if (activeTab === 'stats') {
        // Fetch conversion stats
        const { data, error } = await supabase
          .rpc('get_promo_stats'); // You'll need to create this function

        if (!error && data) {
          setPromoStats(data);
        }
      } else if (activeTab === 'failed') {
        // Fetch failed attempts
        const { data, error } = await supabase
          .from('promo_code_tracking')
          .select('*')
          .eq('action_type', 'failed')
          .order('action_timestamp', { ascending: false })
          .limit(50);

        if (!error && data) {
          setTrackingData(data);
        }
      }
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Promo Code', 'Action', 'Email', 'Timestamp', 'Browser', 'Device', 'Country'];
    const csvContent = [
      headers.join(','),
      ...trackingData.map(row => [
        row.promo_code,
        row.action_type,
        row.user_email,
        row.action_timestamp,
        row.browser_name,
        row.device_type,
        row.country_code
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promo-tracking-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (!isAdmin) {
    return (
      <PageContainer title="Access Denied">
        <div className="text-center py-12">
          <p className="text-red-400">You don't have permission to view this page.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Promo Code Tracking" className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === 'recent' ? 'default' : 'outline'}
            onClick={() => setActiveTab('recent')}
          >
            Recent Activity
          </Button>
          <Button
            variant={activeTab === 'stats' ? 'default' : 'outline'}
            onClick={() => setActiveTab('stats')}
          >
            Conversion Stats
          </Button>
          <Button
            variant={activeTab === 'failed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('failed')}
          >
            Failed Attempts
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={fetchTrackingData}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="bg-navy-800/60 border border-navy-700/50 rounded-lg overflow-hidden">
            {activeTab === 'stats' ? (
              <table className="w-full">
                <thead className="bg-navy-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Promo Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Views</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Clicks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Activations</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/50">
                  {promoStats.map((stat) => (
                    <tr key={stat.promo_code}>
                      <td className="px-6 py-4 text-sm text-white">{stat.promo_code}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{stat.unique_viewers}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{stat.unique_clickers}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{stat.unique_activations}</td>
                      <td className="px-6 py-4 text-sm text-emerald-400">{stat.conversion_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead className="bg-navy-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Promo Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Device</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Location</th>
                    {activeTab === 'failed' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Error</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/50">
                  {trackingData.map((row, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {new Date(row.action_timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          row.action_type === 'activated' ? 'bg-emerald-900/50 text-emerald-300' :
                          row.action_type === 'clicked' ? 'bg-purple-900/50 text-purple-300' :
                          row.action_type === 'viewed' ? 'bg-blue-900/50 text-blue-300' :
                          'bg-red-900/50 text-red-300'
                        }`}>
                          {row.action_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">{row.promo_code}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{row.user_email}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {row.device_type} / {row.browser_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {row.country_code} {row.region && `- ${row.region}`}
                      </td>
                      {activeTab === 'failed' && (
                        <td className="px-6 py-4 text-sm text-red-300">
                          {row.metadata?.error_message || 'Unknown error'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}