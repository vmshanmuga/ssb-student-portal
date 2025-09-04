import React, { useState, useEffect } from 'react';
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

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!user?.email) {
        toast.error('No user email found');
        return;
      }

      const result = await apiService.getStudentDashboard(user.email);
      
      if (!result.success) {
        toast.error(`Dashboard error: ${result.error || 'Unknown error'}`);
        return;
      }

      setDashboardData(result.data!);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-foreground mb-2">No data available</h3>
        <p className="text-muted-foreground">Unable to load dashboard data</p>
      </div>
    );
  }

  // Filter content by category/type
  const upcomingAssignments = dashboardData.content
    .filter(item => item.category === 'ASSIGNMENTS & TASKS' && item.status === 'Active')
    .slice(0, 3);
    
  const recentAnnouncements = dashboardData.content
    .filter(item => item.category === 'ANNOUNCEMENTS')
    .slice(0, 3);
    
  const upcomingEvents = dashboardData.content
    .filter(item => item.category === 'EVENTS')
    .slice(0, 3);

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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClipboardList className="mr-2 h-5 w-5" />
              Recent Assignments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAssignments.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium">{item.title}</h4>
                    <Badge variant="outline" className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{item.subTitle}</p>
                  {item.subject && (
                    <p className="text-xs text-muted-foreground mb-2">{item.subject}</p>
                  )}
                </div>
                <div className="ml-4 text-right">
                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(item.priority)} mb-1`} />
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.endDateTime).toLocaleDateString()}
                  </p>
                  {item.daysUntilDeadline !== null && (
                    <p className="text-xs text-muted-foreground">
                      {item.daysUntilDeadline} days left
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Megaphone className="mr-2 h-5 w-5" />
              Recent Announcements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAnnouncements.map((item) => (
              <div key={item.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium flex-1">{item.title}</h4>
                  <Badge variant="outline" className={getPriorityColor(item.priority)}>
                    {item.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {item.subTitle || (item.content ? item.content.substring(0, 100) + '...' : '')}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.postedBy || 'Admin'}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Upcoming Events */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button className="w-full flex items-center p-3 text-left border rounded-lg hover:bg-accent transition-colors">
              <ClipboardList className="mr-3 h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">View All Assignments</p>
                <p className="text-xs text-muted-foreground">Manage your tasks</p>
              </div>
            </button>
            <button className="w-full flex items-center p-3 text-left border rounded-lg hover:bg-accent transition-colors">
              <FolderOpen className="mr-3 h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Browse Resources</p>
                <p className="text-xs text-muted-foreground">Study materials</p>
              </div>
            </button>
            <button className="w-full flex items-center p-3 text-left border rounded-lg hover:bg-accent transition-colors">
              <Calendar className="mr-3 h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Check Calendar</p>
                <p className="text-xs text-muted-foreground">Upcoming events</p>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingEvents.map((item) => (
              <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.subTitle}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.startDateTime).toLocaleDateString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.startDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    {item.groups && (
                      <span className="text-xs text-muted-foreground">
                        {item.groups}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="outline">
                  {item.eventType || item.category}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;