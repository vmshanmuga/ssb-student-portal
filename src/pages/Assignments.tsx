import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  ClipboardList, 
  Filter, 
  Search, 
  Calendar,
  Clock,
  FileText
} from 'lucide-react';
import { apiService, type DashboardData, type ContentItem } from '../services/api';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';

const Assignments: React.FC = () => {
  const [assignments, setAssignments] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'endDateTime' | 'priority' | 'status'>('endDateTime');
  const user = auth.currentUser;

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
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

      // Filter for assignments and tasks
      const assignmentItems = result.data!.content.filter(item => 
        item.category === 'ASSIGNMENTS & TASKS'
      );
      
      setAssignments(assignmentItems);
      
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments
    .filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (assignment.subTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (assignment.subject || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || assignment.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'endDateTime':
          return new Date(a.endDateTime).getTime() - new Date(b.endDateTime).getTime();
        case 'priority':
          const priorityOrder: {[key: string]: number} = { 'High': 3, 'Medium': 2, 'Low': 1 };
          return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Not Started': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const AssignmentCard = ({ assignment }: { assignment: ContentItem }) => {
    
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">{assignment.title}</CardTitle>
              <p className="text-sm text-muted-foreground mb-3">{assignment.subTitle}</p>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className={getPriorityColor(assignment.priority)}>
                  {assignment.priority} Priority
                </Badge>
                <Badge variant="outline" className={getStatusColor(assignment.status)}>
                  {assignment.status}
                </Badge>
                {assignment.subject && (
                  <Badge variant="outline">
                    {assignment.subject}
                  </Badge>
                )}
                <Badge variant="outline">
                  {assignment.eventType || assignment.category}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Due Date and Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Due: {new Date(assignment.endDateTime).toLocaleDateString()}</span>
              </div>
              
              {assignment.daysUntilDeadline !== null && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className={`text-sm ${
                    assignment.daysUntilDeadline <= 3 ? 'text-red-600 font-medium' :
                    assignment.daysUntilDeadline <= 7 ? 'text-yellow-600' : 'text-muted-foreground'
                  }`}>
                    {assignment.daysUntilDeadline > 0 ? `${assignment.daysUntilDeadline} days left` : 
                     assignment.daysUntilDeadline === 0 ? 'Due today' : 'Overdue'}
                  </span>
                </div>
              )}
            </div>

            {/* Additional Info */}
            {(assignment.term || assignment.groups) && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {assignment.term && (
                  <div>
                    <span className="text-muted-foreground">Term:</span>
                    <p className="font-medium">{assignment.term}</p>
                  </div>
                )}
                {assignment.groups && (
                  <div>
                    <span className="text-muted-foreground">Groups:</span>
                    <p className="font-medium">{assignment.groups}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2 pt-2 border-t">
              <Button size="sm" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                View Details
              </Button>
              {assignment.hasFiles && (
                <Button size="sm" variant="outline">
                  Files
                </Button>
              )}
              {assignment.requiresAcknowledgment && (
                <Button size="sm" variant="outline">
                  Acknowledge
                </Button>
              )}
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
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
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
                  {assignments.filter(a => a.status === 'Active').length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 bg-green-600 rounded" />
              <div>
                <p className="text-2xl font-bold">
                  {assignments.filter(a => a.status === 'Completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-5 w-5 bg-red-600 rounded" />
              <div>
                <p className="text-2xl font-bold">
                  {assignments.filter(a => a.daysUntilDeadline !== null && a.daysUntilDeadline <= 7).length}
                </p>
                <p className="text-sm text-muted-foreground">Due Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search assignments..."
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
              
              <select
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priority</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
              
              <select
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="endDateTime">Sort by Due Date</option>
                <option value="priority">Sort by Priority</option>
                <option value="status">Sort by Status</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {filteredAssignments.map((assignment) => (
          <AssignmentCard key={assignment.id} assignment={assignment} />
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No assignments found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Assignments;