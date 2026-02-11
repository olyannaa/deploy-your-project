import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Building2,
  Settings,
  Clock,
  ClipboardCheck,
  Banknote,
  Menu,
  X,
} from "lucide-react";
import { UserRole } from "./RoleSwitcher";
import { Button } from "./ui/button";
import { RoleProvider } from "@/contexts/RoleContext";
import innerLogo from "@/assets/inner-logo.svg";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  roles?: UserRole[];
}

const allNavigation: NavigationItem[] = [
  { name: "Проекты", href: "/projects", icon: FolderKanban, roles: ["admin", "gip", "executor"] },
  { name: "Финансы", href: "/finance", icon: Banknote, roles: ["admin", "gip", "accountant"] },
  { name: "Задачи", href: "/tasks", icon: LayoutDashboard, roles: ["admin", "gip", "executor", "accountant"] },
  { name: "Заявки", href: "/approvals", icon: ClipboardCheck, roles: ["admin"] },
  { name: "Учет времени", href: "/time-tracking", icon: Clock, roles: ["admin", "gip", "executor", "accountant"] },
  { name: "Структура организации", href: "/organization", icon: Building2, roles: ["admin", "accountant"] },
];

const roleLabels: Record<UserRole, string> = {
  admin: "Администратор",
  gip: "ГИП",
  executor: "Исполнитель",
  accountant: "Бухгалтер",
};

const roleOptions: UserRole[] = ["admin", "gip", "executor", "accountant"];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, switchRole } = useAuth();

  const currentRole = useMemo<UserRole>(() => {
    const roles = user.roles;
    if (roles.includes("admin")) return "admin";
    if (roles.includes("gip")) return "gip";
    if (roles.includes("accountant")) return "accountant";
    return "executor";
  }, [user.roles]);

  const canApproveSubcontracts = user.canApproveSubcontracts;
  const currentUserName = user.fullName;

  const navigation = allNavigation.filter((item) => {
    if (item.href === "/approvals") return canApproveSubcontracts;
    return !item.roles || item.roles.includes(currentRole);
  });

  return (
    <RoleProvider currentRole={currentRole} currentUserName={currentUserName}>
      <div className="flex min-h-screen bg-gradient-to-br from-background to-muted/20">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-sidebar border-b-2 border-sidebar-border flex items-center justify-between px-4">
          <img src={innerLogo} alt="Logo" className="h-8 w-auto" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-sidebar-foreground"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r-2 border-sidebar-border shadow-large transition-transform duration-300",
            "lg:translate-x-0",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col pt-16 lg:pt-0">
            <div className="hidden lg:flex h-16 items-center border-b-2 border-sidebar-border px-6">
              <img src={innerLogo} alt="Logo" className="h-8 w-auto" />
            </div>

            {/* Role Switcher */}
            <div className="p-4 border-b-2 border-sidebar-border">
              <div className="rounded-lg border border-border bg-card px-3 py-2">
                <div className="text-xs text-muted-foreground mb-1">Переключить роль (демо)</div>
                <Select value={currentRole} onValueChange={(v) => switchRole(v as UserRole)}>
                  <SelectTrigger className="h-9 border-border bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        <div className="font-medium">{roleLabels[role]}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-1 text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 transition-transform group-hover:scale-110",
                        isActive && "text-sidebar-primary-foreground",
                      )}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t-2 border-sidebar-border p-4">
              <Link
                to="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  location.pathname === "/settings"
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Settings className="h-5 w-5" />
                <span>Настройки</span>
              </Link>
            </div>
          </div>
        </aside>

        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <main className="lg:ml-64 flex-1 w-full min-w-0 pt-16 lg:pt-0">
          <div className="container mx-auto p-4 sm:p-6 md:p-8">
            <div className="mb-4 flex items-center justify-end gap-2">
              {(currentRole === "accountant" || currentRole === "admin") && <NotificationBell />}
              <ThemeToggle />
            </div>
            {children}
          </div>
        </main>
      </div>
    </RoleProvider>
  );
}
