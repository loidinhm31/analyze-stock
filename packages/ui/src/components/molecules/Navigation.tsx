import { Home, Settings, PlusCircle, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/atoms";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  hasTransactions: boolean;
}

/**
 * Mobile-first bottom navigation bar with React Router integration
 * Shows on mobile, transforms to sidebar on larger screens
 */
export function BottomNav({ hasTransactions }: BottomNavProps) {
  const navItems: {
    path: string;
    label: string;
    icon: React.ReactNode;
    show: boolean;
  }[] = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      show: hasTransactions,
    },
    {
      path: "/add",
      label: "Add",
      icon: <PlusCircle className="h-5 w-5" />,
      show: true,
    },
    {
      path: "/settings",
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
      show: true,
    },
  ];

  const visibleItems = navItems.filter((item) => item.show);

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center flex-1 h-full py-2 px-3 rounded-lg transition-colors",
                  isActive
                    ? "text-primary bg-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )
              }
            >
              {item.icon}
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Desktop Top Navigation */}
      <nav className="hidden md:block sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <NavLink to="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  $
                </span>
              </div>
              <span className="font-heading text-lg text-foreground">
                Spending Analyzer
              </span>
            </NavLink>

            {/* Nav Items */}
            <div className="flex items-center gap-2">
              {visibleItems.map((item) => (
                <NavLink key={item.path} to={item.path}>
                  {({ isActive }) => (
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                      asChild
                    >
                      <span>
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                    </Button>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

/**
 * Mobile header for pages
 */
export function MobileHeader({ title, showBack, onBack }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        {showBack ? (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-10" /> // Spacer
        )}
        <h1 className="font-heading text-lg">{title}</h1>
        <div className="w-10" /> {/* Spacer for balance */}
      </div>
    </header>
  );
}
