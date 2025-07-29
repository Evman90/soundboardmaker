import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DefaultResponseSettings } from '@/components/default-response-settings';
import { VoiceControls } from '@/components/voice-controls';
import { Settings as SettingsIcon, FileJson, Volume2, Mic } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your soundboard settings and manage your profiles.
        </p>
      </div>

      <Tabs defaultValue="voice" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Voice
          </TabsTrigger>
          <TabsTrigger value="audio" className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Audio
          </TabsTrigger>
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Profiles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="voice" className="mt-6">
          <VoiceControls />
        </TabsContent>

        <TabsContent value="audio" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Response Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <DefaultResponseSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profiles" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 text-center py-8">
                Profile import and export options have been moved to the main page for easier access.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}