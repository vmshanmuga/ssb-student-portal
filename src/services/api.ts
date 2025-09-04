// Backend API service - New authorized web app deployment
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbxeHJsLq9_X8kivAPW35v5DY3IULTKwzqhnD2FPP6tlIhYCnYYdPHwdFoM6VAikqhI7/exec';

export interface StudentProfile {
  email: string;
  fullName: string;
  rollNo: string;
  batch: string;
  options?: string[];
}

export interface FullStudentProfile {
  email: string;
  fullName: string;
  rollNo: string;
  batch: string;
  aboutMe: string;
  phoneNo: string;
  currentLocation: string;
  linkedIn: string;
  portfolioLink: string;
  github: string;
  undergraduateCollege: string;
  undergraduateStream: string;
  graduationYear: string;
  previousCompany: string;
  previousRole: string;
  previousDuration: string;
  techSkills: string;
  softSkills: string;
  achievements: string;
  certifications: string;
  interests: string;
  languages: string;
  profilePicture: string;
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
        mode: 'cors',
        // Remove Content-Type header to avoid preflight request
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

  // Get full student profile
  async getFullStudentProfile(studentEmail: string): Promise<ApiResponse<FullStudentProfile>> {
    return this.makeRequest<FullStudentProfile>('getFullStudentProfile', {
      studentEmail
    });
  }

  // Update student profile
  async updateStudentProfile(
    studentEmail: string, 
    profileData: Partial<FullStudentProfile>
  ): Promise<ApiResponse<FullStudentProfile>> {
    return this.makeRequest<FullStudentProfile>('updateStudentProfile', {
      studentEmail,
      profileData: JSON.stringify(profileData)
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

  // Get dashboard links
  async getDashboardLinks(studentEmail: string): Promise<ApiResponse<Array<{name: string, link: string, description: string, type: string, category?: string, eventType?: string}>>> {
    return this.makeRequest('getDashboardLinks', {
      studentEmail
    });
  }

  // Upload profile picture
  async uploadProfilePicture(studentEmail: string, imageFile: File): Promise<ApiResponse<{ profilePictureUrl: string }>> {
    try {
      // Convert file to base64
      const base64String = await this.fileToBase64(imageFile);
      
      // Use POST request with URL-encoded form data
      const formBody = new URLSearchParams();
      formBody.append('action', 'uploadProfilePicture');
      formBody.append('studentEmail', studentEmail);
      formBody.append('imageData', base64String);
      formBody.append('fileName', imageFile.name);
      formBody.append('mimeType', imageFile.type);

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody.toString(),
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload profile picture'
      };
    }
  }

  // Helper method to convert file to base64
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (data:image/jpeg;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
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