import { NavLink } from "react-router-dom";
import {
  Home,
  PlusCircle,
  Settings,
  List,
  HandCoins,
  ChevronLeft,
  ChevronRight,
  Layers,
  PiggyBank,
} from "lucide-react";
import { Button } from "@money-insight/ui/components/atoms";
import { cn } from "@money-insight/ui/lib";
import { useNav } from "@money-insight/ui/hooks";

export interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  show?: boolean;
}

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  hasTransactions?: boolean;
  className?: string;
}

/**
 * Desktop sidebar navigation with collapsible state
 * Shows app logo, navigation items, and collapse toggle
 */
export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  hasTransactions = true,
  className,
}: SidebarProps) {
  const { to } = useNav();

  const navItems: NavItem[] = [
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
      path: to("/add"),
      label: "Add Transaction",
      icon: <PlusCircle className="h-5 w-5" />,
      show: true,
    },
    {
      path: to("/categories"),
      label: "Categories",
      icon: <Layers className="h-5 w-5" />,
      show: hasTransactions,
    },
    {
      path: to("/budget"),
      label: "Budget",
      icon: <PiggyBank className="h-5 w-5" />,
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
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {/* Header with Logo */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-border",
          collapsed ? "justify-center" : "gap-3",
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">$</span>
        </div>
        {!collapsed && (
          <span className="font-heading text-lg text-foreground truncate">
            Money Insight
          </span>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )
            }
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && (
              <span className="text-sm font-medium truncate">{item.label}</span>
            )}
            {!collapsed && item.badge !== undefined && item.badge > 0 && (
              <span className="ml-auto bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <div className="p-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className={cn("w-full", collapsed ? "justify-center" : "")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </aside>
  );
}
