import { ReactNode, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building,
  ClipboardList
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAuthActions } from "@/hooks/use-auth";
import { formatEmployeeName, getEmployeeInitials } from "@/lib/employee-utils";
import SessionStatusBanner from "@/components/SessionStatusBanner";
import SafariBanner from "@/components/SafariBanner";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Get actual user data from auth context
  const { user, employee, profile, isAdmin, isManager } = useAuthContext();
  const { signOut } = useAuthActions();

  const handleLogout = async () => {
    console.log('🚪 DashboardLayout: Logout button clicked');
    
    try {
      const result = await signOut();
      
      console.log('📊 DashboardLayout: SignOut result:', result);
      
      if (result.success) {
        console.log('✅ DashboardLayout: Sign out successful, navigating to login');
        
        toast({
          title: "Abgemeldet",
          description: "Sie wurden erfolgreich abgemeldet.",
        });
        
        // Navigate to login page
        navigate("/login");
      } else {
        console.error('❌ DashboardLayout: Sign out failed:', result.error);
        
        toast({
          title: "Fehler beim Abmelden",
          description: result.error?.message || "Es ist ein Fehler aufgetreten.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ DashboardLayout: Logout error:', error);
      
      toast({
        title: "Fehler beim Abmelden",
        description: "Es ist ein unerwarteter Fehler aufgetreten.",
        variant: "destructive",
      });
    }
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Zeiterfassung", href: "/time-tracking", icon: Clock },
    { name: "Urlaubsplanung", href: "/vacation", icon: Calendar },
    { name: "Schichtplanung", href: "/scheduling", icon: ClipboardList },
  ];

  const adminNavigation = [
    { name: "Mitarbeiter", href: "/employees", icon: Users },
    { name: "Gruppen", href: "/groups", icon: Building },
    { name: "Einstellungen", href: "/adminSettings", icon: Settings },
  ];

  const allNavigation = (isAdmin || isManager)
    ? [...navigation, ...adminNavigation]
    : navigation;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b">
            <div className="flex items-center gap-2">
              <Clock className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">TimeTrack Pro</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {allNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {getEmployeeInitials(employee, isAdmin, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {formatEmployeeName(employee, user?.email)}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || 'user@demo.de'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          {/* Session Status - Temporarily disabled */}
          {/* <SessionStatusCompact className="mr-4" /> */}

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {getEmployeeInitials(employee, isAdmin, user?.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block">
                  {formatEmployeeName(employee, user?.email)}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                Einstellungen
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  console.log('🖦️ Logout menu item clicked');
                  e.preventDefault();
                  handleLogout();
                }} 
                className="text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="p-6">
          <SafariBanner />
          <SessionStatusBanner />
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;