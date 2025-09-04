export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Not Started' | 'In Progress' | 'Completed';
  progress: number;
  subject: string;
  category: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  isRead: boolean;
  category: string;
  author: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'Document' | 'Video' | 'Link' | 'Image';
  url: string;
  category: string;
  dateAdded: string;
  size?: string;
  downloads: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  type: 'Class' | 'Assignment' | 'Exam' | 'Event';
  location?: string;
  duration: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  batch: string;
  rollNo: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  address?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    emailUpdates: boolean;
  };
}

export interface DashboardStats {
  totalAssignments: number;
  completedAssignments: number;
  completionRate: number;
  upcomingDeadlines: number;
  unreadAnnouncements: number;
  totalResources: number;
  upcomingEvents: number;
}