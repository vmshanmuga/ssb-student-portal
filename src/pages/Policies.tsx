import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  FileText,
  Filter,
  Search,
  Download,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { apiService, type ContentItem } from '../services/api';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';

const Policies: React.FC = () => {
  const [policies, setPolicies] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const user = auth.currentUser;

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true);
        
        if (!user?.email) {
          toast.error('No user email found');
          return;
        }

        // Get all content from the dashboard (which includes POLICY & DOCUMENTS)
        const dashboardResult = await apiService.getStudentDashboard(user.email);
        
        if (!dashboardResult.success) {
          toast.error(`Error: ${dashboardResult.error || 'Unknown error'}`);
          return;
        }

        // Filter for POLICY & DOCUMENTS category
        const policyItems = (dashboardResult.data?.content || []).filter(item => 
          item.category === 'POLICY & DOCUMENTS'
        );
        
        setPolicies(policyItems);
        
        if (policyItems.length === 0) {
          toast('No policies or documents found for your batch');
        } else {
          toast.success(`Loaded ${policyItems.length} policies and documents`);
        }
        
      } catch (error) {
        console.error('Error fetching policies:', error);
        toast.error('Failed to load policies and documents');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  const filteredPolicies = policies
    .filter(policy => {
      const matchesSearch = policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (policy.subTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (policy.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (policy.policyType || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || policy.status === statusFilter;
      const matchesType = typeFilter === 'all' || (policy.policyType || policy.eventType) === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => a.title.localeCompare(b.title));

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Academic': return 'bg-[#1d8f5b]/10 text-[#1d8f5b] border-[#1d8f5b]/20';
      case 'Administrative': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Code of Conduct': return 'bg-red-100 text-red-800 border-red-200';
      case 'Guidelines': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Forms': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDownload = (policy: ContentItem) => {
    if (policy.driveLink) {
      window.open(policy.driveLink, '_blank');
    } else if (policy.sheetsLink) {
      window.open(policy.sheetsLink, '_blank');
    } else if (policy.fileuploadLink) {
      window.open(policy.fileuploadLink, '_blank');
    } else {
      toast.error('No download link available');
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const policyDate = new Date(date);
    const diffTime = now.getTime() - policyDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return policyDate.toLocaleDateString();
  };

  const uniqueStatuses = Array.from(new Set(policies.map(p => p.status).filter(Boolean)));
  const uniqueTypes = Array.from(new Set(policies.map(p => p.policyType || p.eventType).filter(Boolean)));

  const PolicyCard = ({ policy }: { policy: ContentItem }) => (
    <Card className="hover:shadow-md transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-5 w-5 text-[#1d8f5b]" />
              <CardTitle className="text-lg">{policy.title}</CardTitle>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="outline" className={getStatusColor(policy.status)}>
                {policy.status}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(policy.priority)}>
                {policy.priority} Priority
              </Badge>
              {(policy.policyType || policy.eventType) && (
                <Badge variant="outline" className={getTypeColor(policy.policyType || policy.eventType)}>
                  {policy.policyType || policy.eventType}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{getTimeAgo(policy.createdAt)}</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {policy.subTitle && (
            <p className="font-medium text-[#1d8f5b]">{policy.subTitle}</p>
          )}
          
          {policy.content && (
            <p className="text-muted-foreground leading-relaxed">{policy.content}</p>
          )}

          {policy.policyContent && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Policy Details:</h4>
              <p className="text-sm text-muted-foreground">{policy.policyContent}</p>
            </div>
          )}

          {policy.requiresAcknowledgment && (
            <div className="flex items-center space-x-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Acknowledgment Required</span>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{policy.postedBy || 'Admin'}</span>
              {policy.editedAt && policy.editedBy && (
                <>
                  <span>•</span>
                  <span>Updated by {policy.editedBy}</span>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {policy.hasFiles && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(policy)}
                  className="text-[#1d8f5b] border-[#1d8f5b] hover:bg-[#1d8f5b] hover:text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
              <FileText className="h-5 w-5 text-[#1d8f5b]" />
              <div>
                <p className="text-2xl font-bold text-[#3a3a3a]">{policies.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-[#3a3a3a]">
                  {policies.filter(p => p.status === 'Active').length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold text-[#3a3a3a]">
                  {policies.filter(p => p.requiresAcknowledgment).length}
                </p>
                <p className="text-sm text-muted-foreground">Need Action</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-[#3a3a3a]">
                  {policies.filter(p => p.hasFiles).length}
                </p>
                <p className="text-sm text-muted-foreground">With Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
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
                  placeholder="Search policies and documents..."
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
                <option value="all">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              
              <select
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Policies Grid */}
      <div className="space-y-4">
        {filteredPolicies.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} />
        ))}
      </div>

      {filteredPolicies.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No policies or documents found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Policies;