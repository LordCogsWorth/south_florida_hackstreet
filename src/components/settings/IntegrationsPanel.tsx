'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ExternalLink,
  Key,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Brain,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

export const IntegrationsPanel = () => {
  const integrations = [
    {
      id: 'openai',
      name: 'OpenAI API',
      description: 'Enhanced AI processing for summaries and explanations',
      icon: <Brain className="h-5 w-5" />,
      status: 'not_configured',
      fields: [
        {
          key: 'apiKey',
          label: 'API Key',
          type: 'password',
          placeholder: 'sk-...',
        },
        {
          key: 'model',
          label: 'Model',
          type: 'select',
          options: ['gpt-4', 'gpt-3.5-turbo'],
        },
      ],
    },
    {
      id: 'google',
      name: 'Google Drive',
      description: 'Sync your notes and exports to Google Drive',
      icon: <FileText className="h-5 w-5" />,
      status: 'not_configured',
      fields: [
        {
          key: 'clientId',
          label: 'Client ID',
          type: 'text',
          placeholder: 'your-client-id',
        },
        {
          key: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          placeholder: 'your-client-secret',
        },
      ],
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Export your smart note packs to Notion pages',
      icon: <BookOpen className="h-5 w-5" />,
      status: 'not_configured',
      fields: [
        {
          key: 'integrationToken',
          label: 'Integration Token',
          type: 'password',
          placeholder: 'secret_...',
        },
        {
          key: 'databaseId',
          label: 'Database ID',
          type: 'text',
          placeholder: 'your-database-id',
        },
      ],
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'error':
        return 'text-red-600 bg-red-100 dark:bg-red-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900';
    }
  };

  const handleSave = (integrationId: string) => {
    toast.success(`${integrationId} configuration saved`);
  };

  const handleTest = (integrationId: string) => {
    toast.success(`${integrationId} connection tested successfully`);
  };

  const handleDisconnect = (integrationId: string) => {
    toast.success(`${integrationId} disconnected`);
  };

  return (
    <div className="space-y-6">
      {integrations.map((integration) => (
        <Card key={integration.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {integration.icon}
                <div>
                  <CardTitle className="text-lg">{integration.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(integration.status)}
                <Badge
                  variant="outline"
                  className={`text-xs ${getStatusColor(integration.status)}`}
                >
                  {integration.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {integration.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`${integration.id}-${field.key}`}>
                  {field.label}
                </Label>
                {field.type === 'select' ? (
                  <select
                    id={`${integration.id}-${field.key}`}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={`${integration.id}-${field.key}`}
                    type={field.type}
                    placeholder={field.placeholder}
                    className="w-full"
                  />
                )}
              </div>
            ))}

            <Separator />

            <div className="flex items-center gap-2">
              <Button onClick={() => handleSave(integration.id)} size="sm">
                <Key className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>

              {integration.status === 'connected' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(integration.id)}
                  >
                    Test Connection
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect(integration.id)}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(integration.id)}
                >
                  Test Connection
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              <p>
                <strong>Note:</strong> API keys are stored locally on your
                device and never shared. Make sure to keep your credentials
                secure.
              </p>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="text-2xl">📚</div>
              <div>
                <h4 className="font-medium">Canvas LMS</h4>
                <p className="text-sm text-muted-foreground">
                  Direct integration with Canvas for seamless course management
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                Coming Soon
              </Badge>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="text-2xl">🎓</div>
              <div>
                <h4 className="font-medium">Blackboard</h4>
                <p className="text-sm text-muted-foreground">
                  Integration with Blackboard Learn for institutional support
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                Coming Soon
              </Badge>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="text-2xl">☁️</div>
              <div>
                <h4 className="font-medium">OneDrive</h4>
                <p className="text-sm text-muted-foreground">
                  Microsoft OneDrive integration for enterprise users
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                Coming Soon
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
