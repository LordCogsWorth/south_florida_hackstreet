'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSettings, useSessionStore } from '@/lib/store/session.store';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import { toast } from 'sonner';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const settings = useSettings();
  const { updateSettings } = useSessionStore();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    updateSettings({ theme: newTheme });
    toast.success(`Theme changed to ${newTheme}`);
  };

  const handleAutoSaveChange = (enabled: boolean) => {
    updateSettings({ autoSave: enabled });
    toast.success(`Auto-save ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleKeyboardShortcutsChange = (enabled: boolean) => {
    updateSettings({ keyboardShortcuts: enabled });
    toast.success(`Keyboard shortcuts ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleNotificationsChange = (enabled: boolean) => {
    updateSettings({ notifications: enabled });
    toast.success(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
  };

  const getThemeIcon = (themeName: string) => {
    switch (themeName) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Palette className="h-4 w-4" />;
    }
  };

  const themes = [
    {
      value: 'light',
      label: 'Light',
      description: 'Clean and bright interface',
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Easy on the eyes in low light',
    },
    {
      value: 'system',
      label: 'System',
      description: 'Follows your system preference',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              {themes.map((themeOption) => (
                <Button
                  key={themeOption.value}
                  variant={theme === themeOption.value ? 'default' : 'outline'}
                  onClick={() =>
                    handleThemeChange(
                      themeOption.value as 'light' | 'dark' | 'system'
                    )
                  }
                  className="h-auto p-4 flex flex-col items-center gap-2"
                >
                  {getThemeIcon(themeOption.value)}
                  <div className="text-center">
                    <div className="font-medium">{themeOption.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {themeOption.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="auto-save">Auto-save</Label>
              <p className="text-xs text-muted-foreground">
                Automatically save your notes as you type
              </p>
            </div>
            <Switch
              id="auto-save"
              checked={settings.autoSave}
              onCheckedChange={handleAutoSaveChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="keyboard-shortcuts">Keyboard Shortcuts</Label>
              <p className="text-xs text-muted-foreground">
                Enable keyboard shortcuts for faster navigation
              </p>
            </div>
            <Switch
              id="keyboard-shortcuts"
              checked={settings.keyboardShortcuts}
              onCheckedChange={handleKeyboardShortcutsChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="notifications">Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show notifications for important events
              </p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notifications}
              onCheckedChange={handleNotificationsChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Theme</span>
              <Badge variant="outline" className="flex items-center gap-1">
                {getThemeIcon(theme || 'system')}
                {themes.find((t) => t.value === theme)?.label || 'System'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Auto-save</span>
              <Badge variant="outline">
                {settings.autoSave ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Keyboard Shortcuts
              </span>
              <Badge variant="outline">
                {settings.keyboardShortcuts ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Notifications
              </span>
              <Badge variant="outline">
                {settings.notifications ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
