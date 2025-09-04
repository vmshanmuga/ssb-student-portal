import React, { useState, useEffect } from 'react';
import { Menu, Sun, Moon, User, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import { apiService, type StudentProfile, type FullStudentProfile } from '../../services/api';
import toast from 'react-hot-toast';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  
  const [isDark, setIsDark] = React.useState(() => {
    // Set dark theme as default
    const stored = localStorage.getItem('theme');
    return stored ? stored === 'dark' : true; // Default to dark
  });
  const [userProfile, setUserProfile] = useState<StudentProfile | null>(null);
  const [fullProfile, setFullProfile] = useState<FullStudentProfile | null>(null);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    // Apply dark theme by default on first load
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Show welcome message after 2 seconds
    const timer = setTimeout(() => {
      setWelcomeVisible(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [isDark]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.email) return;
      
      try {
        // Get basic profile for name
        const result = await apiService.getStudentProfile(user.email);
        if (result.success && result.data) {
          setUserProfile(result.data);
        }
        
        // Get full profile for profile picture
        const fullResult = await apiService.getFullStudentProfile(user.email);
        if (fullResult.success && fullResult.data) {
          setFullProfile(fullResult.data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle('dark', newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <header className="bg-background border-b border-border">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-lg text-muted-foreground">
                {welcomeVisible ? (
                  <span className="animate-fadeIn">
                    Welcome back, {userProfile?.fullName || 'Student'}
                  </span>
                ) : (
                  <span className="opacity-50">Loading...</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="h-9 w-9 hover:bg-accent"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-yellow-500 hover:text-yellow-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600 hover:text-slate-800" />
              )}
            </Button>
            
            <div className="flex items-center space-x-2">
              <DropdownMenu
                align="right"
                trigger={
                  <div className="relative cursor-pointer">
                    <Avatar className="w-8 h-8 hover:ring-2 hover:ring-accent transition-all duration-200">
                      <AvatarImage 
                        src={fullProfile?.profilePicture} 
                        alt={userProfile?.fullName || 'User'}
                        onError={(e) => {
                          // Try alternative Google Drive formats if the primary one fails
                          const target = e.target as HTMLImageElement;
                          const currentSrc = target.src;
                          
                          if (currentSrc.includes('lh3.googleusercontent.com') && currentSrc.includes('=w400-h400')) {
                            target.src = currentSrc.replace('=w400-h400', '');
                          } else if (currentSrc.includes('lh3.googleusercontent.com') && !currentSrc.includes('drive.google.com')) {
                            const fileId = currentSrc.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
                            if (fileId) {
                              target.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
                            }
                          }
                        }}
                      />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium">
                        {userProfile?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                  </div>
                }
              >
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <div className="flex items-center space-x-2 text-red-600">
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;