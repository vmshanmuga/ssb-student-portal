/**
 * Exam Consent Page
 * Request permissions: Fullscreen, Webcam, Microphone, Screen Share
 * Apple-inspired sleek design with smooth animations
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Monitor,
  Video,
  Mic,
  Maximize,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Shield,
  AlertTriangle,
  Loader
} from 'lucide-react';
import { getExamById, type Exam } from '../services/examApi';

interface Permission {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  status: 'pending' | 'granted' | 'denied';
  required: boolean;
}

const ExamConsent: React.FC = () => {
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    if (examId) {
      loadExam();
    }
  }, [examId]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const response = await getExamById(examId!);
      if (response.success && response.data) {
        const examData = response.data;
        const normalized = {
          ...examData,
          examId: examData['Exam ID'] || examData.examId,
          examTitle: examData['Exam Title'] || examData.examTitle,
          settings: examData.settings
        };
        setExam(normalized);
        initializePermissions(normalized);
      }
    } catch (err) {
      console.error('Error loading exam:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializePermissions = (examData: Exam) => {
    const proctoring = examData.settings?.proctoring;

    const perms: Permission[] = [
      {
        id: 'fullscreen',
        name: 'Fullscreen Mode',
        icon: <Maximize className="w-6 h-6" />,
        description: 'Enter fullscreen mode to prevent distractions',
        status: 'pending',
        required: proctoring?.fullscreenMandatory !== false
      },
      {
        id: 'webcam',
        name: 'Webcam Access',
        icon: <Video className="w-6 h-6" />,
        description: 'Enable webcam for proctoring and identity verification',
        status: 'pending',
        required: proctoring?.webcamRequired !== false
      },
      {
        id: 'microphone',
        name: 'Microphone Access',
        icon: <Mic className="w-6 h-6" />,
        description: 'Enable microphone for audio proctoring',
        status: 'pending',
        required: false
      },
      {
        id: 'screenshare',
        name: 'Screen Sharing',
        icon: <Monitor className="w-6 h-6" />,
        description: 'Share your screen for comprehensive proctoring',
        status: 'pending',
        required: proctoring?.enforceScreensharing !== false
      }
    ];

    setPermissions(perms);
  };

  const requestFullscreen = async (): Promise<boolean> => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Fullscreen error:', error);
      return false;
    }
  };

  const requestMediaPermissions = async (): Promise<{ webcam: boolean; microphone: boolean }> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Store stream for later use
      (window as any).examMediaStream = stream;

      return { webcam: true, microphone: true };
    } catch (error) {
      console.error('Media permissions error:', error);
      return { webcam: false, microphone: false };
    }
  };

  const requestScreenShare = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      // Store stream for later use
      (window as any).examScreenStream = stream;

      // Re-enter fullscreen after screen share (screen share prompt exits fullscreen)
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (fsError) {
        console.warn('Could not re-enter fullscreen after screen share:', fsError);
      }

      return true;
    } catch (error) {
      console.error('Screen share error:', error);
      return false;
    }
  };

  const handleRequestPermissions = async () => {
    setRequesting(true);

    // Request permissions one by one
    for (const perm of permissions) {
      if (perm.id === 'fullscreen') {
        const granted = await requestFullscreen();
        updatePermissionStatus('fullscreen', granted ? 'granted' : 'denied');
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (perm.id === 'webcam' || perm.id === 'microphone') {
        const { webcam, microphone } = await requestMediaPermissions();
        updatePermissionStatus('webcam', webcam ? 'granted' : 'denied');
        updatePermissionStatus('microphone', microphone ? 'granted' : 'denied');
        await new Promise(resolve => setTimeout(resolve, 500));
      } else if (perm.id === 'screenshare') {
        const granted = await requestScreenShare();
        updatePermissionStatus('screenshare', granted ? 'granted' : 'denied');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    setRequesting(false);

    // Check if all required permissions are granted
    const allRequiredGranted = permissions
      .filter(p => p.required)
      .every(p => p.status === 'granted');

    if (allRequiredGranted) {
      // Navigate to exam attempt page
      setTimeout(() => {
        // Check if it's a practice exam
        const isPractice = (exam as any)['Is Practice'] === 'Yes' || (exam as any).isPractice === true;
        const route = isPractice ? `/exams/${examId}/practice` : `/exams/${examId}/attempt`;
        navigate(route);
      }, 1000);
    }
  };

  const updatePermissionStatus = (id: string, status: 'granted' | 'denied') => {
    setPermissions(prev =>
      prev.map(p => (p.id === id ? { ...p, status } : p))
    );
  };

  const allRequiredGranted = permissions
    .filter(p => p.required)
    .every(p => p.status === 'granted');

  const hasAnyGranted = permissions.some(p => p.status === 'granted');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-green-900/20 dark:to-emerald-900/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Main Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-8 text-white">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-center mb-2">
              Exam Permissions Required
            </h1>
            <p className="text-center text-green-100">
              {exam?.examTitle || 'Exam'}
            </p>
          </div>

          {/* Permissions List */}
          <div className="p-8 space-y-4">
            {permissions.map((perm, index) => (
              <div
                key={perm.id}
                className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                  perm.status === 'granted'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : perm.status === 'denied'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                }`}
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
                <div className="p-4 flex items-center gap-4">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      perm.status === 'granted'
                        ? 'bg-green-500 text-white'
                        : perm.status === 'denied'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {perm.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {perm.name}
                      </h3>
                      {perm.required && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {perm.description}
                    </p>
                  </div>

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {perm.status === 'granted' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : perm.status === 'denied' ? (
                      <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Warning */}
          {!hasAnyGranted && (
            <div className="mx-8 mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-300 mb-1">
                    Important Notice
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    All required permissions must be granted to proceed with the exam. Please allow access when prompted by your browser.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-8 pt-0 space-y-3">
            <button
              onClick={handleRequestPermissions}
              disabled={requesting || allRequiredGranted}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold transition-all shadow-lg shadow-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {requesting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Requesting Permissions...
                </>
              ) : allRequiredGranted ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  All Permissions Granted
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Grant Permissions
                </>
              )}
            </button>

            {allRequiredGranted && (
              <button
                onClick={() => {
                  const isPractice = (exam as any)['Is Practice'] === 'Yes' || (exam as any).isPractice === true;
                  const route = isPractice ? `/exams/${examId}/practice` : `/exams/${examId}/attempt`;
                  navigate(route);
                }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 animate-pulse"
              >
                <span>Proceed to Exam</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => navigate('/exams')}
              className="w-full py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-all"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 p-4 rounded-xl bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
            Your privacy is important. Camera and screen recordings are used solely for exam proctoring and will be reviewed only if violations are detected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExamConsent;
