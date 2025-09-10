import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CalendarSkeleton } from '../components/ui/loading-skeletons';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  GraduationCap,
  BookOpen,
  Search,
  Filter,
  ClipboardList,
  Bell,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ContentItem } from '../services/api';
import { formatDate, formatDateTime as formatDateTimeUtil, formatTime, parseDate } from '../utils/dateUtils';

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [scheduleItems, setScheduleItems] = useState<ContentItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const navigate = useNavigate();
  const user = auth.currentUser;

  const today = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Fetch schedule data
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!user?.email) return;
      
      try {
        setLoading(true);
        console.log('Fetching schedule for user:', user.email);
        // Try getStudentSchedule first, fall back to dashboard if no data
        let result = await apiService.getStudentSchedule(user.email);
        
        // If no schedule data, get from dashboard and filter for EVENTS and ANNOUNCEMENTS
        if (!result.success || !result.data || result.data.length === 0) {
          console.log('Calendar: No schedule data, trying dashboard API...');
          const dashboardResult = await apiService.getStudentDashboard(user.email);
          if (dashboardResult.success) {
            const eventItems = dashboardResult.data!.content.filter(item => 
              item.category === 'EVENTS' || item.category === 'ANNOUNCEMENTS'
            );
            result = { success: true, data: eventItems };
          }
        }
        
        console.log('Schedule API response:', result);
        
        if (result.success) {
          console.log('Schedule items found:', result.data?.length || 0);
          console.log('Calendar: All schedule items:', result.data);
          console.log('Calendar: Available categories:', Array.from(new Set((result.data || []).map(item => item.category))));
          setScheduleItems(result.data || []);
          setFilteredItems(result.data || []);
        } else {
          console.error('Failed to fetch schedule:', result.error);
          toast.error('Failed to load schedule: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error fetching schedule:', error);
        toast.error('Error loading schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [user]);

  // Filter effect
  useEffect(() => {
    let filtered = scheduleItems;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(item =>
        item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply domain filter
    if (domainFilter !== 'all') {
      filtered = filtered.filter(item => item.domain === domainFilter);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Sort filtered items by start date/time (earliest first)
    filtered.sort((a, b) => {
      const dateA = parseDate(a.startDateTime);
      const dateB = parseDate(b.startDateTime);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    });

    setFilteredItems(filtered);
  }, [scheduleItems, searchTerm, statusFilter, domainFilter, categoryFilter]);

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startDate = firstDayOfMonth.getDay(); // 0 = Sunday

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get category-specific styling
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CLASS/SESSION SCHEDULE': return <GraduationCap className="h-5 w-5" />;
      case 'ASSIGNMENTS & TASKS': return <ClipboardList className="h-5 w-5" />;
      case 'Events & Announcements': return <Bell className="h-5 w-5" />;
      case 'FORMS': return <FileText className="h-5 w-5" />;
      case 'Resource': return <BookOpen className="h-5 w-5" />;
      default: return <CalendarIcon className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'CLASS/SESSION SCHEDULE': return 'text-[#1d8f5b]';
      case 'ASSIGNMENTS & TASKS': return 'text-[#ffc300]';
      case 'Events & Announcements': return 'text-purple-600';
      case 'FORMS': return 'text-indigo-600';
      case 'Resource': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryBgColor = (category: string) => {
    switch (category) {
      case 'CLASS/SESSION SCHEDULE': return 'bg-[#1d8f5b]/10';
      case 'ASSIGNMENTS & TASKS': return 'bg-[#ffc300]/20';
      case 'Events & Announcements': return 'bg-purple-100';
      case 'FORMS': return 'bg-indigo-100';
      case 'Resource': return 'bg-green-100';
      default: return 'bg-gray-100';
    }
  };

  // Navigation handler for calendar items
  const handleItemClick = (item: ContentItem) => {
    switch (item.category) {
      case 'CLASS/SESSION SCHEDULE':
        navigate('/dashboard'); // Classes shown on main dashboard
        break;
      case 'ASSIGNMENTS & TASKS':
        navigate('/assignments');
        break;
      case 'Events & Announcements':
        navigate('/announcements'); // Combined events and announcements go to announcements section
        break;
      case 'FORMS':
        navigate('/dashboard'); // Forms might be on dashboard or could be separate
        break;
      case 'Resource':
        navigate('/dashboard'); // Resources on dashboard
        break;
      default:
        navigate('/dashboard');
        break;
    }
    
    // Show a toast to indicate navigation
    toast.success(`Navigating to ${item.category.toLowerCase().replace(/[&]/g, 'and')} section`);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };

  const isSelected = (day: number) => {
    return selectedDate && 
           selectedDate.getDate() === day && 
           selectedDate.getMonth() === currentMonth && 
           selectedDate.getFullYear() === currentYear;
  };

  const getEventsForDate = (day: number) => {
    const targetDate = new Date(currentYear, currentMonth, day);
    return filteredItems.filter(item => {
      const itemDate = parseDate(item.startDateTime);
      if (!itemDate) return false;
      return itemDate.toDateString() === targetDate.toDateString();
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800 border-green-200';
      case 'Upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Expired': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return { date: '', time: '' };
    const date = parseDate(dateTimeString);
    if (!date) return { date: '', time: '' };
    return {
      date: formatDate(dateTimeString),
      time: formatTime(dateTimeString)
    };
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate.getDate()) : [];
  const upcomingEvents = filteredItems
    .filter(item => {
      const itemDate = parseDate(item.startDateTime);
      if (!itemDate) return false;
      return itemDate >= today;
    })
    .sort((a, b) => {
      const dateA = parseDate(a.startDateTime);
      const dateB = parseDate(b.startDateTime);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  // Get unique values for filters
  const uniqueDomains = Array.from(new Set(scheduleItems.map(item => item.domain).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(scheduleItems.map(item => item.status).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(scheduleItems.map(item => item.category).filter(Boolean)));

  // Statistics
  const stats = {
    total: filteredItems.length,
    assignments: filteredItems.filter(item => item.category === 'ASSIGNMENTS & TASKS').length,
    eventsAnnouncements: filteredItems.filter(item => item.category === 'Events & Announcements').length,
    classes: filteredItems.filter(item => item.category === 'CLASS/SESSION SCHEDULE').length,
    resources: filteredItems.filter(item => item.category === 'Resource').length
  };

  // Generate calendar days
  const calendarDays = [];
  
  // Previous month's trailing days
  for (let i = 0; i < startDate; i++) {
    const day = new Date(currentYear, currentMonth, -startDate + i + 1).getDate();
    calendarDays.push({ day, isCurrentMonth: false });
  }
  
  // Current month's days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ day, isCurrentMonth: true });
  }
  
  // Next month's leading days
  const remainingCells = 42 - calendarDays.length;
  for (let day = 1; day <= remainingCells; day++) {
    calendarDays.push({ day, isCurrentMonth: false });
  }

  if (loading) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-[#1d8f5b]" />
              <div>
                <p className="text-2xl font-bold text-[#3a3a3a]">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ClipboardList className="h-5 w-5 text-[#ffc300]" />
              <div>
                <p className="text-2xl font-bold text-[#3a3a3a]">{stats.assignments}</p>
                <p className="text-sm text-muted-foreground">Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-[#3a3a3a]">{stats.eventsAnnouncements}</p>
                <p className="text-sm text-muted-foreground">Events & Announcements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5 text-[#1d8f5b]" />
              <div>
                <p className="text-2xl font-bold text-[#3a3a3a]">{stats.classes}</p>
                <p className="text-sm text-muted-foreground">Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            
            {/* Domain Filter */}
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
            >
              <option value="all">All Domains</option>
              {uniqueDomains.map(domain => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
            
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          {/* Active Filters Display */}
          {(searchTerm || statusFilter !== 'all' || domainFilter !== 'all' || categoryFilter !== 'all') && (
            <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Search className="h-3 w-3" />
                  <span>"{searchTerm}"</span>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 h-3 w-3 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-muted-foreground/40"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Status: {statusFilter}</span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 h-3 w-3 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-muted-foreground/40"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {domainFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Domain: {domainFilter}</span>
                  <button
                    onClick={() => setDomainFilter('all')}
                    className="ml-1 h-3 w-3 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-muted-foreground/40"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {categoryFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Category: {categoryFilter}</span>
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className="ml-1 h-3 w-3 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-muted-foreground/40"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDomainFilter('all');
                  setCategoryFilter('all');
                }}
                className="ml-2 h-6 px-2 text-xs"
              >
                Clear All
              </Button>
            </div>
          )}
          
          {/* Results Summary */}
          <div className="mt-2 text-sm text-muted-foreground">
            Showing {filteredItems.length} of {scheduleItems.length} sessions
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5" />
                {monthNames[currentMonth]} {currentYear}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {dayNames.map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ day, isCurrentMonth }, index) => {
                const events = isCurrentMonth ? getEventsForDate(day) : [];
                return (
                  <div
                    key={index}
                    className={`
                      p-2 min-h-[60px] border rounded-lg cursor-pointer transition-colors
                      ${isCurrentMonth ? 'hover:bg-accent' : 'text-muted-foreground bg-muted/20'}
                      ${isCurrentMonth && isToday(day) ? 'bg-primary text-primary-foreground' : ''}
                      ${isCurrentMonth && isSelected(day) ? 'ring-2 ring-primary' : ''}
                    `}
                    onClick={() => isCurrentMonth && setSelectedDate(new Date(currentYear, currentMonth, day))}
                  >
                    <div className="text-sm font-medium mb-1">{day}</div>
                    <div className="space-y-1">
                      {events.slice(0, 2).map(event => {
                        const eventTime = event.startDateTime ? formatTime(event.startDateTime) : '';
                        return (
                          <div
                            key={event.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemClick(event);
                            }}
                            className={`text-xs p-1 rounded ${getCategoryBgColor(event.category || '')} ${getCategoryColor(event.category || '')} font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                          >
                            <div className="truncate">{event.title}</div>
                            {eventTime && <div className="text-[10px] opacity-75">{eventTime}</div>}
                          </div>
                        );
                      })}
                      {events.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{events.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.map(event => {
                      const dateTime = formatDateTime(event.startDateTime || '');
                      const endDateTime = formatDateTime(event.endDateTime || '');
                      return (
                        <div 
                          key={event.id} 
                          onClick={() => handleItemClick(event)}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-[#3a3a3a]">{event.title}</h4>
                            <div className="flex space-x-1">
                              <Badge variant="outline" className={getStatusColor(event.status || 'Upcoming')}>
                                {event.status}
                              </Badge>
                              {event.priority && (
                                <Badge variant="outline" className={getPriorityColor(event.priority)}>
                                  {event.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {event.subTitle && (
                            <p className="text-sm font-medium text-[#1d8f5b] mb-1">
                              {event.subTitle}
                            </p>
                          )}
                          {event.content && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {event.content}
                            </p>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{dateTime.time} - {endDateTime.time}</span>
                              </div>
                              {event.domain && (
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {event.domain}
                                </span>
                              )}
                            </div>
                            {event.subject && (
                              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                <BookOpen className="h-4 w-4" />
                                <span>{event.subject}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No events scheduled for this date
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-[#1d8f5b]" />
                Upcoming Events
                <span className="ml-2 text-sm font-normal text-muted-foreground">(Chronological Order)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingEvents.length > 0 ? upcomingEvents.map(event => {
                  const dateTime = formatDateTime(event.startDateTime || '');
                  return (
                    <div 
                      key={event.id} 
                      onClick={() => handleItemClick(event)}
                      className="flex items-start space-x-3 p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer"
                    >
                      <div className={`flex-shrink-0 w-12 h-12 ${getCategoryBgColor(event.category || '')} rounded-lg flex items-center justify-center`}>
                        <span className={getCategoryColor(event.category || '')}>
                          {getCategoryIcon(event.category || '')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[#3a3a3a]">{event.title}</p>
                        {event.subTitle && (
                          <p className="text-xs text-[#1d8f5b] font-medium">{event.subTitle}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {dateTime.date} at {dateTime.time}
                        </p>
                        <div className="flex space-x-1 mt-1">
                          <Badge variant="outline" className={getStatusColor(event.status || 'Upcoming')}>
                            {event.status}
                          </Badge>
                          {event.domain && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                              {event.domain}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-muted-foreground text-center py-4">
                    No upcoming sessions scheduled
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Calendar;