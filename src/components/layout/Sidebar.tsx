import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Megaphone, 
  FolderOpen, 
  Calendar, 
  FileText,
  User,
  Menu,
  BarChart3,
  Users
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Dashboard', href: '/dashboards', icon: BarChart3 },
  { name: 'Assignments', href: '/assignments', icon: ClipboardList },
  { name: 'Events & Announcements', href: '/announcements', icon: Megaphone },
  { name: 'Resources', href: '/resources', icon: FolderOpen },
  { name: 'Students Corner', href: '/students-corner', icon: Users },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Policy & Documents', href: '/policies', icon: FileText },
  { name: 'Profile', href: '/profile', icon: User },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo and close button */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              {/* Logo with green background for better visibility */}
              <div className="flex items-center bg-primary rounded-lg p-2">
                <img 
                  src="https://d2beiqkhq929f0.cloudfront.net/public_assets/assets/000/090/511/original/Copy_of_Logo-White.png?1727164234"
                  alt="SSB Logo" 
                  className="h-6 w-auto"
                />
              </div>
              <span className="text-lg font-semibold text-foreground">SSB Portal</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsOpen(false)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

        </div>
      </div>
    </>
  );
};

export default Sidebar;