import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, FileText, Clock, Users } from 'lucide-react';
import { auth } from '../firebase/config';
import { getForms, getUserFormResponses } from '../services/formsApi';
import { useAuth } from '../contexts/AuthContext';

interface RequiredForm {
  id: string;
  name: string;
  description: string;
  type: string;
  batch: string;
  term?: string;
  domain?: string;
  subject?: string;
  startDateTime: string;
  endDateTime?: string;
  visibleTo?: string;
}

const RequiredFormsModal: React.FC = () => {
  const [requiredForm, setRequiredForm] = useState<RequiredForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const user = auth.currentUser;
  const { student } = useAuth();

  // Parse date from backend format - handles multiple formats
  const parseDate = (dateStr: string) => {
    if (!dateStr) return null;

    // Check if it's ISO 8601 format (e.g., "2025-11-27T02:30:00.000Z")
    if (dateStr.includes('T') && (dateStr.includes('Z') || dateStr.includes('+'))) {
      return new Date(dateStr);
    }

    // Handle both formats: "DD-MMM-YYYY HH:mm:ss" and "DD/MM/YYYY HH:mm:ss"
    const parts = dateStr.split(' ');
    const timeParts = parts[1] ? parts[1].split(':') : ['0', '0', '0'];

    // Check if using new format (DD-MMM-YYYY) with dashes
    if (parts[0].includes('-')) {
      const dateParts = parts[0].split('-');
      const monthMap: { [key: string]: number } = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };

      const day = parseInt(dateParts[0]);
      const monthStr = dateParts[1].toLowerCase();
      const year = parseInt(dateParts[2]);
      const month = monthMap[monthStr];

      if (month === undefined) return null;

      return new Date(
        year,
        month,
        day,
        parseInt(timeParts[0]),
        parseInt(timeParts[1]),
        parseInt(timeParts[2])
      );
    } else {
      // Old format DD/MM/YYYY
      const dateParts = parts[0].split('/');
      return new Date(
        parseInt(dateParts[2]), // year
        parseInt(dateParts[1]) - 1, // month (0-indexed)
        parseInt(dateParts[0]), // day
        parseInt(timeParts[0]), // hours
        parseInt(timeParts[1]), // minutes
        parseInt(timeParts[2]) // seconds
      );
    }
  };

  // Calculate time remaining
  const calculateTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  useEffect(() => {
    if (user?.email) {
      // Add a small delay to avoid race conditions with other components fetching on mount
      const timer = setTimeout(() => {
        checkForRequiredForms();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.pathname]); // Re-check when user navigates

  // Update countdown timer every minute
  useEffect(() => {
    if (requiredForm?.endDateTime) {
      const updateTimer = () => {
        const endDate = parseDate(requiredForm.endDateTime!);
        if (endDate) {
          const remaining = calculateTimeRemaining(endDate);
          setTimeRemaining(remaining);
        }
      };

      updateTimer(); // Initial update
      const interval = setInterval(updateTimer, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [requiredForm]);

  const checkForRequiredForms = async () => {
    if (!user?.email) return;

    try {
      setLoading(true);

      // Fetch active forms with showAtStartUntilFilled = Yes
      const result = await getForms({
        isActive: 'Yes',
        showAtStartUntilFilled: 'Yes',
        includeUserEmail: true
      });

      if (result.success && result.data) {
        const forms = result.data as any[];

        // Check each form to see if user has completed it
        for (const form of forms) {
          // Check visibleTo filter - restrict form visibility by student email address
          if (form.visibleTo && form.visibleTo.trim() && form.visibleTo.trim().toLowerCase() !== 'all') {
            // Parse emails from visibleTo field (supports both comma-separated and newline-separated)
            const emailArray: string[] = form.visibleTo.split(/[\n,]+/);
            const allowedEmails = emailArray
              .map(email => email.trim().toLowerCase())
              .filter(email => email.length > 0);

            // Check if current user's email is in the allowed list
            const currentUserEmail = user?.email?.toLowerCase();
            if (currentUserEmail && !allowedEmails.includes(currentUserEmail)) {
              continue; // Skip this form if user's email is not in the list
            }
          }
          // If visibleTo is empty or "All", show to all students in the batch (backend already filters by batch)

          // Check if within date range
          const now = new Date();
          const start = form.startDateTime ? parseDate(form.startDateTime) : null;
          const end = form.endDateTime ? parseDate(form.endDateTime) : null;

          // Skip if not yet started or already ended
          if (start && now < start) {
            continue;
          }
          if (end && now > end) {
            continue;
          }

          // Check if user has completed this form
          const responsesResult = await getUserFormResponses(form.id);

          if (responsesResult.success && responsesResult.data) {
            const responses = responsesResult.data as any[];
            const completedResponse = responses.find(r => r.isComplete === 'Yes');

            // If not completed, this is the required form to show
            if (!completedResponse) {
              console.log('📝 Setting required form (not completed):', form);
              setRequiredForm(form);
              setLoading(false);
              return;
            }
          } else {
            // No responses yet, so form is not completed
            console.log('📝 Setting required form (no responses):', form);
            setRequiredForm(form);
            setLoading(false);
            return;
          }
        }

        // No required forms to show
        setRequiredForm(null);
      }
    } catch (error) {
      // Silently fail - this is usually a transient error during initial page load
      // The component will retry when user navigates or refreshes
      setRequiredForm(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFillForm = () => {
    if (requiredForm) {
      navigate(`/forms/${requiredForm.id}`);
    }
  };

  // Don't show modal for admin users
  if (student?.isAdmin) {
    return null;
  }

  // Don't render anything if loading or no required form
  if (loading || !requiredForm) {
    return null;
  }

  // Don't show modal if user is currently on the form fill page for this specific form
  // This allows them to fill the form without the modal blocking them
  if (location.pathname === `/forms/${requiredForm.id}`) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full shadow-2xl border-2 border-primary animate-in fade-in zoom-in duration-300">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Required Form</h2>
              <p className="text-sm text-muted-foreground">Please complete this form to continue</p>
            </div>
          </div>

          {/* Form Details */}
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <FileText className="h-6 w-6 text-primary mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{requiredForm.name}</h3>

                  {requiredForm.description && (
                    <p className="text-muted-foreground mb-3">{requiredForm.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                      Required
                    </Badge>

                    <Badge variant="outline">
                      {requiredForm.type}
                    </Badge>

                    {requiredForm.batch && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {requiredForm.batch}
                      </Badge>
                    )}

                    {(requiredForm.term || requiredForm.domain || requiredForm.subject) && (
                      <Badge variant="outline">
                        {[requiredForm.term, requiredForm.domain, requiredForm.subject].filter(Boolean).join(' • ')}
                      </Badge>
                    )}

                    {requiredForm.endDateTime && timeRemaining && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeRemaining}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  This form must be completed to continue using the portal. You can access other tabs after filling this form.
                </span>
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleFillForm}
              size="lg"
              className="px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <FileText className="h-5 w-5 mr-2" />
              Fill Form Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RequiredFormsModal;
