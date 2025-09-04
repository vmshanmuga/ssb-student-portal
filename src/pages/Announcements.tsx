import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  Megaphone, 
  Filter, 
  Search, 
  Calendar,
  User,
  CheckCircle,
  Circle,
  Eye,
  Clock
} from 'lucide-react';
import { apiService, type DashboardData, type ContentItem } from '../services/api';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const user = auth.currentUser;

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      
      if (!user?.email) {
        toast.error('No user email found');
        return;
      }

      const result = await apiService.getStudentDashboard(user.email);
      
      if (!result.success) {
        toast.error(`Error: ${result.error || 'Unknown error'}`);
        return;
      }

      // Filter for announcements
      const announcementItems = result.data!.content.filter(item => 
        item.category === 'ANNOUNCEMENTS'
      );
      
      setAnnouncements(announcementItems);
      
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  // For demo purposes, we'll use local state for read status
  const [readStatuses, setReadStatuses] = useState<{[key: string]: boolean}>({});

  const toggleReadStatus = (id: string) => {
    setReadStatuses(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const markAllAsRead = () => {
    const newStatuses: {[key: string]: boolean} = {};
    announcements.forEach(item => {
      newStatuses[item.id] = true;
    });
    setReadStatuses(newStatuses);
  };

  const filteredAnnouncements = announcements
    .filter(announcement => {
      const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (announcement.subTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (announcement.content || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || announcement.eventType === categoryFilter;
      const isRead = readStatuses[announcement.id] || false;
      const matchesRead = readFilter === 'all' || 
                         (readFilter === 'read' && isRead) ||
                         (readFilter === 'unread' && !isRead);
      
      return matchesSearch && matchesCategory && matchesRead;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Academic': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Events': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Career': return 'bg-green-100 text-green-800 border-green-200';
      case 'Facilities': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const announcementDate = new Date(date);
    const diffTime = now.getTime() - announcementDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return announcementDate.toLocaleDateString();
  };

  const unreadCount = announcements.filter(a => !readStatuses[a.id]).length;
  const categories = Array.from(new Set(announcements.map(a => a.eventType).filter(Boolean)));

  const AnnouncementCard = ({ announcement }: { announcement: ContentItem }) => {
    const isRead = readStatuses[announcement.id] || false;
    return (
    <Card className={`hover:shadow-md transition-all cursor-pointer ${
      !isRead ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''
    }`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={() => toggleReadStatus(announcement.id)}
                className="flex-shrink-0"
              >
                {isRead ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Circle className="h-4 w-4 text-blue-600" />
                )}
              </button>
              <CardTitle className={`text-lg ${!isRead ? 'font-bold' : 'font-medium'}`}>
                {announcement.title}
              </CardTitle>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="outline" className={getPriorityColor(announcement.priority)}>
                {announcement.priority} Priority
              </Badge>
              <Badge variant="outline" className={getCategoryColor(announcement.eventType || announcement.category)}>
                {announcement.eventType || announcement.category}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{getTimeAgo(announcement.createdAt)}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {announcement.subTitle || announcement.content}
          </p>
          
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{announcement.postedBy || 'Admin'}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleReadStatus(announcement.id)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {isRead ? 'Mark Unread' : 'Mark Read'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
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

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{announcements.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Circle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-sm text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{announcements.length - unreadCount}</p>
                <p className="text-sm text-muted-foreground">Read</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {announcements.filter(a => getTimeAgo(a.createdAt) === 'Today').length}
                </p>
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filters & Search
            </CardTitle>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} size="sm">
                Mark All Read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search announcements..."
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring"
                value={readFilter}
                onChange={(e) => setReadFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements Feed */}
      <div className="space-y-4">
        {filteredAnnouncements.map((announcement) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} />
        ))}
      </div>

      {filteredAnnouncements.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Megaphone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No announcements found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Announcements;