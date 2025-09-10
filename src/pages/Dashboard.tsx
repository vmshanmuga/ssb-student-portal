import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  ClipboardList, 
  Clock, 
  Megaphone,
  FolderOpen,
  Calendar,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import { apiService, type DashboardData, type ContentItem } from '../services/api';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';
import { formatDateTime, formatDate, parseDate } from '../utils/dateUtils';

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = auth.currentUser;


  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('Dashboard: Starting to load data...');
      setLoading(true); // Explicitly set loading to true
      
      
      if (!user?.email) {
        console.log('Dashboard: No user email found');
        toast.error('No user email found');
        setLoading(false);
        return;
      }

      const result = await apiService.getStudentDashboard(user.email);
      
      if (!result.success) {
        console.log('Dashboard: API call failed:', result.error);
        toast.error(`Dashboard error: ${result.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      setDashboardData(result.data!);
      console.log('Dashboard: Data loaded successfully');
      setLoading(false);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard');
      setLoading(false);
    }
  };

  // Show skeleton loading directly
  if (loading || !dashboardData) {
    return (
      <div className="space-y-6">
        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg p-6 border animate-pulse">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 bg-muted rounded"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Content Cards Skeleton */}
        <div className="grid gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg p-6 border animate-pulse">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                  <div className="h-4 w-4 bg-muted rounded"></div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="space-y-2">
                      <div className="h-5 bg-muted rounded w-4/5"></div>
                      <div className="h-4 bg-muted rounded w-3/5"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Filter content by category/type
  const recentPostings = dashboardData.content
    .filter(item => 
      item.category !== 'DASHBOARDS' && 
      item.category !== 'RESOURCES' &&
      item.category !== 'COURSE MATERIAL'
    )
    .sort((a, b) => {
      // Sort by createdAt first, fallback to startDateTime
      const dateA = parseDate(a.createdAt || a.startDateTime);
      const dateB = parseDate(b.createdAt || b.startDateTime);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateB.getTime() - dateA.getTime(); // Most recent first
    })
    .slice(0, 6);
    

  const liveAndUpcomingItems = dashboardData.content
    .filter(item => 
      (item.status === 'Active' || item.status === 'Upcoming') && 
      item.category !== 'DASHBOARDS' && 
      item.category !== 'RESOURCES' &&
      item.category !== 'COURSE MATERIAL' &&
      item.startDateTime // Must have a start date
    )
    .sort((a, b) => {
      // Sort by status first (Active before Upcoming), then by start date
      if (a.status === 'Active' && b.status !== 'Active') return -1;
      if (b.status === 'Active' && a.status !== 'Active') return 1;
      
      // Then sort by start date/time using the utility function
      const dateA = parseDate(a.startDateTime);
      const dateB = parseDate(b.startDateTime);
      
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5); // Show 5 items instead of 3

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-500';
      case 'Medium': return 'bg-yellow-500';
      case 'Low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-green-600 bg-green-100';
      case 'In Progress': return 'text-blue-600 bg-blue-100';
      case 'Not Started': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Content"
          value={dashboardData.stats.total}
          subtitle="All content items"
          icon={ClipboardList}
          color="text-blue-600"
        />
        <StatCard
          title="Active Items"
          value={dashboardData.stats.active}
          subtitle="Requiring attention"
          icon={TrendingUp}
          color="text-green-600"
        />
        <StatCard
          title="Upcoming Items"
          value={dashboardData.stats.upcoming}
          subtitle="Due soon"
          icon={Clock}
          color="text-orange-600"
        />
        <StatCard
          title="Requires Action"
          value={dashboardData.stats.requiresAck}
          subtitle="Need acknowledgment"
          icon={Megaphone}
          color="text-purple-600"
        />
      </div>

      {/* Quick Actions and Upcoming Events */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button 
              className="w-full flex items-center p-3 text-left border rounded-lg hover:bg-accent transition-colors"
              onClick={() => navigate('/assignments')}
            >
              <ClipboardList className="mr-3 h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">View All Assignments</p>
                <p className="text-xs text-muted-foreground">Manage your tasks</p>
              </div>
            </button>
            <button 
              className="w-full flex items-center p-3 text-left border rounded-lg hover:bg-accent transition-colors"
              onClick={() => navigate('/resources')}
            >
              <FolderOpen className="mr-3 h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Browse Resources</p>
                <p className="text-xs text-muted-foreground">Study materials</p>
              </div>
            </button>
            <button 
              className="w-full flex items-center p-3 text-left border rounded-lg hover:bg-accent transition-colors"
              onClick={() => navigate('/calendar')}
            >
              <Calendar className="mr-3 h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Check Calendar</p>
                <p className="text-xs text-muted-foreground">Upcoming events</p>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Live & Upcoming Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Live & Upcoming Items
            </CardTitle>
          </CardHeader>
          <CardContent className="h-60 overflow-y-auto space-y-4">
            {liveAndUpcomingItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    {item.category === 'EVENTS' ? (
                      <Calendar className="h-5 w-5 text-purple-600" />
                    ) : item.category === 'ANNOUNCEMENTS' ? (
                      <Megaphone className="h-5 w-5 text-blue-600" />
                    ) : item.category === 'ASSIGNMENTS & TASKS' ? (
                      <ClipboardList className="h-5 w-5 text-green-600" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.status === 'Active' ? (
                      <Badge variant="outline" className="bg-green-500 text-white border-0 animate-pulse text-xs">
                        LIVE NOW
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-500 text-white border-0 text-xs">
                        UPCOMING
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.subTitle}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.startDateTime)}
                    </span>
                    {item.groups && (
                      <span className="text-xs text-muted-foreground">
                        {item.groups}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="outline">
                  {item.category}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Postings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Recent Postings
            <span className="ml-2 text-sm font-normal text-muted-foreground">(Latest Activity)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {recentPostings.map((item) => (
              <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    {item.category === 'EVENTS' ? (
                      <Calendar className="h-4 w-4 text-purple-600" />
                    ) : item.category === 'ANNOUNCEMENTS' ? (
                      <Megaphone className="h-4 w-4 text-blue-600" />
                    ) : item.category === 'ASSIGNMENTS & TASKS' ? (
                      <ClipboardList className="h-4 w-4 text-green-600" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium truncate">{item.title}</h4>
                    <Badge variant="outline" className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.subTitle}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {item.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt || item.startDateTime)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;