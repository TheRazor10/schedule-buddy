import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Server, Wifi, WifiOff, Loader2, HardDrive } from 'lucide-react';
import {
  getServerConfig,
  setServerConfig,
  testServerConnection,
  getStorageMode,
} from '@/utils/persistence';

interface ServerSettingsProps {
  onConnectionChange?: () => void;
}

export default function ServerSettings({ onConnectionChange }: ServerSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const storageMode = getStorageMode();

  useEffect(() => {
    const config = getServerConfig();
    if (config) {
      setServerUrl(config.serverUrl);
      setApiKey(config.apiKey);
      setIsConnected(true);
    }
  }, [isOpen]);

  const handleTestConnection = async () => {
    if (!serverUrl.trim() || !apiKey.trim()) return;

    setIsTesting(true);
    setTestResult(null);

    const result = await testServerConnection(serverUrl.trim(), apiKey.trim());
    setTestResult(result);
    setIsTesting(false);
  };

  const handleConnect = async () => {
    if (!serverUrl.trim() || !apiKey.trim()) return;

    // Test first
    setIsTesting(true);
    const result = await testServerConnection(serverUrl.trim(), apiKey.trim());
    setIsTesting(false);

    if (!result.ok) {
      setTestResult(result);
      return;
    }

    setServerConfig({
      serverUrl: serverUrl.trim(),
      apiKey: apiKey.trim(),
    });
    setIsConnected(true);
    setTestResult(null);
    setIsOpen(false);
    onConnectionChange?.();
  };

  const handleDisconnect = () => {
    setServerConfig(null);
    setIsConnected(false);
    setServerUrl('');
    setApiKey('');
    setTestResult(null);
    setIsOpen(false);
    onConnectionChange?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
          {storageMode === 'server' ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-green-500" />
              <span className="hidden sm:inline">Сървър</span>
            </>
          ) : (
            <>
              <HardDrive className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Локално</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Настройки на сървъра
          </DialogTitle>
          <DialogDescription>
            Свържете се с централен сървър за споделен достъп до данните от няколко компютъра.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Текущ режим:</span>
            {isConnected ? (
              <Badge variant="default" className="bg-green-600">
                <Wifi className="h-3 w-3 mr-1" />
                Свързан към сървър
              </Badge>
            ) : (
              <Badge variant="secondary">
                <HardDrive className="h-3 w-3 mr-1" />
                Локално съхранение
              </Badge>
            )}
          </div>

          {/* Server URL */}
          <div className="space-y-2">
            <Label htmlFor="server-url">Адрес на сървъра</Label>
            <Input
              id="server-url"
              placeholder="http://192.168.1.50:3456"
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.target.value);
                setTestResult(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              IP адресът и портът на компютъра, на който работи сървърът.
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api-key">API ключ</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="Въведете API ключа от сървъра"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestResult(null);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Ключът се показва при стартиране на сървъра.
            </p>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`rounded-md p-3 text-sm ${
              testResult.ok
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {testResult.ok
                ? 'Връзката е успешна!'
                : `Грешка: ${testResult.error}`
              }
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isConnected && (
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              className="sm:mr-auto"
            >
              <WifiOff className="h-4 w-4 mr-2" />
              Прекъсни връзката
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={!serverUrl.trim() || !apiKey.trim() || isTesting}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4 mr-2" />
            )}
            Тест
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!serverUrl.trim() || !apiKey.trim() || isTesting}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Server className="h-4 w-4 mr-2" />
            )}
            Свържи
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
