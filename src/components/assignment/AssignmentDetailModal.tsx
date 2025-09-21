import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  X,
  Calendar,
  Clock,
  FileText,
  ExternalLink,
  Download,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Users,
  Target,
  MessageSquare
} from 'lucide-react';
import { ContentItem } from '../../services/api';
import { formatDate } from '../../utils/dateUtils';
import DOMPurify from 'dompurify';

interface AssignmentDetailModalProps {
  assignment: ContentItem;
  isOpen: boolean;
  onClose: () => void;
}

const AssignmentDetailModal: React.FC<AssignmentDetailModalProps> = ({ 
  assignment, 
  isOpen, 
  onClose
}) => {
  const [showInstructions, setShowInstructions] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
      case 'Not Started': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const renderLink = (url: string | undefined, label: string, icon: React.ReactNode) => {
    if (!url) return null;
    
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.open(url, '_blank')}
        className="flex items-center gap-2"
      >
        {icon}
        {label}
        <ExternalLink className="h-3 w-3" />
      </Button>
    );
  };

  const sanitizeAndRenderHTML = (htmlContent: string) => {
    const cleanHTML = DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'div', 'span'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
    });
    return { __html: cleanHTML };
  };

  const renderFiles = () => {
    const hasFiles = assignment.files && assignment.files.length > 0;
    const hasLinks = assignment.driveLink || assignment.sheetsLink || assignment.fileuploadLink || assignment.fileURL;
    
    if (!hasFiles && !hasLinks) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Files & Resources
        </h4>
        
        <div className="grid gap-2">
          {assignment.files?.filter(file => file.url && file.name).map((file, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => window.open(file.url, '_blank')}
              className="justify-start"
            >
              <Download className="h-4 w-4 mr-2" />
              {file.name}
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>
          ))}
          
          {assignment.driveLink && renderLink(assignment.driveLink, 'Drive Folder', <FileText className="h-4 w-4" />)}
          {assignment.sheetsLink && renderLink(assignment.sheetsLink, 'Google Sheets', <FileText className="h-4 w-4" />)}
          {assignment.fileuploadLink && renderLink(assignment.fileuploadLink, 'Upload Files', <FileText className="h-4 w-4" />)}
          {assignment.fileURL && renderLink(assignment.fileURL, 'Download File', <Download className="h-4 w-4" />)}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{assignment.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{assignment.subTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <AlertCircle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-foreground hover:text-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Instructions Banner */}
        {showInstructions && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/50 border-b border-blue-200 dark:border-blue-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <h4 className="font-semibold text-blue-800 dark:text-blue-100">Assignment Guidelines</h4>
                <ul className="space-y-1 text-blue-700 dark:text-blue-200 text-xs">
                  <li>• Read all instructions carefully before starting</li>
                  <li>• Check due dates and plan your work accordingly</li>
                  <li>• Download all required files and resources</li>
                  <li>• Submit your work before the deadline</li>
                  <li>• Acknowledge assignments that require confirmation</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status & Priority Badges */}
          <div className="flex flex-wrap gap-3">
            <Badge variant="outline" className={getPriorityColor(assignment.priority)}>
              {assignment.priority} Priority
            </Badge>
            <Badge variant="outline" className={getStatusColor(assignment.status)}>
              {assignment.status}
            </Badge>
            {assignment.subject && (
              <Badge variant="outline" className="text-foreground border-border">
                {assignment.subject}
              </Badge>
            )}
            <Badge variant="outline" className="text-foreground border-border">
              {assignment.eventType || assignment.category}
            </Badge>
          </div>

          {/* Due Date & Timeline */}
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Due Date</p>
                <p className="text-sm text-muted-foreground">{formatDate(assignment.endDateTime)}</p>
              </div>
            </div>
            
            {assignment.daysUntilDeadline !== null && (
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Time Remaining</p>
                  <p className={`text-sm ${
                    assignment.daysUntilDeadline <= 3 ? 'text-red-600 font-medium dark:text-red-400' :
                    assignment.daysUntilDeadline <= 7 ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'
                  }`}>
                    {assignment.daysUntilDeadline > 0 ? `${assignment.daysUntilDeadline} days left` : 
                     assignment.daysUntilDeadline === 0 ? 'Due today' : 'Overdue'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Assignment Details */}
          {assignment.content?.trim() && (
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Description
              </h4>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div 
                  className="text-sm text-foreground prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={sanitizeAndRenderHTML(assignment.content)}
                />
              </div>
            </div>
          )}

          {/* Assignment-Specific Fields */}
          {(assignment.instructions?.trim() || assignment.maxPoints?.trim() || assignment.submissionGuidelines?.trim() || assignment.groupSize?.trim()) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Assignment Details
                </h4>
                {/* View Assignment Button */}
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => window.open('https://script.google.com/a/macros/scaler.com/s/AKfycbwzuW0MYf9_MpUaj1pKo0GBcPv7dZ7I7XwY-13wGeJD3-JkX600wR_CQu3IjIxA6bqRxw/exec', '_blank')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Assignment
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {assignment.instructions?.trim() && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h5 className="font-medium text-foreground mb-2">Instructions</h5>
                    <div 
                      className="text-sm text-foreground prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={sanitizeAndRenderHTML(assignment.instructions)}
                    />
                  </div>
                )}
                
                {assignment.submissionGuidelines?.trim() && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h5 className="font-medium text-foreground mb-2">Submission Guidelines</h5>
                    <div 
                      className="text-sm text-foreground prose prose-sm max-w-none dark:prose-invert"
                      dangerouslySetInnerHTML={sanitizeAndRenderHTML(assignment.submissionGuidelines)}
                    />
                  </div>
                )}
                
                {assignment.maxPoints?.trim() && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Maximum Points
                    </h5>
                    <p className="text-lg font-semibold text-primary">{assignment.maxPoints}</p>
                  </div>
                )}
                
                {assignment.groupSize?.trim() && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h5 className="font-medium text-foreground mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Group Size
                    </h5>
                    <p className="text-sm text-foreground">{assignment.groupSize}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Files & Resources */}
          {renderFiles()}

          {/* Rubric Link */}
          {assignment.rubricLink?.trim() && (
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Grading Rubric
              </h4>
              {renderLink(assignment.rubricLink, 'View Rubric', <FileText className="h-4 w-4" />)}
            </div>
          )}

          {/* Course Information */}
          {(assignment.term?.trim() || assignment.groups?.trim() || assignment.domain?.trim()) && (
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground">Course Information</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                {assignment.term?.trim() && (
                  <div>
                    <span className="text-muted-foreground">Term:</span>
                    <p className="font-medium text-foreground">{assignment.term}</p>
                  </div>
                )}
                {assignment.groups?.trim() && (
                  <div>
                    <span className="text-muted-foreground">Groups:</span>
                    <p className="font-medium text-foreground">{assignment.groups}</p>
                  </div>
                )}
                {assignment.domain?.trim() && (
                  <div>
                    <span className="text-muted-foreground">Domain:</span>
                    <p className="font-medium text-foreground">{assignment.domain}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assignment Metadata */}
          {(assignment.postedBy?.trim() || assignment.createdAt?.trim() || assignment.editedAt?.trim()) && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h4 className="font-semibold text-foreground">Assignment Info</h4>
              <div className="grid md:grid-cols-3 gap-4 text-xs text-muted-foreground">
                {assignment.postedBy?.trim() && (
                  <div>
                    <span>Posted by:</span>
                    <p className="font-medium text-foreground">{assignment.postedBy}</p>
                  </div>
                )}
                {assignment.createdAt?.trim() && (
                  <div>
                    <span>Created:</span>
                    <p className="font-medium text-foreground">{formatDate(assignment.createdAt)}</p>
                  </div>
                )}
                {assignment.editedAt?.trim() && (
                  <div>
                    <span>Last edited:</span>
                    <p className="font-medium text-foreground">{formatDate(assignment.editedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t border-border">
            <div className="flex gap-3">
              {assignment.requiresAcknowledgment && (
                <Button variant="outline" size="sm">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {assignment.isAcknowledged ? 'Acknowledged' : 'Acknowledge'}
                </Button>
              )}
            </div>
            
            <Button variant="outline" size="sm" onClick={onClose} className="bg-background text-foreground border-border hover:bg-muted">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetailModal;