import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  FolderOpen, 
  Filter, 
  Search, 
  Download,
  FileText,
  Video,
  Link,
  Image,
  Calendar,
  Eye,
  Grid,
  List,
  ChevronRight,
  Home,
  ArrowLeft,
  Loader2,
  AlertCircle,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import { apiService, type ContentItem } from '../services/api';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';

// Types for the dynamic folder structure
interface CourseResourcesData {
  availableTerms: string[];
  folderStructure: Record<string, {
    domains: Record<string, {
      subjects: Record<string, ContentItem[]>;
    }>;
  }>;
  flatMaterials: ContentItem[];
}

interface NavigationLevel {
  type: 'root' | 'term' | 'domain' | 'subject';
  term?: string;
  domain?: string;
  subject?: string;
  label: string;
}

const Resources: React.FC = () => {
  const [courseData, setCourseData] = useState<CourseResourcesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>({
    type: 'root',
    label: 'Course Materials'
  });
  const [navigationHistory, setNavigationHistory] = useState<NavigationLevel[]>([]);
  
  const user = auth.currentUser;

  const fetchCourseResources = async () => {
    try {
      setLoading(true);
      
      if (!user?.email) {
        toast.error('No user email found');
        return;
      }

      const result = await apiService.getCourseResources(user.email);
      
      if (!result.success) {
        toast.error(`Failed to load course resources: ${result.error || 'Unknown error'}`);
        return;
      }

      setCourseData(result.data || { availableTerms: [], folderStructure: {}, flatMaterials: [] });
      
    } catch (error) {
      console.error('Error fetching course resources:', error);
      toast.error('Failed to load course resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation functions
  const navigateToTerm = (term: string) => {
    setNavigationHistory([...navigationHistory, currentLevel]);
    setCurrentLevel({
      type: 'term',
      term,
      label: term
    });
    setSearchTerm(''); // Clear search when navigating
  };

  const navigateToDomain = (term: string, domain: string) => {
    setNavigationHistory([...navigationHistory, currentLevel]);
    setCurrentLevel({
      type: 'domain',
      term,
      domain,
      label: `${term} > ${domain}`
    });
    setSearchTerm('');
  };

  const navigateToSubject = (term: string, domain: string, subject: string) => {
    setNavigationHistory([...navigationHistory, currentLevel]);
    setCurrentLevel({
      type: 'subject',
      term,
      domain,
      subject,
      label: `${term} > ${domain} > ${subject}`
    });
    setSearchTerm('');
  };

  const navigateBack = () => {
    if (navigationHistory.length > 0) {
      const previousLevel = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(navigationHistory.slice(0, -1));
      setCurrentLevel(previousLevel);
      setSearchTerm('');
    }
  };

  const navigateToRoot = () => {
    setCurrentLevel({ type: 'root', label: 'Course Materials' });
    setNavigationHistory([]);
    setSearchTerm('');
  };

  // Get current items based on navigation level
  const getCurrentItems = () => {
    if (!courseData) return [];
    
    switch (currentLevel.type) {
      case 'root':
        return courseData.availableTerms.map(term => ({
          id: term,
          title: term,
          type: 'folder' as const,
          count: Object.keys(courseData.folderStructure[term]?.domains || {}).length
        }));
      
      case 'term':
        if (!currentLevel.term || !courseData.folderStructure[currentLevel.term]) return [];
        return Object.keys(courseData.folderStructure[currentLevel.term].domains).map(domain => ({
          id: `${currentLevel.term}-${domain}`,
          title: domain,
          type: 'folder' as const,
          count: Object.keys(courseData.folderStructure[currentLevel.term!].domains[domain].subjects).length
        }));
      
      case 'domain':
        if (!currentLevel.term || !currentLevel.domain || 
            !courseData.folderStructure[currentLevel.term]?.domains[currentLevel.domain]) return [];
        return Object.keys(courseData.folderStructure[currentLevel.term].domains[currentLevel.domain].subjects).map(subject => ({
          id: `${currentLevel.term}-${currentLevel.domain}-${subject}`,
          title: subject,
          type: 'folder' as const,
          count: courseData.folderStructure[currentLevel.term!].domains[currentLevel.domain!].subjects[subject].length
        }));
      
      case 'subject':
        if (!currentLevel.term || !currentLevel.domain || !currentLevel.subject ||
            !courseData.folderStructure[currentLevel.term]?.domains[currentLevel.domain]?.subjects[currentLevel.subject]) return [];
        return courseData.folderStructure[currentLevel.term].domains[currentLevel.domain].subjects[currentLevel.subject];
      
      default:
        return [];
    }
  };

  // Search function that works across all materials
  const getSearchResults = () => {
    if (!courseData || !searchTerm.trim()) return [];
    
    return courseData.flatMaterials.filter(material => 
      material.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.subTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.term?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Utility functions
  const getTypeIcon = (material: ContentItem) => {
    const attachments = (material as any).attachments || '';
    const resourceLink = (material as any).resourceLink || '';
    
    if (attachments.includes('.pdf') || attachments.includes('.doc')) {
      return <FileText className="h-5 w-5 text-blue-600" />;
    }
    if (attachments.includes('.mp4') || attachments.includes('.avi') || resourceLink.includes('youtube') || resourceLink.includes('vimeo')) {
      return <Video className="h-5 w-5 text-red-600" />;
    }
    if (resourceLink && resourceLink.startsWith('http')) {
      return <Link className="h-5 w-5 text-green-600" />;
    }
    if (attachments.includes('.jpg') || attachments.includes('.png') || attachments.includes('.gif')) {
      return <Image className="h-5 w-5 text-purple-600" />;
    }
    return <FileText className="h-5 w-5 text-gray-600" />;
  };

  const getTypeColor = (material: ContentItem) => {
    const attachments = (material as any).attachments || '';
    const resourceLink = (material as any).resourceLink || '';
    
    if (attachments.includes('.pdf') || attachments.includes('.doc')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (attachments.includes('.mp4') || attachments.includes('.avi') || resourceLink.includes('youtube') || resourceLink.includes('vimeo')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (resourceLink && resourceLink.startsWith('http')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (attachments.includes('.jpg') || attachments.includes('.png') || attachments.includes('.gif')) {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handleDownload = (material: ContentItem) => {
    const attachments = (material as any).attachments;
    const resourceLink = (material as any).resourceLink;
    
    if (attachments && attachments.trim()) {
      window.open(attachments, '_blank');
    } else if (resourceLink && resourceLink.trim()) {
      window.open(resourceLink, '_blank');
    } else {
      toast.error('No downloadable content available');
    }
  };

  // Render different views
  const renderBreadcrumbs = () => (
    <div className="flex items-center space-x-2 mb-4">
      <Button variant="ghost" size="sm" onClick={navigateToRoot}>
        <Home className="h-4 w-4" />
      </Button>
      {navigationHistory.length > 0 && (
        <Button variant="ghost" size="sm" onClick={navigateBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      )}
      <div className="flex items-center text-sm text-muted-foreground">
        <span>Resources</span>
        {currentLevel.type !== 'root' && (
          <>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span>{currentLevel.label}</span>
          </>
        )}
      </div>
    </div>
  );

  const renderFolderCard = (item: any) => (
    <Card 
      key={item.id} 
      className="hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => {
        if (currentLevel.type === 'root') {
          navigateToTerm(item.title);
        } else if (currentLevel.type === 'term') {
          navigateToDomain(currentLevel.term!, item.title);
        } else if (currentLevel.type === 'domain') {
          navigateToSubject(currentLevel.term!, currentLevel.domain!, item.title);
        }
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {item.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {item.count} {currentLevel.type === 'subject' ? 'materials' : 'folders'}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </CardHeader>
    </Card>
  );

  const renderMaterialCard = (material: ContentItem) => {
    if (viewMode === 'grid') {
      return (
        <Card key={material.id} className="hover:shadow-lg transition-all cursor-pointer group">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 rounded-lg bg-background border">
                {getTypeIcon(material)}
              </div>
              <Badge variant="outline" className={getTypeColor(material)}>
                {material.eventType || 'Material'}
              </Badge>
            </div>
            
            <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
              {material.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {material.subTitle}
            </p>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date((material as any).dateAdded || material.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="text-xs">
                  {material.term && <span className="mr-2">Term: {material.term}</span>}
                  {material.priority && (
                    <Badge variant="outline" className="text-xs">
                      {material.priority}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleDownload(material)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Open
                </Button>
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    } else {
      return (
        <Card key={material.id} className="hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 p-2 rounded-lg bg-background border">
                {getTypeIcon(material)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-lg font-medium truncate">{material.title}</h4>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={getTypeColor(material)}>
                      {material.eventType || 'Material'}
                    </Badge>
                    {material.priority && (
                      <Badge variant="outline" className="text-xs">
                        {material.priority}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                  {material.subTitle}
                </p>
                
                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date((material as any).dateAdded || material.createdAt).toLocaleDateString()}</span>
                  </div>
                  {material.term && <span>Term: {material.term}</span>}
                  {material.domain && <span>Domain: {material.domain}</span>}
                  {material.subject && <span>Subject: {material.subject}</span>}
                </div>
              </div>
              
              <div className="flex-shrink-0 flex space-x-2">
                <Button 
                  size="sm"
                  onClick={() => handleDownload(material)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Open
                </Button>
                <Button size="sm" variant="outline">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading course resources...</span>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <AlertCircle className="h-6 w-6" />
          <span>Failed to load course resources</span>
        </div>
      </div>
    );
  }

  const currentItems = searchTerm ? getSearchResults() : getCurrentItems();
  const showingMaterials = currentLevel.type === 'subject' || searchTerm;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{courseData.flatMaterials.length}</p>
                <p className="text-sm text-muted-foreground">Total Materials</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{courseData.availableTerms.length}</p>
                <p className="text-sm text-muted-foreground">Terms Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(courseData.folderStructure).reduce((total, term) => 
                    total + Object.keys(term.domains).length, 0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Domains</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {Object.values(courseData.folderStructure).reduce((total, term) => 
                    total + Object.values(term.domains).reduce((domTotal, domain) => 
                      domTotal + Object.keys(domain.subjects).length, 0
                    ), 0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Subjects</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Search & Navigate
            </CardTitle>
            {showingMaterials && (
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {renderBreadcrumbs()}
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Search materials across all terms..."
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Display */}
      {currentItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? 'No materials found' : 'No items available'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'This section is empty or no materials have been published yet'
              }
            </p>
          </CardContent>
        </Card>
      ) : showingMaterials ? (
        viewMode === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {currentItems.map((material) => renderMaterialCard(material as ContentItem))}
          </div>
        ) : (
          <div className="space-y-4">
            {currentItems.map((material) => renderMaterialCard(material as ContentItem))}
          </div>
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentItems.map((item) => renderFolderCard(item))}
        </div>
      )}
    </div>
  );
};

export default Resources;