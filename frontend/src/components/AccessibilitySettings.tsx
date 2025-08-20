import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Accessibility, 
  Eye, 
  Type, 
  Move, 
  Volume2, 
  Focus,
  Contrast,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AccessibilitySettings {
  fontSize: number;
  highContrast: boolean;
  reduceMotion: boolean;
  focusIndicators: boolean;
  soundEffects: boolean;
  autoPlay: boolean;
  lineHeight: number;
  letterSpacing: number;
}

export default function AccessibilitySettings() {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    fontSize: 16,
    highContrast: false,
    reduceMotion: false,
    focusIndicators: true,
    soundEffects: true,
    autoPlay: false,
    lineHeight: 1.5,
    letterSpacing: 0
  });

  useEffect(() => {
    // Load settings from localStorage
    try {
      const savedSettings = localStorage.getItem('accessibilitySettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        const merged: AccessibilitySettings = { ...settings, ...parsed };
        setSettings(merged);
        applySettings(merged);
      }
    } catch (err) {
      // Ignore parse errors and keep defaults
      console.warn('Failed to parse accessibility settings from localStorage');
    }
    // We intentionally do not include `settings` in deps to avoid re-applying on every state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applySettings = (newSettings: AccessibilitySettings) => {
    const root = document.documentElement;
    
    // Apply font size
    root.style.fontSize = `${newSettings.fontSize}px`;
    
    // Apply line height
    root.style.setProperty('--line-height', newSettings.lineHeight.toString());
    
    // Apply letter spacing
    root.style.setProperty('--letter-spacing', `${newSettings.letterSpacing}px`);
    
    // Apply high contrast
    if (newSettings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Apply reduce motion
    if (newSettings.reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
    
    // Apply focus indicators
    if (newSettings.focusIndicators) {
      root.classList.add('focus-visible');
    } else {
      root.classList.remove('focus-visible');
    }
  };

  const handleSettingChange = (key: keyof AccessibilitySettings, value: number | boolean) => {
    const newSettings = { ...settings, [key]: value } as AccessibilitySettings;
    setSettings(newSettings);
    applySettings(newSettings);
    
    // Save to localStorage
    localStorage.setItem('accessibilitySettings', JSON.stringify(newSettings));
    
    toast({
      title: "Setting Updated",
      description: "Accessibility setting has been updated",
    });
  };

  const resetToDefaults = () => {
    const defaultSettings: AccessibilitySettings = {
      fontSize: 16,
      highContrast: false,
      reduceMotion: false,
      focusIndicators: true,
      soundEffects: true,
      autoPlay: false,
      lineHeight: 1.5,
      letterSpacing: 0
    };
    
    setSettings(defaultSettings);
    applySettings(defaultSettings);
    localStorage.removeItem('accessibilitySettings');
    
    toast({
      title: "Settings Reset",
      description: "Accessibility settings have been reset to defaults",
    });
  };

  const increaseFontSize = () => {
    const newSize = Math.min(settings.fontSize + 2, 24);
    handleSettingChange('fontSize', newSize);
  };

  const decreaseFontSize = () => {
    const newSize = Math.max(settings.fontSize - 2, 12);
    handleSettingChange('fontSize', newSize);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Accessibility Settings</h2>
          <p className="text-muted-foreground">
            Customize the application to better suit your needs
          </p>
        </div>
        <Button onClick={resetToDefaults} variant="outline">
          Reset to Defaults
        </Button>
      </div>

      {/* Visual Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Visual Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Font Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Font Size</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={decreaseFontSize}
                  disabled={settings.fontSize <= 12}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="w-12 text-center font-mono">{settings.fontSize}px</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={increaseFontSize}
                  disabled={settings.fontSize >= 24}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([value]) => handleSettingChange('fontSize', value)}
              min={12}
              max={24}
              step={1}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Line Height */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Line Height</Label>
              <span className="text-sm text-muted-foreground">
                {settings.lineHeight.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[settings.lineHeight]}
              onValueChange={([value]) => handleSettingChange('lineHeight', value)}
              min={1.2}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>

          <Separator />

          {/* Letter Spacing */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Letter Spacing</Label>
              <span className="text-sm text-muted-foreground">
                {settings.letterSpacing}px
              </span>
            </div>
            <Slider
              value={[settings.letterSpacing]}
              onValueChange={([value]) => handleSettingChange('letterSpacing', value)}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          <Separator />

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                          <Contrast className="w-5 h-5 text-orange-600" />
              <div>
                <Label htmlFor="high-contrast" className="text-base font-medium">
                  High Contrast
                </Label>
                <p className="text-sm text-muted-foreground">
                  Increase contrast for better visibility
                </p>
              </div>
            </div>
            <Switch
              id="high-contrast"
              checked={settings.highContrast}
              onCheckedChange={(checked) => handleSettingChange('highContrast', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Interaction Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Move className="w-5 h-5 mr-2" />
            Interaction Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Focus className="w-5 h-5 text-blue-600" />
              <div>
                <Label htmlFor="focus-indicators" className="text-base font-medium">
                  Focus Indicators
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show visible focus indicators for keyboard navigation
                </p>
              </div>
            </div>
            <Switch
              id="focus-indicators"
              checked={settings.focusIndicators}
              onCheckedChange={(checked) => handleSettingChange('focusIndicators', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Move className="w-5 h-5 text-purple-600" />
              <div>
                <Label htmlFor="reduce-motion" className="text-base font-medium">
                  Reduce Motion
                </Label>
                <p className="text-sm text-muted-foreground">
                  Minimize animations and transitions
                </p>
              </div>
            </div>
            <Switch
              id="reduce-motion"
              checked={settings.reduceMotion}
              onCheckedChange={(checked) => handleSettingChange('reduceMotion', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audio Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Volume2 className="w-5 h-5 mr-2" />
            Audio Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Volume2 className="w-5 h-5 text-green-600" />
              <div>
                <Label htmlFor="sound-effects" className="text-base font-medium">
                  Sound Effects
                </Label>
                <p className="text-sm text-muted-foreground">
                  Play audio feedback for interactions
                </p>
              </div>
            </div>
            <Switch
              id="sound-effects"
              checked={settings.soundEffects}
              onCheckedChange={(checked) => handleSettingChange('soundEffects', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Volume2 className="w-5 h-5 text-yellow-600" />
              <div>
                <Label htmlFor="auto-play" className="text-base font-medium">
                  Auto-play Media
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically play videos and audio
                </p>
              </div>
            </div>
            <Switch
              id="auto-play"
              checked={settings.autoPlay}
              onCheckedChange={(checked) => handleSettingChange('autoPlay', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Accessibility className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Accessibility Tips:</p>
              <ul className="space-y-1">
                <li>• Use keyboard navigation (Tab, Shift+Tab, Enter, Space)</li>
                <li>• Screen readers are fully supported</li>
                <li>• High contrast mode improves visibility</li>
                <li>• Reduce motion helps with motion sensitivity</li>
                <li>• Focus indicators show keyboard navigation path</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
