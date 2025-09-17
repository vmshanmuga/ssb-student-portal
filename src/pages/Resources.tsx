import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { 
  FolderOpen, 
  Filter, 
  Search, 
  ExternalLink,
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
  TrendingUp,
  X,
  Upload,
  Target,
  BookMarked
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
  const location = useLocation();
  const navigate = useNavigate();
  
  const [courseData, setCourseData] = useState<CourseResourcesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>({
    type: 'root',
    label: 'Course Materials'
  });
  const [navigationHistory, setNavigationHistory] = useState<NavigationLevel[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<ContentItem | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  
  const user = auth.currentUser;


  const fetchCourseResources = async () => {
    try {
      console.log('Resources: Starting to load course resources...');
      setLoading(true); // Explicitly set loading to true
      
      
      if (!user?.email) {
        console.log('Resources: No user email found');
        toast.error('No user email found');
        setLoading(false);
        return;
      }

      const result = await apiService.getCourseResources(user.email);
      
      if (!result.success) {
        console.log('Resources: API call failed:', result.error);
        toast.error(`Failed to load course resources: ${result.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      setCourseData(result.data || { availableTerms: [], folderStructure: {}, flatMaterials: [] });
      console.log('Resources: Data loaded successfully');
      setLoading(false);
      
    } catch (error) {
      console.error('Error fetching course resources:', error);
      toast.error('Failed to load course resources');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseResources();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state with URL when data loads or URL changes
  useEffect(() => {
    if (courseData) {
      syncStateWithUrl();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseData, location.pathname]);

  // Navigation functions
  const navigateToTerm = (term: string) => {
    const newPath = buildUrlPath([term]);
    navigate(newPath);
    setSearchTerm(''); // Clear search when navigating
  };

  const navigateToDomain = (term: string, domain: string) => {
    const newPath = buildUrlPath([term, domain]);
    navigate(newPath);
    setSearchTerm('');
  };

  const navigateToSubject = (term: string, domain: string, subject: string) => {
    const newPath = buildUrlPath([term, domain, subject]);
    navigate(newPath);
    setSearchTerm('');
  };

  const navigateBack = () => {
    if (navigationHistory.length > 0) {
      const previousLevel = navigationHistory[navigationHistory.length - 1];
      let newPath: string;
      
      if (previousLevel.type === 'root') {
        newPath = '/resources';
      } else if (previousLevel.type === 'term') {
        newPath = buildUrlPath([previousLevel.term!]);
      } else if (previousLevel.type === 'domain') {
        newPath = buildUrlPath([previousLevel.term!, previousLevel.domain!]);
      } else {
        newPath = '/resources';
      }
      
      navigate(newPath);
      setSearchTerm('');
    }
  };

  const navigateToRoot = () => {
    navigate('/resources');
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
    const fileURL = material.fileURL;
    const attachments = (material as any).attachments;
    const resourceLink = (material as any).resourceLink;
    
    if (fileURL && fileURL.trim()) {
      window.open(fileURL, '_blank');
    } else if (attachments && attachments.trim()) {
      window.open(attachments, '_blank');
    } else if (resourceLink && resourceLink.trim()) {
      window.open(resourceLink, '_blank');
    } else {
      toast.error('No downloadable content available');
    }
  };

  const openMaterialModal = (material: ContentItem) => {
    console.log('Material data:', {
      fileURL: material.fileURL,
      attachments: (material as any).attachments,
      resourceLink: (material as any).resourceLink,
      driveLink: (material as any).driveLink,
      fileuploadLink: (material as any).fileuploadLink
    });
    setSelectedMaterial(material);
    setShowMaterialModal(true);
  };

  const closeMaterialModal = () => {
    setSelectedMaterial(null);
    setShowMaterialModal(false);
  };

  // URL synchronization functions
  const parseUrlPath = () => {
    const pathSegments = location.pathname
      .replace('/resources', '')
      .split('/')
      .filter(segment => segment.length > 0)
      .map(segment => decodeURIComponent(segment));
    
    return pathSegments;
  };

  const buildUrlPath = (segments: string[]) => {
    const encodedSegments = segments.map(segment => encodeURIComponent(segment));
    return `/resources${encodedSegments.length > 0 ? '/' + encodedSegments.join('/') : ''}`;
  };

  const syncStateWithUrl = () => {
    if (!courseData) return;
    
    const pathSegments = parseUrlPath();
    
    if (pathSegments.length === 0) {
      // Root level
      setCurrentLevel({ type: 'root', label: 'Course Materials' });
      setNavigationHistory([]);
    } else if (pathSegments.length === 1) {
      // Term level
      const term = pathSegments[0];
      if (courseData.availableTerms.includes(term)) {
        setCurrentLevel({ type: 'term', term, label: term });
        setNavigationHistory([{ type: 'root', label: 'Course Materials' }]);
      }
    } else if (pathSegments.length === 2) {
      // Domain level
      const [term, domain] = pathSegments;
      if (courseData.folderStructure[term]?.domains[domain]) {
        setCurrentLevel({ type: 'domain', term, domain, label: `${term} > ${domain}` });
        setNavigationHistory([
          { type: 'root', label: 'Course Materials' },
          { type: 'term', term, label: term }
        ]);
      }
    } else if (pathSegments.length === 3) {
      // Subject level
      const [term, domain, subject] = pathSegments;
      if (courseData.folderStructure[term]?.domains[domain]?.subjects[subject]) {
        setCurrentLevel({ type: 'subject', term, domain, subject, label: `${term} > ${domain} > ${subject}` });
        setNavigationHistory([
          { type: 'root', label: 'Course Materials' },
          { type: 'term', term, label: term },
          { type: 'domain', term, domain, label: `${term} > ${domain}` }
        ]);
      }
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
        <Card key={material.id} className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => openMaterialModal(material)}>
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
              
              <div className="pt-2">
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(material);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    } else {
      return (
        <Card key={material.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => openMaterialModal(material)}>
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
              
              <div className="flex-shrink-0">
                <Button 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(material);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
  };

  // Show skeleton loading directly  
  if (loading || !courseData) {
    return (
      <div className="space-y-6">
        {/* Search/Filter Bar Skeleton */}
        <div className="flex gap-4">
          <div className="h-10 bg-muted rounded flex-1 animate-pulse"></div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
          <div className="h-10 w-24 bg-muted rounded animate-pulse"></div>
        </div>
        
        {/* Breadcrumb Skeleton */}
        <div className="h-6 bg-muted rounded w-1/3 animate-pulse"></div>
        
        {/* Content Grid Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-card rounded-lg p-6 border animate-pulse">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 bg-muted rounded"></div>
                  <div className="h-5 bg-muted rounded flex-1"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full"></div>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-6 w-16 bg-muted rounded"></div>
                  <div className="h-8 w-20 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          ))}
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

      {/* Material Details Modal */}
      {showMaterialModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{selectedMaterial.title}</h2>
              <Button variant="ghost" size="sm" onClick={closeMaterialModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Description</h3>
                <p className="text-muted-foreground">{selectedMaterial.subTitle || 'No description available'}</p>
                
                {selectedMaterial.term && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium">Term:</span>
                    <Badge variant="outline">{selectedMaterial.term}</Badge>
                  </div>
                )}
                
                {selectedMaterial.domain && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium">Domain:</span>
                    <Badge variant="outline">{selectedMaterial.domain}</Badge>
                  </div>
                )}
                
                {selectedMaterial.subject && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium">Subject:</span>
                    <Badge variant="outline">{selectedMaterial.subject}</Badge>
                  </div>
                )}
              </div>

              {/* File Links Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium flex items-center">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Access Links
                </h3>
                
                {selectedMaterial.fileURL && selectedMaterial.fileURL.trim() && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ExternalLink className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">File Link</span>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => window.open(selectedMaterial.fileURL!, '_blank')}
                      >
                        Open File
                      </Button>
                    </div>
                  </div>
                )}
                
                {(selectedMaterial as any).attachments && (selectedMaterial as any).attachments.trim() && (selectedMaterial as any).attachments.startsWith('http') && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <ExternalLink className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Attachment</span>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => window.open((selectedMaterial as any).attachments, '_blank')}
                      >
                        Open File
                      </Button>
                    </div>
                  </div>
                )}
                
                {(selectedMaterial as any).resourceLink && (selectedMaterial as any).resourceLink.trim() && (selectedMaterial as any).resourceLink.startsWith('http') && (
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Upload className="h-4 w-4 text-green-600" />
                        <span className="font-medium">File Upload Link</span>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => window.open((selectedMaterial as any).resourceLink, '_blank')}
                      >
                        Open Link
                      </Button>
                    </div>
                  </div>
                )}
                
                {!selectedMaterial.fileURL?.trim() && !(selectedMaterial as any).attachments?.trim() && !(selectedMaterial as any).resourceLink?.trim() && (
                  <p className="text-muted-foreground text-sm italic">No access links available</p>
                )}
              </div>

              {/* Learning Content Section */}
              {((selectedMaterial as any).learningObjectives || (selectedMaterial as any).prerequisites) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center">
                    <BookMarked className="h-5 w-5 mr-2" />
                    Learning Content
                  </h3>
                  
                  {(selectedMaterial as any).learningObjectives && (selectedMaterial as any).learningObjectives.trim() && (
                    <div className="space-y-2">
                      <h4 className="text-md font-medium flex items-center text-blue-700">
                        <Target className="h-4 w-4 mr-2" />
                        Learning Objectives
                      </h4>
                      <div 
                        className="prose prose-sm max-w-none p-4 border rounded-lg bg-blue-50/50"
                        dangerouslySetInnerHTML={{ __html: (selectedMaterial as any).learningObjectives }}
                      />
                    </div>
                  )}
                  
                  {(selectedMaterial as any).prerequisites && (selectedMaterial as any).prerequisites.trim() && (
                    <div className="space-y-2">
                      <h4 className="text-md font-medium flex items-center text-orange-700">
                        <BookMarked className="h-4 w-4 mr-2" />
                        Prerequisites
                      </h4>
                      <div 
                        className="prose prose-sm max-w-none p-4 border rounded-lg bg-orange-50/50"
                        dangerouslySetInnerHTML={{ __html: (selectedMaterial as any).prerequisites }}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={closeMaterialModal}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Resources;