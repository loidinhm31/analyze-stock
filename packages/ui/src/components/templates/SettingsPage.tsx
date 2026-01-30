import { useState, useCallback } from "react";
import {
  Globe,
  Monitor,
  Info,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Database,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms";
import { MobileHeader } from "@/components/molecules/Navigation";
import {
  isTauri,
  isDesktop,
  getPlatformName,
  isOpenedFromDesktop,
} from "@/utils/platform";

interface SettingsPageProps {
  onBack?: () => void;
}

/**
 * Settings page with browser mode and app info
 */
export function SettingsPage({ onBack }: SettingsPageProps) {
  const [isOpeningBrowser, setIsOpeningBrowser] = useState(false);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const platform = getPlatformName();
  const canOpenInBrowser = isTauri() && isDesktop();
  const isFromDesktop = isOpenedFromDesktop();

  const handleOpenInBrowser = useCallback(async () => {
    if (!canOpenInBrowser) return;

    setIsOpeningBrowser(true);
    setError(null);

    try {
      const url = await invoke<string>("open_in_browser");
      setBrowserUrl(url);
      // Open the URL in the default browser
      await openUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsOpeningBrowser(false);
    }
  }, [canOpenInBrowser]);

  const handleStopBrowserServer = useCallback(async () => {
    try {
      await invoke("stop_browser_server");
      setBrowserUrl(null);
    } catch (err) {
      console.error("Failed to stop browser server:", err);
    }
  }, []);

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <MobileHeader title="Settings" showBack={!!onBack} onBack={onBack} />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Platform Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Platform</CardTitle>
                <CardDescription>Current runtime environment</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent text-accent-foreground">
                {platform === "tauri" ? (
                  <>
                    <Monitor className="h-4 w-4 mr-2" />
                    Desktop App
                  </>
                ) : isFromDesktop ? (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Browser (Connected)
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Browser
                  </>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Open in Browser - Only show in desktop Tauri mode */}
        {canOpenInBrowser && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Browser Access</CardTitle>
                  <CardDescription>
                    Open this app in your web browser
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Access your spending data from any browser on this device. The
                browser connects directly to your desktop database.
              </p>

              {browserUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      Browser server is running
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => openUrl(browserUrl)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Again
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleStopBrowserServer}
                    >
                      Stop Server
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleOpenInBrowser}
                  disabled={isOpeningBrowser}
                  className="w-full sm:w-auto"
                >
                  {isOpeningBrowser ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Open in Browser
                </Button>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Browser Connection Status - Only show in browser mode opened from desktop */}
        {isFromDesktop && !isTauri() && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Database className="h-5 w-5 text-success" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    Desktop Connection
                  </CardTitle>
                  <CardDescription>
                    Connected to desktop database
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>All changes sync directly with your desktop app</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* App Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">About</CardTitle>
                <CardDescription>Spending Analyzer</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">0.1.0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
