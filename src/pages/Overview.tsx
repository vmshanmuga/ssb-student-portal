import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  ClipboardList,
  Clock,
  Megaphone,
  FolderOpen,
  Calendar,
  TrendingUp,
  BookOpen,
  Users,
  AtSign,
  Video
} from 'lucide-react';
import { apiService, type DashboardData, type ContentItem } from '../services/api';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';
import { formatDateTime, parseDate } from '../utils/dateUtils';
import { Session, SSBCalendarEvent } from '../types';
import { api as zoomApiService } from '../zoom/services/api';

// Union type for display items
type DisplayItem = ContentItem | {
  id: string;
  title: string;
  subTitle: string;
  startDateTime: string;
  createdAt?: string;
  category: string;
  status: string;
  session?: Session;
  eventType?: string;
  eventTitle?: string;
  policyName?: string;
  groups?: string;
};

const Overview: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [liveSessions, setLiveSessions] = useState<Session[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [recordings, setRecordings] = useState<Session[]>([]);
  const [ssbCalendarEvents, setSsbCalendarEvents] = useState<SSBCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    fetchDashboardData();
    fetchSessionsData();
    fetchCalendarEvents();
  }, []);

  const fetchSessionsData = async () => {
    try {
      if (!user?.email) return;

      // Fetch all live sessions from Zoom Live sheet
      const liveResult = await zoomApiService.getLiveSessions();
      if (liveResult.success && liveResult.data) {
        const allSessions = liveResult.data.sessions || [];

        // Separate into live and upcoming based on current time
        const now = new Date();
        const live: Session[] = [];
        const upcoming: Session[] = [];

        allSessions.forEach((session: Session) => {
          if (!session.date || !session.startTime) return;

          try {
            // Parse session date and time
            const dateParts = session.date.split('-');
            const monthMap: { [key: string]: number } = {
              'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
              'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
            };

            if (dateParts.length !== 3) return;

            const day = parseInt(dateParts[0]);
            const month = monthMap[dateParts[1]];
            const year = parseInt(dateParts[2]);

            // Parse start time
            const timeMatch = session.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!timeMatch) return;

            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const period = timeMatch[3].toUpperCase();

            // Convert to 24-hour format
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;

            const startDate = new Date(year, month, day, hours, minutes);
            const durationMinutes = typeof session.duration === 'number'
              ? session.duration
              : parseInt(String(session.duration)) || 0;
            const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

            // Check if session is live or upcoming
            if (now >= startDate && now <= endDate) {
              live.push(session);
            } else if (now < startDate) {
              upcoming.push(session);
            }
          } catch (error) {
            console.error('Error parsing session time:', error);
          }
        });

        setLiveSessions(live);
        setUpcomingSessions(upcoming);
      }

      // Fetch recordings
      const recordingsResult = await zoomApiService.getRecordings();
      if (recordingsResult.success && recordingsResult.data) {
        setRecordings(recordingsResult.data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions data:', error);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      if (!user?.email) return;

      // Get student batch for filtering
      let studentBatch: string | undefined;
      try {
        const studentResult = await zoomApiService.getStudent(user.email);
        if (studentResult.success && studentResult.data?.student) {
          studentBatch = studentResult.data.student.batch;
        }
      } catch (err) {
        console.warn('Overview: Could not fetch student batch:', err);
      }

      // Fetch SSB calendar events
      const calendarResult = await zoomApiService.getCalendarEvents(studentBatch);
      if (calendarResult.success && calendarResult.data) {
        setSsbCalendarEvents(calendarResult.data.events || []);
        console.log('Overview: SSB calendar events loaded:', calendarResult.data.events.length);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      console.log('Dashboard: Starting to load data...');
      setLoading(true);

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

  // Helper function to check if item is within 72 hours from start time
  const isWithin72Hours = (startDateTime: string): boolean => {
    const startDate = parseDate(startDateTime);
    if (!startDate) return false;

    const now = new Date();
    const hoursDiff = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 72;
  };

  // Convert Session to a display item format
  const convertSessionToDisplayItem = (session: Session, isLive: boolean = false) => {
    // Combine date and time into a single datetime string
    // Backend provides date in "DD-MMM-YYYY" format (e.g., "10-Nov-2025")
    // Backend provides startTime in "HH:MM AM/PM" format (e.g., "11:00 AM")
    let combinedDateTime = '';
    if (session.date && session.startTime) {
      // Convert "10-Nov-2025" to "10/11/2025" and combine with time
      const dateParts = session.date.split('-');
      const monthMap: { [key: string]: string } = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      if (dateParts.length === 3) {
        const day = dateParts[0];
        const month = monthMap[dateParts[1]] || '01';
        const year = dateParts[2];
        combinedDateTime = `${day}/${month}/${year} ${session.startTime}`;
      }
    }

    return {
      id: session.sessionId,
      title: session.topic || session.sessionName,
      subTitle: `${session.batch || ''} ${session.subject || ''}`.trim(),
      startDateTime: combinedDateTime || session.startTime || session.date || '',
      category: 'SESSIONS',
      status: isLive ? 'Active' : 'Upcoming',
      session: session
    };
  };

  // Helper to check if a session is currently live
  const isSessionLiveNow = (session: Session): boolean => {
    if (!session.date || !session.startTime) return false;

    try {
      // Parse the date and time
      const dateParts = session.date.split('-');
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };

      if (dateParts.length !== 3) return false;

      const day = parseInt(dateParts[0]);
      const month = monthMap[dateParts[1]];
      const year = parseInt(dateParts[2]);

      // Parse start time (e.g., "11:00 AM")
      const timeMatch = session.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeMatch) return false;

      let hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      const period = timeMatch[3].toUpperCase();

      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      // Create start date object
      const startDate = new Date(year, month, day, hours, minutes);

      // Calculate end date by adding duration
      const durationMinutes = typeof session.duration === 'number'
        ? session.duration
        : parseInt(String(session.duration)) || 0;
      const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

      // Check if current time is between start and end
      const now = new Date();
      return now >= startDate && now <= endDate;
    } catch (error) {
      console.error('Error checking if session is live:', error);
      return false;
    }
  };

  // Get 1 live session + 2 upcoming sessions from Zoom
  // Find the session that's actually live right now
  const actuallyLiveSession = liveSessions.find(session => isSessionLiveNow(session));
  const liveSessionItem = actuallyLiveSession
    ? [convertSessionToDisplayItem(actuallyLiveSession, true)]
    : [];

  // Sort upcoming sessions by start time (earliest first) and take first 2
  const sortedUpcoming = [...upcomingSessions].sort((a, b) => {
    try {
      const parseSessionDateTime = (session: Session): Date | null => {
        if (!session.date || !session.startTime) return null;

        const dateParts = session.date.split('-');
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };

        if (dateParts.length !== 3) return null;

        const day = parseInt(dateParts[0]);
        const month = monthMap[dateParts[1]];
        const year = parseInt(dateParts[2]);

        const timeMatch = session.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!timeMatch) return null;

        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        return new Date(year, month, day, hours, minutes);
      };

      const dateA = parseSessionDateTime(a);
      const dateB = parseSessionDateTime(b);

      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime(); // Ascending order (earliest first)
    } catch (error) {
      return 0;
    }
  });

  const upcomingSessionItems = sortedUpcoming.slice(0, 2).map(s => convertSessionToDisplayItem(s, false));

  // Filter content items within 72 hours
  const contentItems = dashboardData.content
    .filter(item => {
      if (!item.startDateTime) return false;
      if (item.category === 'STUDENTS CORNER') return false;

      // Check if within 72 hours
      if (!isWithin72Hours(item.startDateTime)) return false;

      // Include Active or Upcoming items
      return item.status === 'Active' || item.status === 'Upcoming';
    })
    .sort((a, b) => {
      const dateA = parseDate(a.startDateTime);
      const dateB = parseDate(b.startDateTime);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });

  // Helper to generate unique ID from event fields
  const generateUniqueEventId = (event: SSBCalendarEvent): string => {
    const fields = [
      event.batch || '',
      event.eventType || '',
      event.eventName || '',
      event.startDate || '',
      event.startTime || '',
      event.eventId || ''
    ];

    // Take last 4 chars of each field and combine
    const uniqueParts = fields
      .map(field => field.toString().slice(-4).replace(/[^a-zA-Z0-9]/g, ''))
      .filter(part => part.length > 0)
      .join('-');

    return `ssb-cal-${uniqueParts}`;
  };

  // Convert SSB Calendar Events to DisplayItems
  const convertCalendarEventToDisplayItem = (event: SSBCalendarEvent): DisplayItem | null => {
    const parseEventDateTime = (dateStr: string, timeStr: string): Date | null => {
      try {
        if (!dateStr || !timeStr) return null;

        const dateParts = dateStr.split('-');
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };

        if (dateParts.length !== 3) return null;

        const day = parseInt(dateParts[0]);
        const month = monthMap[dateParts[1]];
        const year = parseInt(dateParts[2]);

        if (isNaN(day) || month === undefined || isNaN(year)) return null;

        const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (!timeMatch) return null;

        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const period = timeMatch[3]?.toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        const dateObj = new Date(year, month, day, hours, minutes);
        if (isNaN(dateObj.getTime())) return null;

        return dateObj;
      } catch (error) {
        return null;
      }
    };

    const startDate = parseEventDateTime(event.startDate, event.startTime);
    const endDate = parseEventDateTime(event.endDate, event.endTime);

    if (!startDate || !endDate) return null;

    // Determine status
    const now = new Date();
    let status = 'Upcoming';
    if (now >= startDate && now <= endDate) {
      status = 'Active';
    } else if (now > endDate) {
      status = 'Expired';
    }

    // Determine category based on event type
    let category = 'SSB EVENT';
    const type = event.eventType.toLowerCase();
    if (type.includes('session')) category = 'SSB SESSION';
    else if (type.includes('assessment') || type.includes('quiz')) category = 'SSB ASSESSMENT';
    else if (type.includes('others') || type.includes('other')) category = 'SSB OTHERS';

    return {
      id: generateUniqueEventId(event), // Generate unique ID from multiple fields
      title: event.eventName,
      subTitle: event.eventType,
      startDateTime: startDate.toISOString(),
      category,
      status,
      eventType: event.eventType,
      eventTitle: event.eventName
    };
  };

  // Filter SSB calendar events for live/upcoming within 72 hours
  const ssbCalendarItems = ssbCalendarEvents
    .map(convertCalendarEventToDisplayItem)
    .filter((item): item is DisplayItem => {
      if (!item) return false;
      if (!item.startDateTime) return false;
      if (!isWithin72Hours(item.startDateTime)) return false;
      return item.status === 'Active' || item.status === 'Upcoming';
    })
    .sort((a, b) => {
      const dateA = parseDate(a.startDateTime);
      const dateB = parseDate(b.startDateTime);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });

  // Combine: 1 live session + 2 upcoming sessions + SSB calendar items + other content items (up to 10 total)
  const liveAndUpcomingItems = [
    ...liveSessionItem,
    ...upcomingSessionItems,
    ...ssbCalendarItems,
    ...contentItems
  ].slice(0, 10);

  // Helper to combine date and time for checking 72-hour window
  const getCombinedDateTime = (session: Session): string => {
    if (!session.date || !session.startTime) {
      return session.startTime || session.date || '';
    }

    // Check if date is in ISO format (from recordings) or DD-MMM-YYYY format (from live sessions)
    try {
      // Try parsing as ISO date first (recordings format)
      const isoDate = new Date(session.date);
      if (!isNaN(isoDate.getTime()) && session.date.includes('T')) {
        // It's an ISO date, format it to DD/MM/YYYY
        const day = isoDate.getDate().toString().padStart(2, '0');
        const month = (isoDate.getMonth() + 1).toString().padStart(2, '0');
        const year = isoDate.getFullYear();
        return `${day}/${month}/${year} ${session.startTime}`;
      }
    } catch (error) {
      // Not an ISO date, continue with DD-MMM-YYYY parsing
    }

    // Parse DD-MMM-YYYY format (live sessions format)
    const dateParts = session.date.split('-');
    const monthMap: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    if (dateParts.length === 3) {
      const day = dateParts[0];
      const month = monthMap[dateParts[1]] || '01';
      const year = dateParts[2];
      return `${day}/${month}/${year} ${session.startTime}`;
    }

    return session.startTime || session.date || '';
  };

  // Recent Postings: 2 latest recordings + other recent content within 72 hours
  // Fallback: If none within 72 hours, show recent items without time filter
  const recentRecordingItemsWithin72hrs = recordings
    .slice(0, 2)
    .filter(r => {
      const combinedDateTime = getCombinedDateTime(r);
      return combinedDateTime && isWithin72Hours(combinedDateTime);
    })
    .map(r => ({
      id: r.sessionId,
      title: r.topic || r.sessionName,
      subTitle: `${r.batch || ''} ${r.subject || ''}`.trim(),
      startDateTime: getCombinedDateTime(r),
      createdAt: getCombinedDateTime(r),
      category: 'RECORDING',
      status: 'Completed',
      session: r
    }));

  const otherRecentContentWithin72hrs = dashboardData.content
    .filter(item => {
      if (item.category === 'STUDENTS CORNER') return false;
      if (!item.startDateTime && !item.createdAt) return false;

      const dateToCheck = item.createdAt || item.startDateTime;
      return isWithin72Hours(dateToCheck);
    })
    .sort((a, b) => {
      const dateA = parseDate(a.createdAt || a.startDateTime);
      const dateB = parseDate(b.createdAt || b.startDateTime);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime();
    });

  let recentPostings = [...recentRecordingItemsWithin72hrs, ...otherRecentContentWithin72hrs].slice(0, 10);

  // Fallback: If no items within 72 hours, show recent items without time restriction
  if (recentPostings.length === 0) {
    const fallbackRecordingItems = recordings.slice(0, 2).map(r => ({
      id: r.sessionId,
      title: r.topic || r.sessionName,
      subTitle: `${r.batch || ''} ${r.subject || ''}`.trim(),
      startDateTime: getCombinedDateTime(r),
      createdAt: getCombinedDateTime(r),
      category: 'RECORDING',
      status: 'Completed',
      session: r
    }));

    const fallbackOtherContent = dashboardData.content
      .filter(item => {
        if (item.category === 'STUDENTS CORNER') return false;
        return !!(item.startDateTime || item.createdAt);
      })
      .sort((a, b) => {
        const dateA = parseDate(a.createdAt || a.startDateTime);
        const dateB = parseDate(b.createdAt || b.startDateTime);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      });

    recentPostings = [...fallbackRecordingItems, ...fallbackOtherContent].slice(0, 10);
  }

  // Navigation handler based on category
  const handleItemClick = (item: DisplayItem) => {
    switch (item.category) {
      case 'SESSIONS':
      case 'SSB SESSION':
        // Navigate to Live & Upcoming tab (default)
        navigate('/sessions');
        break;
      case 'RECORDING':
        // Navigate to Recordings tab
        navigate('/sessions?tab=recordings');
        break;
      case 'EVENTS':
      case 'SSB EVENT':
      case 'SSB ASSESSMENT':
      case 'SSB OTHERS':
        navigate('/calendar');
        break;
      case 'ANNOUNCEMENTS':
        navigate('/announcements');
        break;
      case 'ASSIGNMENTS & TASKS':
        navigate('/assignments');
        break;
      case 'STUDENTS CORNER':
        navigate('/students-corner');
        break;
      case 'POLICY & DOCUMENTS':
        navigate('/policy-documents');
        break;
      default:
        navigate('/overview');
    }
  };

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
            <button 
              className="w-full flex items-center p-3 text-left border rounded-lg hover:bg-accent transition-colors"
              onClick={() => navigate('/students-corner')}
            >
              <Users className="mr-3 h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Students Corner</p>
                <p className="text-xs text-muted-foreground">Community activities</p>
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
              <div
                key={item.id}
                className={`flex items-center space-x-4 p-3 border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors ${
                  item.status === 'Active'
                    ? 'bg-green-500/10 dark:bg-green-500/20 border-green-500/50 dark:border-green-500/60'
                    : ''
                }`}
                onClick={() => handleItemClick(item)}
              >
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    {item.category === 'SESSIONS' || item.category === 'RECORDING' || item.category === 'SSB SESSION' ? (
                      <Video className="h-5 w-5 text-blue-600" />
                    ) : item.category === 'EVENTS' || item.category === 'SSB EVENT' ? (
                      <Calendar className="h-5 w-5 text-purple-600" />
                    ) : item.category === 'SSB ASSESSMENT' ? (
                      <ClipboardList className="h-5 w-5 text-orange-600" />
                    ) : item.category === 'SSB OTHERS' ? (
                      <Calendar className="h-5 w-5 text-gray-600" />
                    ) : item.category === 'ANNOUNCEMENTS' ? (
                      <Megaphone className="h-5 w-5 text-blue-600" />
                    ) : item.category === 'ASSIGNMENTS & TASKS' ? (
                      <ClipboardList className="h-5 w-5 text-green-600" />
                    ) : item.category === 'STUDENTS CORNER' && ('eventType' in item) && item.eventType === 'MENTION' ? (
                      <AtSign className="h-5 w-5 text-red-600" />
                    ) : item.category === 'STUDENTS CORNER' ? (
                      <Users className="h-5 w-5 text-orange-600" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium">
                      {item.category === 'SESSIONS' || item.category === 'RECORDING'
                        ? item.title
                        : item.category === 'EVENTS' && 'eventTitle' in item
                        ? (item.eventTitle || ('eventType' in item ? item.eventType : '') || item.title)
                        : item.category === 'POLICY & DOCUMENTS' && 'policyName' in item
                        ? (item.policyName || item.title)
                        : item.title}
                    </p>
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
                    {'groups' in item && item.groups && (
                      <span className="text-xs text-muted-foreground">
                        {item.groups}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="outline">
                  {item.category === 'RECORDING' ? 'Recording' : item.category === 'SESSIONS' ? 'Sessions' : item.category}
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
              <div
                key={item.id}
                className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    {item.category === 'SESSIONS' || item.category === 'RECORDING' ? (
                      <Video className="h-4 w-4 text-red-600" />
                    ) : item.category === 'EVENTS' ? (
                      <Calendar className="h-4 w-4 text-purple-600" />
                    ) : item.category === 'ANNOUNCEMENTS' ? (
                      <Megaphone className="h-4 w-4 text-blue-600" />
                    ) : item.category === 'ASSIGNMENTS & TASKS' ? (
                      <ClipboardList className="h-4 w-4 text-green-600" />
                    ) : item.category === 'STUDENTS CORNER' && ('eventType' in item) && item.eventType === 'MENTION' ? (
                      <AtSign className="h-4 w-4 text-red-600" />
                    ) : item.category === 'STUDENTS CORNER' ? (
                      <Users className="h-4 w-4 text-orange-600" />
                    ) : (
                      <BookOpen className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium truncate">
                      {item.category === 'SESSIONS' || item.category === 'RECORDING'
                        ? item.title
                        : item.category === 'EVENTS' && 'eventTitle' in item
                        ? (item.eventTitle || ('eventType' in item ? item.eventType : '') || item.title)
                        : item.category === 'POLICY & DOCUMENTS' && 'policyName' in item
                        ? (item.policyName || item.title)
                        : item.title}
                    </h4>
                    <Badge variant="outline" className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.subTitle}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {item.category === 'RECORDING' ? 'Recording' : item.category === 'SESSIONS' ? 'Sessions' : item.category}
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

export default Overview;