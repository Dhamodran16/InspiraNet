import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Cookie, X, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
  };

  const handleSettings = () => {
    window.open('/cookie-policy', '_blank');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-black/90 backdrop-blur-sm">
      <Card className="max-w-4xl mx-auto border-0 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Cookie className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                We use cookies to enhance your experience
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                We use cookies and similar technologies to help personalize content, provide a better experience, 
                and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. 
                You can learn more in our{' '}
                <button 
                  onClick={handleSettings}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Cookie Policy
                </button>
                .
              </p>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={handleAccept}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Accept All
                </Button>
                <Button 
                  onClick={handleSettings}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Cookie Settings
                </Button>
                <Button 
                  onClick={handleDecline}
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-800"
                >
                  Decline
                </Button>
              </div>
            </div>
            <Button 
              onClick={handleDecline}
              variant="ghost" 
              size="sm"
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CookieConsent;
