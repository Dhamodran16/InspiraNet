import React from 'react';

const PresentationDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🎯 KEC Alumni Network
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real-time statistics powered by MongoDB Atlas
          </p>
          <div className="mt-6 p-4 bg-blue-100 rounded-lg inline-block">
            <p className="text-blue-800 font-medium">
              💡 Perfect for presentations and live demos!
            </p>
          </div>
        </div>

        {/* Real-time Counters - Component removed */}
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Real-time Statistics</h2>
          <p className="text-gray-600">Component temporarily unavailable</p>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">Live Updates</h3>
            <p className="text-gray-600">
              Data refreshes automatically every 30 seconds from MongoDB Atlas
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Real-time Stats</h3>
            <p className="text-gray-600">
              Accurate counts of alumni, events, and job opportunities
            </p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-lg shadow-md">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2">Beautiful UI</h3>
            <p className="text-gray-600">
              Modern, responsive design perfect for presentations
            </p>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-16 p-8 bg-gray-900 text-white rounded-lg">
          <h2 className="text-2xl font-bold mb-4 text-center">🔧 Technical Implementation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-blue-300">Backend (Node.js + Express)</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• MongoDB Atlas integration</li>
                <li>• Real-time data aggregation</li>
                <li>• Intelligent caching (5-minute TTL)</li>
                <li>• RESTful API endpoints</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-green-300">Frontend (React + TypeScript)</h3>
              <ul className="text-gray-300 space-y-1">
                <li>• Auto-refresh every 30 seconds</li>
                <li>• Loading states and error handling</li>
                <li>• Responsive design</li>
                <li>• Real-time updates</li>
              </ul>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="mt-16 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4 text-center">🌐 API Endpoints</h2>
          <div className="space-y-3">
            <div className="p-3 bg-gray-100 rounded">
              <code className="text-sm">
                GET /api/stats/presentation - Live presentation stats
              </code>
            </div>
            <div className="p-3 bg-gray-100 rounded">
              <code className="text-sm">
                GET /api/stats/presentation/detailed - Detailed stats with recent data
              </code>
            </div>
            <div className="p-3 bg-gray-100 rounded">
              <code className="text-sm">
                POST /api/stats/refresh - Force refresh cache (admin only)
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresentationDemo;
