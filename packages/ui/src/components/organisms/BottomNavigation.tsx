import { NavLink } from "react-router-dom";
import { Home, PlusCircle, Settings, List, HandCoins, PiggyBank } from "lucide-react";
import { cn } from "@money-insight/ui/lib";
import { useNav } from "@money-insight/ui/hooks";

export interface BottomNavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  show?: boolean;
}

export interface BottomNavigationProps {
  hasTransactions?: boolean;
  className?: string;
}

/**
 * Mobile bottom navigation bar with React Router integration
 * Fixed at bottom of screen, shows 4-5 main navigation items
 * Supports badge notifications and active state indicators
 */
export function BottomNavigation({
  hasTransactions = true,
  className,
}: BottomNavigationProps) {
  const { to } = useNav();

  const navItems: BottomNavItem[] = [
    {
      path: to("/dashboard"),
      label: "Dashboard",
      icon: <Home className="h-5 w-5" />,
      show: hasTransactions,
    },
    {
      path: to("/transactions"),
      label: "Transactions",
      icon: <List className="h-5 w-5" />,
      show: hasTransactions,
    },
    {
      path: to("/debt"),
      label: "Debt",
      icon: <HandCoins className="h-5 w-5" />,
      show: true,
    },
    {
      path: to("/budget"),
      label: "Budget",
      icon: <PiggyBank className="h-5 w-5" />,
      show: true,
    },
    {
      path: to("/add"),
      label: "Add",
      icon: <PlusCircle className="h-5 w-5" />,
      show: true,
    },
    {
      path: to("/settings"),
      label: "Settings",
      icon: <Settings className="h-5 w-5" />,
      show: true,
    },
  ];

  const visibleItems = navItems.filter((item) => item.show !== false);

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden",
        className,
      )}
    >
      <div className="flex items-center justify-around h-16 px-2 pb-safe">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center justify-center flex-1 h-full py-2 px-1 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active indicator line */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}

                {/* Icon with badge */}
                <span className="relative">
                  {item.icon}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-destructive text-destructive-foreground text-[10px] font-medium px-1 rounded-full flex items-center justify-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </span>

                {/* Label */}
                <span
                  className={cn(
                    "text-xs mt-1 font-medium",
                    isActive ? "text-primary" : "",
                  )}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
