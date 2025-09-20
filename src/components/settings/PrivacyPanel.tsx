'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSettings, useSessionStore } from '@/lib/store/session.store';
import { Shield, Trash2, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export const PrivacyPanel = () => {
  const settings = useSettings();
  const { updateSettings } = useSessionStore();

  const handleDataRetentionChange = (value: string) => {
    const days = parseInt(value) as 7 | 30 | 90;
    updateSettings({ dataRetention: days });
    toast.success(`Data retention set to ${days} days`);
  };

  const handlePrivacyChange = (
    key: keyof typeof settings.privacy,
    value: boolean
  ) => {
    updateSettings({
      privacy: {
        ...settings.privacy,
        [key]: value,
      },
    });
    toast.success('Privacy settings updated');
  };

  const handleClearData = () => {
    if (
      confirm(
        'Are you sure you want to clear all data? This action cannot be undone.'
      )
    ) {
      localStorage.clear();
      toast.success('All data cleared');
    }
  };

  const handleExportData = () => {
    const data = {
      settings: settings,
      analytics: JSON.parse(localStorage.getItem('edith_analytics') || '[]'),
      notes: localStorage.getItem('edith_notes') || '',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edith-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Data exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Retention
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="retention">Data Retention Period</Label>
            <Select
              value={settings.dataRetention.toString()}
              onValueChange={handleDataRetentionChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How long to keep your session data and notes
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="share-data">Share Data for Improvement</Label>
              <p className="text-xs text-muted-foreground">
                Help improve E.D.I.T.H. by sharing anonymous usage data
              </p>
            </div>
            <Switch
              id="share-data"
              checked={settings.privacy.shareData}
              onCheckedChange={(checked) =>
                handlePrivacyChange('shareData', checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="analytics">Analytics</Label>
              <p className="text-xs text-muted-foreground">
                Track usage patterns to improve your experience
              </p>
            </div>
            <Switch
              id="analytics"
              checked={settings.privacy.analytics}
              onCheckedChange={(checked) =>
                handlePrivacyChange('analytics', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* FERPA Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            FERPA Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  FERPA Compliant
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  E.D.I.T.H. is designed to comply with the Family Educational
                  Rights and Privacy Act (FERPA). All data is processed locally
                  and securely stored on your device.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Your Rights</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Access your educational records</li>
              <li>• Request corrections to your data</li>
              <li>• Delete your data at any time</li>
              <li>• Control who has access to your information</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Export Your Data</Label>
              <p className="text-xs text-muted-foreground">
                Download all your data in a portable format
              </p>
            </div>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Clear All Data</Label>
              <p className="text-xs text-muted-foreground">
                Permanently delete all your data from this device
              </p>
            </div>
            <Button variant="destructive" onClick={handleClearData}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              E.D.I.T.H. processes all data locally on your device. No audio or
              transcript data is sent to external servers without your explicit
              consent.
            </p>
            <p>
              For the best experience, ensure your device is secure and
              up-to-date with the latest security patches.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
