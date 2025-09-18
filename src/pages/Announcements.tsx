import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ListSkeleton } from '../components/ui/loading-skeletons';
import { 
  Megaphone, 
  Filter, 
  Search, 
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  AlertCircle,
  Bell,
  X,
  ExternalLink,
  MapPin,
  Users,
  FileText
} from 'lucide-react';
import { apiService, type DashboardData, type ContentItem, type ContentItemWithAck } from '../services/api';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';
import { formatDate, formatDateTime, parseDate } from '../utils/dateUtils';

const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<ContentItemWithAck[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItemWithAck | null>(null);
  const [showModal, setShowModal] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
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

      // Filter for both announcements and events
      const announcementItems = result.data!.content.filter(item => 
        item.category === 'ANNOUNCEMENTS' || item.category === 'EVENTS'
      ) as ContentItemWithAck[];
      
      setAnnouncements(announcementItems);
      
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgment = async (contentId: string) => {
    if (!user?.email || acknowledgingId) return;
    
    try {
      setAcknowledgingId(contentId);
      
      const result = await apiService.submitAcknowledgment(contentId, user.email, 'Yes');
      
      if (result.success) {
        // Update the local state
        setAnnouncements(prev => prev.map(item => 
          item.id === contentId 
            ? { ...item, isAcknowledged: true, acknowledgmentTimestamp: new Date().toISOString() }
            : item
        ));
        toast.success('Acknowledged successfully');
      } else {
        toast.error(result.error || 'Failed to acknowledge');
      }
    } catch (error) {
      console.error('Error submitting acknowledgment:', error);
      toast.error('Failed to acknowledge');
    } finally {
      setAcknowledgingId(null);
    }
  };

  const openModal = (item: ContentItemWithAck) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setShowModal(false);
  };

  const getStatusIndicator = (status: string) => {
    switch(status) {
      case 'Active': return { 
        color: 'bg-green-500', 
        badge: 'LIVE NOW', 
        pulse: true,
        textColor: 'text-green-700'
      };
      case 'Upcoming': return { 
        color: 'bg-blue-500', 
        badge: 'UPCOMING', 
        pulse: false,
        textColor: 'text-blue-700'
      };
      case 'Expired': return { 
        color: 'bg-gray-400', 
        badge: 'ENDED', 
        pulse: false,
        textColor: 'text-gray-700'
      };
      default: return { 
        color: 'bg-gray-400', 
        badge: 'DRAFT', 
        pulse: false,
        textColor: 'text-gray-700'
      };
    }
  };

  const getCategoryIcon = (category: string) => {
    switch(category) {
      case 'ANNOUNCEMENTS': return <Megaphone className="h-4 w-4 text-blue-600" />;
      case 'EVENTS': return <Calendar className="h-4 w-4 text-purple-600" />;
      default: return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'ANNOUNCEMENTS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EVENTS': return 'bg-purple-100 text-purple-800 border-purple-200';
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

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const announcementDate = new Date(date);
    const diffTime = now.getTime() - announcementDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return announcementDate.toLocaleDateString();
  };

  const filteredAnnouncements = announcements
    .filter(announcement => {
      const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (announcement.subTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (announcement.content || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || announcement.category === categoryFilter;
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'live' && announcement.status === 'Active') ||
                           (statusFilter === 'upcoming' && announcement.status === 'Upcoming') ||
                           (statusFilter === 'ended' && announcement.status === 'Expired');
      
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = parseDate(a.createdAt);
      const dateB = parseDate(b.createdAt);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB.getTime() - dateA.getTime(); // Newest first
    });

  const pendingAcknowledgments = announcements.filter(a => a.requiresAcknowledgment && !a.isAcknowledged).length;
  const liveCount = announcements.filter(a => a.status === 'Active').length;
  const upcomingCount = announcements.filter(a => a.status === 'Upcoming').length;

  const AnnouncementCard = ({ announcement }: { announcement: ContentItemWithAck }) => {
    const statusInfo = getStatusIndicator(announcement.status);
    const isAcknowledging = acknowledgingId === announcement.id;
    
    return (
      <Card className="hover:shadow-md transition-all cursor-pointer" onClick={() => openModal(announcement)}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                {getCategoryIcon(announcement.category)}
                <CardTitle className="text-lg">{announcement.eventTitle || announcement.eventType}</CardTitle>
                
                {/* Status Badge */}
                <Badge 
                  variant="outline" 
                  className={`${statusInfo.color} text-white border-0 ${statusInfo.pulse ? 'animate-pulse' : ''}`}
                >
                  {statusInfo.badge}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className={getCategoryColor(announcement.category)}>
                  {announcement.category}
                </Badge>
                <Badge variant="outline" className={getPriorityColor(announcement.priority)}>
                  {announcement.priority} Priority
                </Badge>
                {announcement.eventType && (
                  <Badge variant="outline">
                    {announcement.eventType}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{getTimeAgo(announcement.createdAt)}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              {announcement.subTitle || announcement.content}
            </p>
            
            {/* Acknowledgment status indicator */}
            {announcement.requiresAcknowledgment && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-700">Requires Acknowledgment</span>
                </div>
                {announcement.isAcknowledged && (
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">Acknowledged</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return <ListSkeleton items={8} showSearch={true} />;
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{announcements.length}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <p className="text-2xl font-bold text-green-600">{liveCount}</p>
                <p className="text-sm text-muted-foreground">Live Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{upcomingCount}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{pendingAcknowledgments}</p>
                <p className="text-sm text-muted-foreground">Need Action</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filter & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search announcements and events..."
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
                <option value="ANNOUNCEMENTS">Announcements</option>
                <option value="EVENTS">Events</option>
              </select>
              
              <select
                className="px-4 py-2 border border-input rounded-lg bg-background focus:ring-2 focus:ring-ring"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="live">Live Now</option>
                <option value="upcoming">Upcoming</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Announcements and Events Feed */}
      <div className="space-y-4">
        {filteredAnnouncements.map((announcement) => (
          <AnnouncementCard key={announcement.id} announcement={announcement} />
        ))}
      </div>

      {filteredAnnouncements.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Megaphone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      )}

      {/* Detailed Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getCategoryIcon(selectedItem.category)}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selectedItem.eventTitle || selectedItem.eventType}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className={getCategoryColor(selectedItem.category)}>
                      {selectedItem.category}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusIndicator(selectedItem.status).color} text-white border-0 ${getStatusIndicator(selectedItem.status).pulse ? 'animate-pulse' : ''}`}
                    >
                      {getStatusIndicator(selectedItem.status).badge}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Description</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {selectedItem.subTitle || selectedItem.content || 'No description available'}
                  </p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Created:</span>
                      <span>{formatDateTime(selectedItem.createdAt)}</span>
                    </div>
                    
                    {selectedItem.postedBy && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Posted by:</span>
                        <span>{selectedItem.postedBy}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Priority:</span>
                      <Badge variant="outline" className={getPriorityColor(selectedItem.priority)}>
                        {selectedItem.priority}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {selectedItem.targetBatch && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Target Batch:</span>
                        <span>{selectedItem.targetBatch}</span>
                      </div>
                    )}
                    
                    {selectedItem.eventType && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">Event Type:</span>
                        <span>{selectedItem.eventType}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Event Specific Details */}
              {selectedItem.category === 'EVENTS' && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300 mb-4">
                    <Calendar className="h-5 w-5" />
                    <h3 className="text-lg font-medium">Event Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {selectedItem.startDateTime && (
                      <div className="space-y-1">
                        <span className="font-medium text-purple-700 dark:text-purple-300">Start Time:</span>
                        <p className="text-purple-600 dark:text-purple-200">{formatDateTime(selectedItem.startDateTime)}</p>
                      </div>
                    )}
                    
                    {selectedItem.endDateTime && (
                      <div className="space-y-1">
                        <span className="font-medium text-purple-700 dark:text-purple-300">End Time:</span>
                        <p className="text-purple-600 dark:text-purple-200">{formatDateTime(selectedItem.endDateTime)}</p>
                      </div>
                    )}
                    
                    {selectedItem.eventLocation && (
                      <div className="space-y-1">
                        <span className="font-medium text-purple-700 dark:text-purple-300 flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          Location:
                        </span>
                        <p className="text-purple-600 dark:text-purple-200">{selectedItem.eventLocation}</p>
                      </div>
                    )}

                    {selectedItem.eventAgenda && (
                      <div className="space-y-1 md:col-span-2">
                        <span className="font-medium text-purple-700 dark:text-purple-300">Agenda:</span>
                        <p className="text-purple-600 dark:text-purple-200">{selectedItem.eventAgenda}</p>
                      </div>
                    )}
                    
                    {selectedItem.speakerInfo && (
                      <div className="space-y-1 md:col-span-2">
                        <span className="font-medium text-purple-700 dark:text-purple-300">Speaker Info:</span>
                        <p className="text-purple-600 dark:text-purple-200">{selectedItem.speakerInfo}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Files and Links */}
              {(selectedItem.fileURL || selectedItem.driveLink || selectedItem.sheetsLink || selectedItem.fileuploadLink) && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium flex items-center text-gray-900 dark:text-white">
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Related Links & Files
                  </h3>
                  
                  <div className="space-y-2">
                    {selectedItem.fileURL && (
                      <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-900 dark:text-white">File Link</span>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => window.open(selectedItem.fileURL!, '_blank')}
                        >
                          Open File
                        </Button>
                      </div>
                    )}
                    
                    {selectedItem.driveLink && (
                      <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <div className="flex items-center space-x-2">
                          <ExternalLink className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-gray-900 dark:text-white">Google Drive</span>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => window.open(selectedItem.driveLink!, '_blank')}
                        >
                          Open Drive
                        </Button>
                      </div>
                    )}
                    
                    {selectedItem.sheetsLink && (
                      <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-orange-600" />
                          <span className="font-medium text-gray-900 dark:text-white">Google Sheets</span>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => window.open(selectedItem.sheetsLink!, '_blank')}
                        >
                          Open Sheets
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Announcement Specific Content */}
              {selectedItem.category === 'ANNOUNCEMENTS' && (
                <>
                  {selectedItem.messageDetails && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300 mb-2">Message Details</h3>
                      <p className="text-blue-600 dark:text-blue-200 text-sm leading-relaxed">{selectedItem.messageDetails}</p>
                    </div>
                  )}
                  
                  {selectedItem.callToAction && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-700">
                      <h3 className="text-lg font-medium text-orange-700 dark:text-orange-300 mb-2">Call to Action</h3>
                      <p className="text-orange-600 dark:text-orange-200 text-sm leading-relaxed">{selectedItem.callToAction}</p>
                    </div>
                  )}
                </>
              )}

              {/* Acknowledgment Section */}
              {selectedItem.requiresAcknowledgment && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="text-lg font-medium text-blue-700 dark:text-blue-300">Acknowledgment Required</h3>
                        <p className="text-blue-600 dark:text-blue-200 text-sm">Please acknowledge that you have read and understood this {selectedItem.category.toLowerCase()}.</p>
                      </div>
                    </div>
                    
                    {selectedItem.isAcknowledged ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <div className="text-right">
                          <p className="font-medium">Acknowledged</p>
                          {selectedItem.acknowledgmentTimestamp && (
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(selectedItem.acknowledgmentTimestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcknowledgment(selectedItem.id);
                        }}
                        disabled={acknowledgingId === selectedItem.id}
                      >
                        {acknowledgingId === selectedItem.id ? 'Acknowledging...' : 'Acknowledge'}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  variant="outline" 
                  onClick={closeModal}
                  className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
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

export default Announcements;