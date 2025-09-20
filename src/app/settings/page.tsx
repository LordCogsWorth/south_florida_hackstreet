'use client';

import { AppLayout } from '@/components/layout/AppLayout';
import { PrivacyPanel } from '@/components/settings/PrivacyPanel';
import { IntegrationsPanel } from '@/components/settings/IntegrationsPanel';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { ShortcutsDialog } from '@/components/settings/ShortcutsDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-background p-4">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Customize your E.D.I.T.H. experience
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 min-h-0">
          <Tabs defaultValue="general" className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="about">About</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="h-full mt-4">
              <div className="space-y-6">
                <ThemeToggle />
                <ShortcutsDialog />
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="h-full mt-4">
              <PrivacyPanel />
            </TabsContent>

            <TabsContent value="integrations" className="h-full mt-4">
              <IntegrationsPanel />
            </TabsContent>

            <TabsContent value="about" className="h-full mt-4">
              <div className="space-y-6">
                <div className="text-center py-8">
                  <h2 className="text-2xl font-bold mb-2">E.D.I.T.H.</h2>
                  <p className="text-muted-foreground mb-4">
                    Enhanced Digital Intelligence for Teaching & Learning
                  </p>
                  <p className="text-sm text-muted-foreground">Version 1.0.0</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
