import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { DocumentGridSkeleton } from '../components/ui/loading-skeletons';
import { 
  FileText,
  Filter,
  Search,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle,
  X,
  ExternalLink,
  File
} from 'lucide-react';
import { apiService, type ContentItem } from '../services/api';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';

// Modal component for policy details
const PolicyModal = ({ policy, isOpen, onClose }: { 
  policy: ContentItem | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  const [loading, setLoading] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const formatPublishedDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return dateString;
    }
  };

  const getPolicyTypeBadgeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'policy':
        return 'bg-[#1d8f5b] text-white border-[#1d8f5b]';
      case 'document':
        return 'bg-[#ffc300] text-[#3a3a3a] border-[#ffc300]';
      default:
        return 'bg-[#3a3a3a] text-white border-[#3a3a3a]';
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

  const handleDownload = async (url: string, filename: string = 'file') => {
    setLoading(true);
    try {
      window.open(url, '_blank');
      toast.success('Opening file...');
    } catch (error) {
      toast.error('Failed to open file');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !policy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="flex-1 pr-4">
            <h2 className="text-2xl font-bold text-[#3a3a3a] mb-3">
              {policy.policyName || policy.title}
            </h2>
            
            <div className="flex flex-wrap gap-2">
              <Badge className={getPolicyTypeBadgeColor(policy.policyType || 'policy')}>
                {policy.policyType || 'Policy'}
              </Badge>
              
              {policy.priority && (
                <Badge variant="outline" className={getPriorityColor(policy.priority)}>
                  {policy.priority} Priority
                </Badge>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Metadata */}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Published: {formatPublishedDate(policy.startDateTime)}</span>
            </div>

            {/* HTML Content */}
            {policy.policyContent && (
              <div className="border rounded-lg p-6 bg-muted/20">
                <div 
                  className="prose prose-sm max-w-none
                    prose-headings:text-[#3a3a3a]
                    prose-p:text-[#3a3a3a]
                    prose-strong:text-[#3a3a3a]
                    prose-ul:text-[#3a3a3a]
                    prose-ol:text-[#3a3a3a]
                    prose-li:text-[#3a3a3a]
                    prose-a:text-[#1d8f5b]
                    prose-a:hover:text-[#1d8f5b]/80"
                  dangerouslySetInnerHTML={{ __html: policy.policyContent }}
                />
              </div>
            )}

            {/* Files Section */}
            {(policy.driveLink || policy.fileuploadLink) && (
              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-[#3a3a3a] mb-4 flex items-center">
                  <File className="h-4 w-4 mr-2" />
                  Available Files
                </h4>
                
                <div className="space-y-3">
                  {policy.driveLink && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-[#1d8f5b]" />
                        <span className="font-medium">Document (Google Drive)</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(policy.driveLink!, 'document')}
                        disabled={loading}
                        className="bg-[#1d8f5b] hover:bg-[#1d8f5b]/90 text-white"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open
                      </Button>
                    </div>
                  )}
                  
                  {policy.fileuploadLink && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Download className="h-5 w-5 text-[#1d8f5b]" />
                        <span className="font-medium">Attachment</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleDownload(policy.fileuploadLink!, 'attachment')}
                        disabled={loading}
                        className="bg-[#1d8f5b] hover:bg-[#1d8f5b]/90 text-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Acknowledgment Notice */}
            {policy.requiresAcknowledgment && (
              <div className="flex items-center space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-800">Acknowledgment Required</p>
                  <p className="text-sm text-amber-700">This policy requires your acknowledgment.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-muted/20">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

const Policies: React.FC = () => {
  const [policies, setPolicies] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedPolicy, setSelectedPolicy] = useState<ContentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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
  }, [user?.email]);

  const filteredPolicies = policies
    .filter(policy => {
      const searchFields = [
        policy.policyName || policy.title,
        policy.policyType,
        policy.policyContent
      ].filter(Boolean);
      
      const matchesSearch = searchTerm === '' || searchFields.some(field => 
        field && field.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const matchesType = typeFilter === 'all' || policy.policyType === typeFilter;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      const titleA = a.policyName || a.title;
      const titleB = b.policyName || b.title;
      return titleA.localeCompare(titleB);
    });

  const formatPublishedDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return dateString;
    }
  };

  const getPolicyTypeBadgeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'policy':
        return 'bg-[#1d8f5b] text-white border-[#1d8f5b]';
      case 'document':
        return 'bg-[#ffc300] text-[#3a3a3a] border-[#ffc300]';
      default:
        return 'bg-[#3a3a3a] text-white border-[#3a3a3a]';
    }
  };

  const uniqueTypes = Array.from(new Set(policies.map(p => p.policyType).filter(Boolean)));

  const handleCardClick = (policy: ContentItem) => {
    setSelectedPolicy(policy);
    setModalOpen(true);
  };

  const PolicyCard = ({ policy }: { policy: ContentItem }) => (
    <Card 
      className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer border-l-4 border-l-[#1d8f5b]"
      onClick={() => handleCardClick(policy)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-[#3a3a3a] mb-3">
              {policy.policyName || policy.title}
            </CardTitle>
            
            <div className="flex flex-wrap gap-2">
              <Badge className={getPolicyTypeBadgeColor(policy.policyType || 'policy')}>
                {policy.policyType || 'Policy'}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground ml-4">
            <Calendar className="h-4 w-4" />
            <span className="text-right">
              {formatPublishedDate(policy.startDateTime)}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Content preview */}
          {policy.policyContent && (
            <div className="text-sm text-muted-foreground">
              <div 
                className="line-clamp-2"
                dangerouslySetInnerHTML={{ 
                  __html: policy.policyContent.replace(/<[^>]*>/g, '').substring(0, 150) + '...' 
                }}
              />
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-end pt-3 border-t">
            <div className="flex items-center space-x-2">
              {(policy.driveLink || policy.fileuploadLink) && (
                <div className="flex items-center space-x-1 text-sm text-[#1d8f5b]">
                  <Download className="h-4 w-4" />
                  <span>Files available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <DocumentGridSkeleton />;
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
                  {policies.filter(p => p.policyType?.toLowerCase() === 'policy').length}
                </p>
                <p className="text-sm text-muted-foreground">Policies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <File className="h-5 w-5 text-[#ffc300]" />
              <div>
                <p className="text-2xl font-bold text-[#3a3a3a]">
                  {policies.filter(p => p.policyType?.toLowerCase() === 'document').length}
                </p>
                <p className="text-sm text-muted-foreground">Documents</p>
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
                  {policies.filter(p => p.driveLink || p.fileuploadLink).length}
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
            Search & Filter
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
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-[#1d8f5b] focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <select
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-[#1d8f5b]"
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
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
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

      {/* Policy Modal */}
      <PolicyModal 
        policy={selectedPolicy}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedPolicy(null);
        }}
      />
    </div>
  );
};

export default Policies;