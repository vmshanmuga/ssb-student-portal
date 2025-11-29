import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, RefreshCw, Edit2, Trash2, Save, X, FolderPlus, Link as LinkIcon, Upload } from 'lucide-react';
import { apiService, ResourceData, URLLink, FileAttachment } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ResourceFormData extends Omit<ResourceData, 'files' | 'urls'> {
  files: FileAttachment[];
  urls: URLLink[];
}

const RESOURCE_TYPES = [
  'Lecture Slides',
  'Reading Material',
  'Assignment',
  'Lab Manual',
  'Reference Book',
  'Video Tutorial',
  'Practice Problems',
  'Case Study',
  'Other'
];

const RESOURCE_LEVELS = [
  { value: 'Session', label: 'Session Level' },
  { value: 'Subject', label: 'Subject Level' },
  { value: 'Domain', label: 'Domain Level' },
  { value: 'Term', label: 'Term Level' }
];

interface ResourcesManagementCardProps {
  activeTab: 'all' | 'create';
}

interface FolderOptionsType {
  batches?: string[];
  terms?: { [batch: string]: string[] };
  domains?: { [batch: string]: { [term: string]: string[] } };
  subjects?: { [batch: string]: { [term: string]: { [domain: string]: string[] } } };
  sessions?: { [batch: string]: { [term: string]: { [domain: string]: { [subject: string]: string[] } } } };
}

