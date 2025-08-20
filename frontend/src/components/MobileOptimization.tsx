import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Smartphone, Tablet, Monitor, Settings, Zap, Eye, Touch, Responsive } from 'lucide-react';
import { useMediaQuery } from '../hooks/use-mobile';

interface MobileSettings {
  compactMode: boolean;
  touchOptimized: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  spacing: 'compact' | 'comfortable' | 'spacious';
  navigationStyle: 'bottom' | 'sidebar' | 'top';
  gestureSupport: boolean;
  autoRotate: boolean;
  highContrast: boolean;
}

const MobileOptimization: React.FC = () => {
  const [settings, setSettings] = useState<MobileSettings>({
    compactMode: false,
    touchOptimized: true,
    reducedMotion: false,
    fontSize: 'medium',
    spacing: 'comfortable',
    navigationStyle: 'bottom',
    gestureSupport: true,
    autoRotate: true,
    highContrast: false
  });

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  useEffect(() => {
    // Load saved mobile settings
    const savedSettings = localStorage.getItem('mobileSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('mobileSettings', JSON.stringify(settings));
    
    // Apply settings to document
    applyMobileSettings();
  }, [settings]);

  const applyMobileSettings = () => {
    const root = document.documentElement;
    
    // Font size
    root.style.setProperty('--font-size-base', 
      settings.fontSize === 'small' ? '14px' : 
      settings.fontSize === 'large' ? '18px' : '16px'
    );
    
    // Spacing
    root.style.setProperty('--spacing-base', 
      settings.spacing === 'compact' ? '0.5rem' : 
      settings.spacing === 'spacious' ? '1.5rem' : '1rem'
    );
    
    // Compact mode
    if (settings.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
    
    // Touch optimized
    if (settings.touchOptimized) {
      root.classList.add('touch-optimized');
    } else {
      root.classList.remove('touch-optimized');
    }
    
    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Navigation style
    root.style.setProperty('--navigation-style', settings.navigationStyle);
  };

  const updateSetting = <K extends keyof MobileSettings>(
    key: K, 
    value: MobileSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    const defaultSettings: MobileSettings = {
      compactMode: false,
      touchOptimized: true,
      reducedMotion: false,
      fontSize: 'medium',
      spacing: 'comfortable',
      navigationStyle: 'bottom',
      gestureSupport: true,
      autoRotate: true,
      highContrast: false
    };
    setSettings(defaultSettings);
  };

  const getDeviceIcon = () => {
    if (isMobile) return <Smartphone className="h-6 w-6" />;
    if (isTablet) return <Tablet className="h-6 w-6" />;
    return <Monitor className="h-6 w-6" />;
  };

  const getDeviceName = () => {
    if (isMobile) return 'Mobile';
    if (isTablet) return 'Tablet';
    return 'Desktop';
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Responsive className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Mobile Optimization</h1>
            <p className="text-muted-foreground">
              Optimize your experience for your device
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getDeviceIcon()}
          <span className="text-sm font-medium">{getDeviceName()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Display Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Reduce spacing and padding for more content
                  </p>
                </div>
                <Switch
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => updateSetting('compactMode', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select
                  value={settings.fontSize}
                  onValueChange={(value) => updateSetting('fontSize', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Spacing</Label>
                <Select
                  value={settings.spacing}
                  onValueChange={(value) => updateSetting('spacing', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>High Contrast</Label>
                  <p className="text-sm text-muted-foreground">
                    Increase contrast for better readability
                  </p>
                </div>
                <Switch
                  checked={settings.highContrast}
                  onCheckedChange={(checked) => updateSetting('highContrast', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Touch & Gesture Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Touch className="h-5 w-5" />
              <span>Touch & Gestures</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Touch Optimized</Label>
                  <p className="text-sm text-muted-foreground">
                    Optimize touch targets and interactions
                  </p>
                </div>
                <Switch
                  checked={settings.touchOptimized}
                  onCheckedChange={(checked) => updateSetting('touchOptimized', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Gesture Support</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable swipe and pinch gestures
                  </p>
                </div>
                <Switch
                  checked={settings.gestureSupport}
                  onCheckedChange={(checked) => updateSetting('gestureSupport', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Navigation Style</Label>
                <Select
                  value={settings.navigationStyle}
                  onValueChange={(value) => updateSetting('navigationStyle', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom">Bottom Navigation</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="top">Top Navigation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Rotate</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow screen rotation
                  </p>
                </div>
                <Switch
                  checked={settings.autoRotate}
                  onCheckedChange={(checked) => updateSetting('autoRotate', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Reduced Motion</Label>
                  <p className="text-sm text-muted-foreground">
                    Reduce animations and transitions
                  </p>
                </div>
                <Switch
                  checked={settings.reducedMotion}
                  onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Image Quality</Label>
                <div className="px-2">
                  <Slider
                    defaultValue={[75]}
                    max={100}
                    min={25}
                    step={25}
                    className="w-full"
                    onValueChange={(value) => {
                      // Apply image quality setting
                      document.documentElement.style.setProperty('--image-quality', `${value[0]}%`);
                    }}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Cache Strategy</Label>
                <Select defaultValue="balanced">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="conservative">Conservative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Device Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Device Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Device Type:</span>
                <span className="text-sm font-medium">{getDeviceName()}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Screen Width:</span>
                <span className="text-sm font-medium">{window.innerWidth}px</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Screen Height:</span>
                <span className="text-sm font-medium">{window.innerHeight}px</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pixel Ratio:</span>
                <span className="text-sm font-medium">{window.devicePixelRatio}x</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">User Agent:</span>
                <span className="text-sm font-medium truncate max-w-32">
                  {navigator.userAgent.split(' ')[0]}
                </span>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={resetToDefaults}
                className="w-full"
              >
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Responsive Preview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Responsive Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center space-x-4">
            <div className="text-center">
              <div className="w-16 h-24 border-2 border-gray-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-gray-500" />
              </div>
              <span className="text-sm text-muted-foreground">Mobile</span>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-16 border-2 border-gray-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <Tablet className="h-6 w-6 text-gray-500" />
              </div>
              <span className="text-sm text-muted-foreground">Tablet</span>
            </div>
            
            <div className="text-center">
              <div className="w-24 h-16 border-2 border-gray-300 rounded-lg mx-auto mb-2 flex items-center justify-center">
                <Monitor className="h-6 w-6 text-gray-500" />
              </div>
              <span className="text-sm text-muted-foreground">Desktop</span>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Current viewport: {window.innerWidth} × {window.innerHeight}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Resize your browser window to see responsive behavior
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileOptimization;
