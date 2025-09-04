import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { apiService } from '../services/api';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Users, 
  TrendingUp, 
  ExternalLink,
  Calendar,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardLink {
  name: string;
  link: string;
  description: string;
  type: string;
  category?: string;
  eventType?: string;
}

const Dashboards: React.FC = () => {
  const [dashboards, setDashboards] = useState<DashboardLink[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchDashboards = async () => {
      if (!user?.email) return;
      
      try {
        const result = await apiService.getDashboardLinks(user.email);
        
        if (result.success) {
          setDashboards(result.data || []);
        } else {
          console.error('Failed to fetch dashboards:', result.error);
          toast.error('Failed to load dashboards');
        }
      } catch (error) {
        console.error('Error fetching dashboards:', error);
        toast.error('Error loading dashboards');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboards();
  }, [user]);

  const getDashboardIcon = (type: string) => {
    switch (type) {
      case 'academic': return <LayoutDashboard className="w-8 h-8" />;
      case 'assignment': return <ClipboardList className="w-8 h-8" />;
      case 'attendance': return <Calendar className="w-8 h-8" />;
      case 'mentorship': return <Users className="w-8 h-8" />;
      case 'placement': return <TrendingUp className="w-8 h-8" />;
      default: return <LayoutDashboard className="w-8 h-8" />;
    }
  };

  const getDashboardColor = (type: string) => {
    switch (type) {
      case 'academic': return 'from-blue-500 to-blue-600';
      case 'assignment': return 'from-green-500 to-green-600';
      case 'attendance': return 'from-purple-500 to-purple-600';
      case 'mentorship': return 'from-orange-500 to-orange-600';
      case 'placement': return 'from-red-500 to-red-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const handleDashboardClick = (dashboard: DashboardLink) => {
    const proceed = window.confirm(
      'Make sure this browser only has ssb.scaler.com Gmail account logged in to avoid any errors.\n\nClick OK to continue to the dashboard.'
    );
    
    if (proceed) {
      window.open(dashboard.link, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboards</h1>
        <p className="text-muted-foreground mt-2">
          Access your specialized dashboards for different aspects of your academic journey
        </p>
      </div>

      {dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No Dashboards Available</h3>
          <p className="text-muted-foreground">
            No dashboard links are currently available for your account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard, index) => (
            <div
              key={index}
              onClick={() => handleDashboardClick(dashboard)}
              className="bg-card hover:bg-accent/50 border border-border rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 group"
            >
              <div className="flex items-start space-x-4">
                <div className={`bg-gradient-to-r ${getDashboardColor(dashboard.type)} p-3 rounded-lg text-white group-hover:scale-110 transition-transform duration-200`}>
                  {getDashboardIcon(dashboard.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground truncate">
                      {dashboard.name}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  {dashboard.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {dashboard.description}
                    </p>
                  )}
                  {dashboard.category && (
                    <div className="mt-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {dashboard.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-foreground">Important Note</h4>
            <p className="text-sm text-muted-foreground mt-1">
              For best results, ensure you're logged into your SSB Scaler Gmail account (@ssb.scaler.com) 
              in this browser before accessing any dashboard links.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboards;