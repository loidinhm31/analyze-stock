import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms";

/**
 * Full-screen overlay shown when the desktop server disconnects.
 * Auto-closes the page after 10 seconds or when user clicks.
 */
export function DisconnectedOverlay() {
  const [countdown, setCountdown] = useState(10);

  const handleClose = () => {
    // Try to close the window/tab
    window.close();
    // Fallback: If window.close() doesn't work (e.g., not opened by script),
    // navigate to about:blank
    setTimeout(() => {
      window.location.href = "about:blank";
    }, 100);
  };

  useEffect(() => {
    // Auto-close countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
      onClick={handleClose}
    >
      <Card className="max-w-md w-full shadow-lg animate-in fade-in-0 zoom-in-95 duration-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-warning" />
          </div>
          <CardTitle className="text-xl">Desktop App Closed</CardTitle>
          <CardDescription className="text-base">
            The desktop application has been closed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            This page will close automatically in{" "}
            <span className="font-bold text-foreground">{countdown}</span>{" "}
            seconds.
          </p>

          <p className="text-xs text-muted-foreground">
            Click anywhere to close now
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
