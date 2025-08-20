import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { RefreshCw, Users, Calendar, Briefcase } from 'lucide-react';
import api from '@/services/api';

interface PresentationStats {
  alumniCount: number;
  eventsCount: number;
  jobsCount: number;
  lastUpdated: number | null;
  timestamp: string;
}

const RealTimeCounters: React.FC = () => {
  const [stats, setStats] = useState<PresentationStats>({
    alumniCount: 15000,
    eventsCount: 200,
    jobsCount: 500,
    lastUpdated: null,
    timestamp: new Date().toISOString()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k+`;
    }
    return `${num}+`;
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/stats/presentation');
      if (!response.data) {
        throw new Error(`Failed to fetch stats`);
      }
      
      const data = response.data;
      
      // Ensure we have the correct data structure
      if (data.alumniCount !== undefined && data.eventsCount !== undefined && data.jobsCount !== undefined) {
        setStats({
          alumniCount: data.alumniCount,
          eventsCount: data.eventsCount,
          jobsCount: data.jobsCount,
          lastUpdated: data.lastUpdated || Date.now(),
          timestamp: data.timestamp || new Date().toISOString()
        });
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
      console.error('Error fetching stats:', err);
      // Keep using existing stats instead of resetting to defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch stats on component mount
    fetchStats();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatLastUpdated = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return `${Math.floor(diffInSeconds / 3600)}h ago`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          KEC Alumni Network
        </h2>
        <p className="text-gray-600">
          Real-time statistics from our growing community
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <Badge variant="outline" className="text-xs">
            Live Data
          </Badge>
          <span className="text-xs text-gray-500">
            Last updated: {formatLastUpdated(stats.lastUpdated)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Alumni Count */}
        <Card className="relative overflow-hidden border-2 border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-blue-900 mb-2">
              {loading ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : (
                formatNumber(stats.alumniCount)
              )}
            </h3>
            <p className="text-blue-700 font-semibold">Active Alumni</p>
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                Live
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Events Count */}
        <Card className="relative overflow-hidden border-2 border-green-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-green-900 mb-2">
              {loading ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-green-600" />
                </div>
              ) : (
                formatNumber(stats.eventsCount)
              )}
            </h3>
            <p className="text-green-700 font-semibold">Annual Events</p>
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                Live
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Count */}
        <Card className="relative overflow-hidden border-2 border-purple-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-purple-100 rounded-full">
                <Briefcase className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-purple-900 mb-2">
              {loading ? (
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
                </div>
              ) : (
                formatNumber(stats.jobsCount)
              )}
            </h3>
            <p className="text-purple-700 font-semibold">Job Opportunities</p>
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs">
                Live
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-center">
            {error} - Using cached data
          </p>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center mt-8">
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh Stats'}
        </button>
      </div>

      {/* Data Source Info */}
      <div className="text-center mt-6">
        <p className="text-sm text-gray-500">
          Data sourced from MongoDB Atlas • Updates every 30 seconds
        </p>
      </div>
    </div>
  );
};

export default RealTimeCounters;
