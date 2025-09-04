import React, { useState } from 'react';
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
  List
} from 'lucide-react';
import { mockResources } from '../data/mockData';
import type { Resource } from '../types';

const Resources: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'dateAdded' | 'downloads' | 'title'>('dateAdded');

  const filteredResources = mockResources
    .filter(resource => {
      const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          resource.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || resource.category === categoryFilter;
      const matchesType = typeFilter === 'all' || resource.type === typeFilter;
      
      return matchesSearch && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'dateAdded':
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        case 'downloads':
          return b.downloads - a.downloads;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Document': return <FileText className="h-5 w-5 text-blue-600" />;
      case 'Video': return <Video className="h-5 w-5 text-red-600" />;
      case 'Link': return <Link className="h-5 w-5 text-green-600" />;
      case 'Image': return <Image className="h-5 w-5 text-purple-600" />;
      default: return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Document': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Video': return 'bg-red-100 text-red-800 border-red-200';
      case 'Link': return 'bg-green-100 text-green-800 border-green-200';
      case 'Image': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Textbooks': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Tutorials': return 'bg-green-100 text-green-800 border-green-200';
      case 'Articles': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Templates': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'External Resources': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDownload = (resource: Resource) => {
    // In a real app, this would handle the download
    console.log('Downloading:', resource.title);
    // For demo purposes, just increment download count locally
  };

  const categories = Array.from(new Set(mockResources.map(r => r.category)));
  const types = Array.from(new Set(mockResources.map(r => r.type)));

  const ResourceCardGrid = ({ resource }: { resource: Resource }) => (
    <Card className="hover:shadow-lg transition-all cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-3">
          <div className="p-3 rounded-lg bg-background border">
            {getTypeIcon(resource.type)}
          </div>
          <Badge variant="outline" className={getTypeColor(resource.type)}>
            {resource.type}
          </Badge>
        </div>
        
        <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
          {resource.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {resource.description}
        </p>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <Badge variant="outline" className={getCategoryColor(resource.category)}>
            {resource.category}
          </Badge>
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(resource.dateAdded).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Download className="h-4 w-4" />
              <span>{resource.downloads}</span>
            </div>
          </div>
          
          {resource.size && (
            <p className="text-xs text-muted-foreground">Size: {resource.size}</p>
          )}
          
          <div className="flex space-x-2 pt-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={() => handleDownload(resource)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ResourceCardList = ({ resource }: { resource: Resource }) => (
    <Card className="hover:shadow-md transition-all cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 p-2 rounded-lg bg-background border">
            {getTypeIcon(resource.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-lg font-medium truncate">{resource.title}</h4>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className={getTypeColor(resource.type)}>
                  {resource.type}
                </Badge>
                <Badge variant="outline" className={getCategoryColor(resource.category)}>
                  {resource.category}
                </Badge>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
              {resource.description}
            </p>
            
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date(resource.dateAdded).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Download className="h-4 w-4" />
                <span>{resource.downloads} downloads</span>
              </div>
              {resource.size && (
                <span>Size: {resource.size}</span>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0 flex space-x-2">
            <Button 
              size="sm"
              onClick={() => handleDownload(resource)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FolderOpen className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{mockResources.length}</p>
                <p className="text-sm text-muted-foreground">Total Resources</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {mockResources.filter(r => r.type === 'Document').length}
                </p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {mockResources.filter(r => r.type === 'Video').length}
                </p>
                <p className="text-sm text-muted-foreground">Videos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {mockResources.reduce((sum, r) => sum + r.downloads, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and View Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filters & Search
            </CardTitle>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-4">
              <select
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                {types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              
              <select
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="dateAdded">Sort by Date</option>
                <option value="downloads">Sort by Downloads</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource) => (
            <ResourceCardGrid key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredResources.map((resource) => (
            <ResourceCardList key={resource.id} resource={resource} />
          ))}
        </div>
      )}

      {filteredResources.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No resources found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Resources;