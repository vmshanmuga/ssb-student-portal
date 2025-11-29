/**
 * Exam Password Entry Page
 * Students enter password to verify exam access
 * Apple-inspired sleek design
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  Loader,
  KeyRound
} from 'lucide-react';
import { getExamById, verifyExamPassword, type Exam } from '../services/examApi';

const ExamPasswordEntry: React.FC = () => {
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

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
        // Normalize field names
        const normalized = {
          ...examData,
          examId: examData['Exam ID'] || examData.examId,
          examTitle: examData['Exam Title'] || examData.examTitle,
          passwordType: examData['Password Type'] || examData.passwordType,
          masterPassword: examData['Master Password'] || examData.masterPassword
        };
        setExam(normalized);
      } else {
        setError('Exam not found');
      }
    } catch (err) {
      setError('Failed to load exam');
      console.error('Error loading exam:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setError('Please enter the exam password');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const response = await verifyExamPassword(examId!, password);

      if (response.success) {
        // Check if it's a practice exam
        const isPractice = (exam as any)?.['Is Practice'] === 'Yes' || (exam as any)?.isPractice === true;

        if (isPractice) {
          // Skip consent/proctoring for practice exams, go directly to attempt
          navigate(`/exams/${examId}/attempt`);
        } else {
          // Regular exam, go to consent page for proctoring setup
          navigate(`/exams/${examId}/consent`);
        }
      } else {
        setError(response.message || 'Incorrect password. Please try again.');
        setVerifying(false);
      }
    } catch (err: any) {
      console.error('Password verification error:', err);
      setError(err.message || 'Failed to verify password. Please try again.');
      setVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerifyPassword();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error && !exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error}
          </h3>
          <button
            onClick={() => navigate('/exams')}
            className="mt-4 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-green-900/20 dark:to-emerald-900/20 flex items-center justify-center p-4">
      {/* Back Button */}
      <button
        onClick={() => navigate('/exams')}
        className="absolute top-6 left-6 p-2.5 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all"
      >
        <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </button>

      {/* Main Card */}
      <div className="w-full max-w-md">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <Lock className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Exam Password Required
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            {exam?.examTitle || 'Exam'}
          </p>

          {/* Password Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter Exam Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter password"
                  className="w-full pl-12 pr-12 py-3.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  disabled={verifying}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Verify Button */}
            <button
              onClick={handleVerifyPassword}
              disabled={verifying || !password.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold transition-all shadow-lg shadow-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Verify & Continue
                </>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <span className="font-medium">Need help?</span> If you don't have the exam password, please contact your instructor or check your email for password details.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          Make sure you have a stable internet connection before proceeding
        </p>
      </div>
    </div>
  );
};

export default ExamPasswordEntry;