export function ResourcesManagementCard({ activeTab }: ResourcesManagementCardProps) {
  const { student } = useAuth();
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [folderOptions, setFolderOptions] = useState<FolderOptionsType>({});

  const [formData, setFormData] = useState<Partial<ResourceFormData>>({
    title: '',
    description: '',
    resourceType: 'Lecture Slides',
    level: 'Session',
    batch: '',
    term: '',
    domain: '',
    subject: '',
    sessionName: '',
    targetBatch: '',
    showOtherBatches: 'No',
    files: [],
    urls: [],
    status: 'Active',
    notes: ''
  });

  useEffect(() => {
    if (student?.email) {
      fetchResources();
      fetchFolderOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.email]);

  const fetchResources = async () => {
    if (!student?.email) return;

    try {
      setLoading(true);
      const response = await apiService.getResources(student.email, {});

      if (response.success && response.data) {
        setResources(response.data);
      } else {
        toast.error(response.error || 'Failed to load resources');
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolderOptions = async () => {
    console.log('📊 fetchFolderOptions called, student:', student);

    if (!student?.email) {
      console.log('❌ No student email available, cannot fetch hierarchy data');
      return;
    }

    try {
      console.log('📊 Fetching hierarchy data from Term + Zoom Recordings...');
      const response = await apiService.getTermHierarchyData(student.email);

      console.log('📊 Hierarchy data response:', response);

      if (response.success && response.data) {
        console.log('✅ Folder options loaded:', {
          batches: response.data.batches,
          termsKeys: Object.keys(response.data.terms || {}),
          domainsKeys: Object.keys(response.data.domains || {}),
          subjectsKeys: Object.keys(response.data.subjects || {}),
          sessionsKeys: Object.keys(response.data.sessions || {})
        });
        setFolderOptions(response.data);
        if (response.data?.batches && response.data.batches.length > 0) {
          setFormData(prev => ({ ...prev, batch: response.data?.batches?.[0] || '' }));
        }
      } else {
        console.error('❌ Failed to load folder options:', response.error);
      }
    } catch (error) {
      console.error('❌ Error fetching folder options:', error);
    }
  };

  const handleInputChange = (field: keyof ResourceFormData, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Clear dependent fields when parent changes
      if (field === 'batch') {
        updated.term = '';
        updated.domain = '';
        updated.subject = '';
        updated.sessionName = '';
      } else if (field === 'term') {
        updated.domain = '';
        updated.subject = '';
        updated.sessionName = '';
      } else if (field === 'domain') {
        updated.subject = '';
        updated.sessionName = '';
      } else if (field === 'subject') {
        updated.sessionName = '';
      } else if (field === 'level') {
        // Clear fields not applicable to the new level
        if (value === 'Term') {
          updated.domain = '';
          updated.subject = '';
          updated.sessionName = '';
        } else if (value === 'Domain') {
          updated.subject = '';
          updated.sessionName = '';
        } else if (value === 'Subject') {
          updated.sessionName = '';
        }
      }

      return updated;
    });
  };

  const handleAddURL = () => {
    const currentUrls = formData.urls || [];
    if (currentUrls.length < 5) {
      setFormData(prev => ({
        ...prev,
        urls: [...currentUrls, { name: '', url: '' }]
      }));
    } else {
      toast.error('Maximum 5 URLs allowed');
    }
  };

  const handleUpdateURL = (index: number, field: 'name' | 'url', value: string) => {
    const updatedUrls = [...(formData.urls || [])];
    updatedUrls[index] = { ...updatedUrls[index], [field]: value };
    setFormData(prev => ({ ...prev, urls: updatedUrls }));
  };

  const handleRemoveURL = (index: number) => {
    const updatedUrls = (formData.urls || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, urls: updatedUrls }));
  };

  const handleAddFile = () => {
    const currentFiles = formData.files || [];
    if (currentFiles.length < 5) {
      setFormData(prev => ({
        ...prev,
        files: [...currentFiles, { name: '', url: '' }]
      }));
    } else {
      toast.error('Maximum 5 files allowed');
    }
  };

  const handleUpdateFile = (index: number, field: 'name' | 'url', value: string) => {
    const updatedFiles = [...(formData.files || [])];
    updatedFiles[index] = { ...updatedFiles[index], [field]: value };
    setFormData(prev => ({ ...prev, files: updatedFiles }));
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = (formData.files || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, files: updatedFiles }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.email) return;

    // Validation
    if (!formData.title || !formData.description || !formData.batch) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate that custom values are not '__custom__'
    if (formData.batch === '__custom__' || formData.term === '__custom__' || 
        formData.domain === '__custom__' || formData.subject === '__custom__' || 
        formData.sessionName === '__custom__') {
      toast.error('Please enter custom values for all fields marked as custom');
      return;
    }

    try {
      setLoading(true);

      const resourcePayload: ResourceData = {
        title: formData.title!,
        description: formData.description!,
        resourceType: formData.resourceType!,
        level: formData.level!,
        batch: formData.batch!,
        term: formData.term,
        domain: formData.domain,
        subject: formData.subject,
        sessionName: formData.sessionName,
        targetBatch: formData.targetBatch,
        showOtherBatches: formData.showOtherBatches,
        files: formData.files || [],
        urls: formData.urls || [],
        postedBy: student.email,
        status: formData.status || 'Active',
        notes: formData.notes
      };

      let response;
      if (editingId) {
        response = await apiService.updateResource(student.email, editingId, resourcePayload);
      } else {
        response = await apiService.createResource(student.email, resourcePayload);
      }

      if (response.success) {
        toast.success(editingId ? 'Resource updated successfully' : 'Resource created successfully');
        resetForm();
        fetchResources();
      } else {
        toast.error(response.error || 'Failed to save resource');
      }
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error('Failed to save resource');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (resource: ResourceData) => {
    setEditingId(resource.id || null);
    setFormData({
      ...resource,
      files: resource.files || [],
      urls: resource.urls || []
    });
  };

  const handleDelete = async (resourceId: string) => {
    if (!student?.email || !window.confirm('Are you sure you want to delete this resource?')) return;

    try {
      setLoading(true);
      const response = await apiService.deleteResource(student.email, resourceId);

      if (response.success) {
        toast.success('Resource deleted successfully');
        fetchResources();
      } else {
        toast.error(response.error || 'Failed to delete resource');
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      resourceType: 'Lecture Slides',
      level: 'Session',
      batch: folderOptions.batches?.[0] || '',
      term: '',
      domain: '',
      subject: '',
      sessionName: '',
      targetBatch: '',
      showOtherBatches: 'No',
      files: [],
      urls: [],
      status: 'Active',
      notes: ''
    });
    setEditingId(null);
  };

  const isCustomValue = (value: string | undefined, options: string[] | undefined): boolean => {
    return !!value && value !== '__custom__' && (!options || !options.includes(value));
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 rounded-lg">
            <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Resources Management</h2>
            <p className="text-sm text-muted-foreground">Manage course resources and materials</p>
          </div>
        </div>
        {activeTab === 'all' && (
          <button
            onClick={fetchResources}
            disabled={loading}
            className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Create/Edit Form */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-accent/30 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingId ? 'Edit Resource' : 'Create New Resource'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter resource title"
                required
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter resource description"
                rows={3}
                required
              />
            </div>

            {/* Resource Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Resource Type</label>
              <select
                value={formData.resourceType || 'Lecture Slides'}
                onChange={(e) => handleInputChange('resourceType', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RESOURCE_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Resource Level</label>
              <select
                value={formData.level || 'Session'}
                onChange={(e) => handleInputChange('level', e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RESOURCE_LEVELS.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>

            {/* Info Note */}
            <div className="col-span-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400">
                <strong>Note:</strong> Dropdown options are automatically populated from BOTH:
                <br />• "Term" subsheet (for Batch, Term, Domain, Subject hierarchy)
                <br />• "Zoom Recordings" sheet (sessions are populated from recordings)
                <br /><br />
                You can also type custom values by selecting "+ Add Custom" from any dropdown.
              </p>
            </div>

            {/* Batch - Always shown */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Batch <span className="text-red-500">*</span>
                <span className="text-xs text-muted-foreground ml-2">(Select from dropdown or type custom)</span>
              </label>
              <select
                value={formData.batch && folderOptions.batches?.includes(formData.batch) ? formData.batch : '__custom__'}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    handleInputChange('batch', '__custom__');
                  } else {
                    handleInputChange('batch', e.target.value);
                  }
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select batch</option>
                {folderOptions.batches?.map((batch: string) => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
                <option value="__custom__">+ Add Custom Batch</option>
              </select>
              {(formData.batch === '__custom__' || isCustomValue(formData.batch, folderOptions.batches)) && (
                <input
                  type="text"
                  placeholder="Enter custom batch name"
                  value={formData.batch === '__custom__' ? '' : formData.batch}
                  onChange={(e) => handleInputChange('batch', e.target.value || '__custom__')}
                  className="w-full px-3 py-2 mt-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  required
                />
              )}
            </div>

            {/* Term - Show for all levels */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Term
                <span className="text-xs text-muted-foreground ml-2">(Select from dropdown or type custom)</span>
              </label>
              <select
                value={formData.term && formData.batch && formData.batch !== '__custom__' && folderOptions.terms?.[formData.batch]?.includes(formData.term) ? formData.term : (formData.term ? '__custom__' : '')}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    handleInputChange('term', '__custom__');
                  } else {
                    handleInputChange('term', e.target.value);
                  }
                }}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!formData.batch || formData.batch === '__custom__'}
              >
                <option value="">Select term</option>
                {formData.batch && formData.batch !== '__custom__' && folderOptions.terms?.[formData.batch]?.map((term: string) => (
                  <option key={term} value={term}>{term}</option>
                ))}
                <option value="__custom__">+ Add Custom Term</option>
              </select>
              {formData.term && formData.batch && formData.batch !== '__custom__' && 
               (formData.term === '__custom__' || isCustomValue(formData.term, folderOptions.terms?.[formData.batch])) && (
                <input
                  type="text"
                  placeholder="Enter custom term name"
                  value={formData.term === '__custom__' ? '' : formData.term}
                  onChange={(e) => handleInputChange('term', e.target.value || '__custom__')}
                  className="w-full px-3 py-2 mt-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              )}
            </div>

            {/* Domain - Show only for Session, Subject, and Domain levels */}
            {['Session', 'Subject', 'Domain'].includes(formData.level || '') && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Domain
                  <span className="text-xs text-muted-foreground ml-2">(Select from dropdown or type custom)</span>
                </label>
                <select
                  value={formData.domain && formData.batch && formData.term && formData.batch !== '__custom__' && formData.term !== '__custom__' && folderOptions.domains?.[formData.batch]?.[formData.term]?.includes(formData.domain) ? formData.domain : (formData.domain ? '__custom__' : '')}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      handleInputChange('domain', '__custom__');
                    } else {
                      handleInputChange('domain', e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.batch || !formData.term || formData.batch === '__custom__' || formData.term === '__custom__'}
                >
                  <option value="">Select domain</option>
                  {formData.batch && formData.term && formData.batch !== '__custom__' && formData.term !== '__custom__' &&
                   folderOptions.domains?.[formData.batch]?.[formData.term]?.map((domain: string) => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                  <option value="__custom__">+ Add Custom Domain</option>
                </select>
                {formData.domain && formData.batch && formData.term && formData.batch !== '__custom__' && formData.term !== '__custom__' && 
                 (formData.domain === '__custom__' || isCustomValue(formData.domain, folderOptions.domains?.[formData.batch]?.[formData.term])) && (
                  <input
                    type="text"
                    placeholder="Enter custom domain name"
                    value={formData.domain === '__custom__' ? '' : formData.domain}
                    onChange={(e) => handleInputChange('domain', e.target.value || '__custom__')}
                    className="w-full px-3 py-2 mt-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                )}
              </div>
            )}

            {/* Subject - Show only for Session and Subject levels */}
            {['Session', 'Subject'].includes(formData.level || '') && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Subject
                  <span className="text-xs text-muted-foreground ml-2">(Select from dropdown or type custom)</span>
                </label>
                <select
                  value={formData.subject && formData.batch && formData.term && formData.domain && formData.batch !== '__custom__' && formData.term !== '__custom__' && formData.domain !== '__custom__' && folderOptions.subjects?.[formData.batch]?.[formData.term]?.[formData.domain]?.includes(formData.subject) ? formData.subject : (formData.subject ? '__custom__' : '')}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      handleInputChange('subject', '__custom__');
                    } else {
                      handleInputChange('subject', e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.batch || !formData.term || !formData.domain ||
                           formData.batch === '__custom__' || formData.term === '__custom__' || formData.domain === '__custom__'}
                >
                  <option value="">Select subject</option>
                  {formData.batch && formData.term && formData.domain &&
                   formData.batch !== '__custom__' && formData.term !== '__custom__' && formData.domain !== '__custom__' &&
                   folderOptions.subjects?.[formData.batch]?.[formData.term]?.[formData.domain]?.map((subject: string) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                  <option value="__custom__">+ Add Custom Subject</option>
                </select>
                {formData.subject && formData.batch && formData.term && formData.domain && 
                 formData.batch !== '__custom__' && formData.term !== '__custom__' && formData.domain !== '__custom__' && 
                 (formData.subject === '__custom__' || isCustomValue(formData.subject, folderOptions.subjects?.[formData.batch]?.[formData.term]?.[formData.domain])) && (
                  <input
                    type="text"
                    placeholder="Enter custom subject name"
                    value={formData.subject === '__custom__' ? '' : formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value || '__custom__')}
                    className="w-full px-3 py-2 mt-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                )}
              </div>
            )}

            {/* Session Name - Show only for Session level */}
            {formData.level === 'Session' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Session Name
                  <span className="text-xs text-muted-foreground ml-2">(Select from dropdown or type custom)</span>
                </label>
                <select
                  value={formData.sessionName && formData.batch && formData.term && formData.domain && formData.subject && 
                         formData.batch !== '__custom__' && formData.term !== '__custom__' && formData.domain !== '__custom__' && formData.subject !== '__custom__' && 
                         folderOptions.sessions?.[formData.batch]?.[formData.term]?.[formData.domain]?.[formData.subject]?.includes(formData.sessionName) 
                         ? formData.sessionName : (formData.sessionName ? '__custom__' : '')}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      handleInputChange('sessionName', '__custom__');
                    } else {
                      handleInputChange('sessionName', e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.batch || !formData.term || !formData.domain || !formData.subject ||
                           formData.batch === '__custom__' || formData.term === '__custom__' ||
                           formData.domain === '__custom__' || formData.subject === '__custom__'}
                >
                  <option value="">Select session</option>
                  {formData.batch && formData.term && formData.domain && formData.subject &&
                   formData.batch !== '__custom__' && formData.term !== '__custom__' &&
                   formData.domain !== '__custom__' && formData.subject !== '__custom__' &&
                   folderOptions.sessions?.[formData.batch]?.[formData.term]?.[formData.domain]?.[formData.subject]?.map((session: string) => (
                    <option key={session} value={session}>{session}</option>
                  ))}
                  <option value="__custom__">+ Add Custom Session</option>
                </select>
                {formData.sessionName && formData.batch && formData.term && formData.domain && formData.subject && 
                 formData.batch !== '__custom__' && formData.term !== '__custom__' && formData.domain !== '__custom__' && formData.subject !== '__custom__' && 
                 (formData.sessionName === '__custom__' || isCustomValue(formData.sessionName, folderOptions.sessions?.[formData.batch]?.[formData.term]?.[formData.domain]?.[formData.subject])) && (
                  <input
                    type="text"
                    placeholder="Enter custom session name"
                    value={formData.sessionName === '__custom__' ? '' : formData.sessionName}
                    onChange={(e) => handleInputChange('sessionName', e.target.value || '__custom__')}
                    className="w-full px-3 py-2 mt-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                )}
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <select
                value={formData.status || 'Active'}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            {/* URLs Section */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">
                  Additional URLs (up to 5)
                </label>
                <button
                  type="button"
                  onClick={handleAddURL}
                  disabled={(formData.urls || []).length >= 5}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LinkIcon className="w-3 h-3" />
                  Add URL
                </button>
              </div>

              {(formData.urls || []).map((url, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Link Name"
                      value={url.name}
                      onChange={(e) => handleUpdateURL(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-7">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={url.url}
                      onChange={(e) => handleUpdateURL(index, 'url', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveURL(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {(formData.urls || []).length === 0 && (
                <p className="text-sm text-muted-foreground">No additional URLs added. Click "Add URL" to add one.</p>
              )}
            </div>

            {/* Files Section */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">
                  File Attachments (up to 5)
                </label>
                <button
                  type="button"
                  onClick={handleAddFile}
                  disabled={(formData.files || []).length >= 5}
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-3 h-3" />
                  Add File
                </button>
              </div>

              {(formData.files || []).map((file, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="File Name"
                      value={file.name}
                      onChange={(e) => handleUpdateFile(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="col-span-7">
                    <input
                      type="url"
                      placeholder="Google Drive URL or File Link"
                      value={file.url}
                      onChange={(e) => handleUpdateFile(index, 'url', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {(formData.files || []).length === 0 && (
                <p className="text-sm text-muted-foreground">No file attachments added. Click "Add File" to add one.</p>
              )}

              <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded text-xs text-green-400">
                <strong>Tip:</strong> Upload files to Google Drive first, then paste the shareable link here with the file name.
              </div>
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Notes (Internal)</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Internal notes (not visible to students)"
                rows={2}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Update Resource' : 'Create Resource'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-foreground rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Resources List */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Resources ({resources.length})
          </h3>

          {loading && (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading resources...
            </div>
          )}

          {!loading && resources.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No resources found. Create your first resource!</p>
            </div>
          )}

          {!loading && resources.map(resource => (
            <div key={resource.id} className="p-4 bg-accent/30 rounded-lg border border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{resource.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span className="px-2 py-1 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded">
                      {resource.resourceType}
                    </span>
                    <span>{resource.level}</span>
                    <span>{resource.batch}</span>
                    {resource.term && <span>{resource.term}</span>}
                    {resource.domain && <span>{resource.domain}</span>}
                    {resource.subject && <span>{resource.subject}</span>}
                    {resource.sessionName && <span>{resource.sessionName}</span>}
                    <span className={`px-2 py-1 rounded ${
                      resource.status === 'Active'
                        ? 'bg-green-600/10 text-green-600 dark:text-green-400'
                        : 'bg-gray-600/10 text-gray-600 dark:text-gray-400'
                    }`}>
                      {resource.status}
                    </span>
                  </div>
                  {((resource.urls && resource.urls.length > 0) || (resource.files && resource.files.length > 0)) && (
                    <div className="flex items-center gap-4 mt-2">
                      {resource.urls && resource.urls.length > 0 && (
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs text-muted-foreground">
                            {resource.urls.length} URL{resource.urls.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      {resource.files && resource.files.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Upload className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-xs text-muted-foreground">
                            {resource.files.length} File{resource.files.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(resource)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="Edit resource"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(resource.id!)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete resource"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}