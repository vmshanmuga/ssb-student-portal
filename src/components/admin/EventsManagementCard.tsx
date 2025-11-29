import React, { useState, useEffect } from 'react';
import { Calendar, Plus, RefreshCw, Edit2, Trash2, Save, X, Link as LinkIcon } from 'lucide-react';
import { apiService, EventData, URLLink, FileAttachment } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface EventFormData extends Omit<EventData, 'files' | 'urls'> {
  files: FileAttachment[];
  urls: URLLink[];
}

const EVENT_TYPES = [
  'Workshop',
  'Webinar',
  'Guest Lecture',
  'Networking Event',
  'Career Fair',
  'Hackathon',
  'Cultural Event',
  'Sports Event',
  'Announcement',
  'Deadline Reminder',
  'General Announcement',
  'Other'
];

interface EventsManagementCardProps {
  activeTab?: 'all' | 'create';
}

export function EventsManagementCard({ activeTab = 'all' }: EventsManagementCardProps) {
  const { student } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [batches, setBatches] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<EventFormData>>({
    title: '',
    description: '',
    eventType: 'Announcement',
    batch: '',
    targetBatch: '',
    showOtherBatches: 'No',
    startDateTime: '',
    endDateTime: '',
    location: '',
    agenda: '',
    speakerInfo: '',
    files: [],
    urls: [],
    status: 'Active',
    notes: ''
  });

  useEffect(() => {
    fetchEvents();
    fetchBatches();
  }, []);

  const fetchEvents = async () => {
    if (!student?.email) return;

    try {
      setLoading(true);
      const response = await apiService.getEvents(student.email, {});

      if (response.success && response.data) {
        setEvents(response.data);
      } else {
        toast.error(response.error || 'Failed to load events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    if (!student?.email) return;

    try {
      const response = await apiService.getAvailableFolders(student.email);

      if (response.success && response.data && response.data.batches) {
        setBatches(response.data.batches);
        if (response.data.batches.length > 0) {
          setFormData(prev => ({ ...prev, batch: response.data?.batches?.[0] || '' }));
        }
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.email) return;

    // Validation
    if (!formData.title || !formData.description || !formData.batch || !formData.startDateTime || !formData.endDateTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const eventPayload: EventData = {
        title: formData.title!,
        description: formData.description!,
        eventType: formData.eventType!,
        batch: formData.batch!,
        targetBatch: formData.targetBatch,
        showOtherBatches: formData.showOtherBatches,
        startDateTime: formData.startDateTime!,
        endDateTime: formData.endDateTime!,
        location: formData.location,
        agenda: formData.agenda,
        speakerInfo: formData.speakerInfo,
        files: formData.files || [],
        urls: formData.urls || [],
        postedBy: student.email,
        status: formData.status || 'Active',
        notes: formData.notes
      };

      let response;
      if (editingId) {
        response = await apiService.updateEvent(student.email, editingId, eventPayload);
      } else {
        response = await apiService.createEvent(student.email, eventPayload);
      }

      if (response.success) {
        toast.success(editingId ? 'Event updated successfully' : 'Event created successfully');
        resetForm();
        fetchEvents();
      } else {
        toast.error(response.error || 'Failed to save event');
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (event: EventData) => {
    setEditingId(event.id || null);
    setFormData({
      ...event,
      files: event.files || [],
      urls: event.urls || []
    });
    // Note: User needs to switch to "Create New" tab to see the edit form
  };

  const handleDelete = async (eventId: string) => {
    if (!student?.email || !window.confirm('Are you sure you want to delete this event?')) return;

    try {
      setLoading(true);
      const response = await apiService.deleteEvent(student.email, eventId);

      if (response.success) {
        toast.success('Event deleted successfully');
        fetchEvents();
      } else {
        toast.error(response.error || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      eventType: 'Announcement',
      batch: batches[0] || '',
      targetBatch: '',
      showOtherBatches: 'No',
      startDateTime: '',
      endDateTime: '',
      location: '',
      agenda: '',
      speakerInfo: '',
      files: [],
      urls: [],
      status: 'Active',
      notes: ''
    });
    setEditingId(null);
  };

  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return '';
    return new Date(dateTime).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-600/10 rounded-lg">
            <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Events & Announcements</h2>
            <p className="text-sm text-muted-foreground">Manage events and announcements</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-accent/30 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            {editingId ? 'Edit Event' : 'Create New Event/Announcement'}
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
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter event title"
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
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter event description"
                rows={3}
                required
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Event Type</label>
              <select
                value={formData.eventType || 'Announcement'}
                onChange={(e) => handleInputChange('eventType', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {EVENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Batch */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Batch <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.batch || ''}
                onChange={(e) => handleInputChange('batch', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select Batch</option>
                {batches.map(batch => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>
            </div>

            {/* Start DateTime */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Start Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.startDateTime || ''}
                onChange={(e) => handleInputChange('startDateTime', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            {/* End DateTime */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                End Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.endDateTime || ''}
                onChange={(e) => handleInputChange('endDateTime', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Event location or virtual link"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <select
                value={formData.status || 'Active'}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="Active">Active</option>
                <option value="Ended">Ended</option>
              </select>
            </div>

            {/* Agenda */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Agenda</label>
              <textarea
                value={formData.agenda || ''}
                onChange={(e) => handleInputChange('agenda', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Event agenda or details"
                rows={2}
              />
            </div>

            {/* Speaker Info */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Speaker/Host Information</label>
              <textarea
                value={formData.speakerInfo || ''}
                onChange={(e) => handleInputChange('speakerInfo', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Speaker or host details"
                rows={2}
              />
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
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="col-span-7">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={url.url}
                      onChange={(e) => handleUpdateURL(index, 'url', e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
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

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Notes (Internal)</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-green-500"
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
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Update Event' : 'Create Event'}
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

      {/* Events List */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Events & Announcements ({events.length})
          </h3>

          {loading && (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading events...
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No events found. Create your first event!</p>
          </div>
        )}

        {events.map(event => (
          <div key={event.id} className="p-4 bg-accent/30 rounded-lg border border-border">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{event.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="px-2 py-1 bg-green-600/10 text-green-600 dark:text-green-400 rounded">
                    {event.eventType}
                  </span>
                  <span>{event.batch}</span>
                  <span>{formatDateTime(event.startDateTime)}</span>
                  <span className={`px-2 py-1 rounded ${
                    event.status === 'Active'
                      ? 'bg-green-600/10 text-green-600 dark:text-green-400'
                      : 'bg-gray-600/10 text-gray-600 dark:text-gray-400'
                  }`}>
                    {event.status}
                  </span>
                </div>
                {event.location && (
                  <p className="text-xs text-muted-foreground mt-2">📍 {event.location}</p>
                )}
                {event.urls && event.urls.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <LinkIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-muted-foreground">
                      {event.urls.length} URL{event.urls.length > 1 ? 's' : ''} attached
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleEdit(event)}
                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(event.id!)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
