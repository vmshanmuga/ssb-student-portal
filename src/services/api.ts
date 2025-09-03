// Backend API service - New authorized web app deployment
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycby5y9sfgiO1kx_FOoRcCCODtqwxfY_U8YizABmjT46_Bwiy1muPYWY3DFqvI3T3T_MC/exec';

export interface StudentProfile {
  email: string;
  fullName: string;
  rollNo: string;
  batch: string;
  options: string[];
}

export interface ContentItem {
  id: string;
  category: string;
  eventType: string;
  title: string;
  subTitle: string;
  content?: string;
  priority: string;
  status: string;
  term?: string;
  subject?: string;
  groups?: string;
  postedBy?: string;
  createdAt: string;
  startDateTime: string;
  endDateTime: string;
  targetBatch?: string;
  requiresAcknowledgment: boolean;
  driveLink?: string;
  sheetsLink?: string;
  hasFiles: boolean;
  isNew: boolean;
  daysUntilDeadline: number | null;
  files?: Array<{
    url: string;
    name: string;
  }>;
}

export interface DashboardStats {
  total: number;
  active: number;
  upcoming: number;
  requiresAck: number;
}

export interface DashboardData {
  student: StudentProfile;
  content: ContentItem[];
  stats: DashboardStats;
  lastSync: string;
}

export interface ContentDetails extends ContentItem {
  targetStudents?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private async makeRequest<T>(action: string, params: Record<string, any> = {}): Promise<ApiResponse<T>> {
    try {
      // Filter out undefined/null values
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      );

      const queryParams = new URLSearchParams({
        action,
        ...cleanParams
      });

      const response = await fetch(`${BACKEND_URL}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Test connection
  async testConnection(): Promise<ApiResponse<any>> {
    return this.makeRequest('test');
  }

  // Get API health
  async getAPIHealth(): Promise<ApiResponse<any>> {
    return this.makeRequest('getAPIHealth');
  }

  // Get student dashboard
  async getStudentDashboard(studentEmail: string, lastSync?: string): Promise<ApiResponse<DashboardData>> {
    return this.makeRequest<DashboardData>('getStudentDashboard', {
      studentEmail,
      ...(lastSync && { lastSync })
    });
  }

  // Get content details
  async getContentDetails(contentId: string, studentEmail: string): Promise<ApiResponse<ContentDetails>> {
    return this.makeRequest<ContentDetails>('getContentDetails', {
      contentId,
      studentEmail
    });
  }

  // Submit acknowledgment
  async submitAcknowledgment(
    contentId: string, 
    studentEmail: string, 
    response: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.makeRequest('submitAcknowledgment', {
      contentId,
      studentEmail,
      response
    });
  }

  // Get student profile
  async getStudentProfile(studentEmail: string): Promise<ApiResponse<StudentProfile>> {
    return this.makeRequest<StudentProfile>('getStudentProfile', {
      studentEmail
    });
  }

  // Get upcoming deadlines
  async getUpcomingDeadlines(studentEmail: string): Promise<ApiResponse<ContentItem[]>> {
    return this.makeRequest<ContentItem[]>('getUpcomingDeadlines', {
      studentEmail
    });
  }

  // Mark content as read
  async markContentAsRead(contentId: string, studentEmail: string): Promise<ApiResponse<any>> {
    return this.makeRequest('markContentAsRead', {
      contentId,
      studentEmail
    });
  }

  // Get filtered content (if you implement this later)
  async getFilteredContent(
    studentEmail: string,
    filters: {
      category?: string;
      eventType?: string;
      status?: string;
      priority?: string;
      requiresAcknowledgment?: boolean;
      hasFiles?: boolean;
      search?: string;
      dateRange?: {
        start: string;
        end: string;
      };
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<ApiResponse<{
    content: ContentItem[];
    totalCount: number;
    filteredCount: number;
  }>> {
    return this.makeRequest('getFilteredStudentContent', {
      studentEmail,
      ...filters
    });
  }
}

export const apiService = new ApiService();