/**
 * Exam Management API Service
 * Handles all exam-related API calls to Google Apps Script backend
 */

import { auth } from '../firebase/config';
import { requestCache } from '../utils/requestCache';

const EXAM_API_URL = process.env.REACT_APP_BACKEND_API_URL || '';

// Types
export interface ExamBasicDetails {
  examTitle: string;
  examType: string;
  batch?: string;
  term: string;
  domain: string;
  subject: string;
  description?: string;
  duration: number;
  totalMarks: number;
  passingMarks: number;
  startDateTime: string;
  endDateTime: string;
  instructions?: string;
}

export interface ProctoringSettings {
  webcamRequired: boolean;
  enforceScreensharing: boolean;
  allowWindowSwitching: boolean;
  alertsOnViolation: boolean;
  beepAlerts: boolean;
  allowTextSelection: boolean;
  allowCopyPaste: boolean;
  allowRightClick: boolean;
  allowRestrictedEvents: boolean;
  allowTabSwitching: boolean;
  exitCloseWarnings: boolean;
  fullscreenMandatory: boolean;
  singleSessionLogin: boolean;
  logoutOnViolation: boolean;
  disqualifyOnViolation: boolean;
  maxViolationsBeforeAction: number;
  allowedIPs: string[];
  ipRestrictionEnabled: boolean;
}

export interface ExamSettings {
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  enableRoughSpace: boolean;
  enableNegativeMarking: boolean;
  negativeMarksValue: number;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  autoSubmitOnTimeUp: boolean;
  gracePeriod: number;
  proctoring: ProctoringSettings;
}

export interface Question {
  questionId?: string;
  questionNumber?: number;
  questionType: 'MCQ' | 'MCQ_IMAGE' | 'SHORT_ANSWER' | 'LONG_ANSWER';
  questionText: string;
  questionImageUrl?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  optionE?: string;
  optionF?: string;
  optionG?: string;
  optionH?: string;
  optionI?: string;
  optionJ?: string;
  correctAnswer?: string;
  marks: number;
  negativeMarks: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  explanation?: string;
  enableRoughSpace: boolean;
}

export interface PasswordConfig {
  passwordType: 'SAME' | 'UNIQUE';
  masterPassword?: string;
  studentCount?: number;
  studentList?: Array<{
    studentId: string;
    studentName: string;
    studentEmail: string;
  }>;
}

export interface Exam extends ExamBasicDetails {
  examId?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  passwordType: 'SAME' | 'UNIQUE';
  masterPassword?: string;
  settings?: ExamSettings;
  questions?: Question[];
  createdBy?: string;
  createdAt?: string;
  publishedAt?: string;
  totalQuestions?: number;
  totalStudentsAttempted?: number;
  averageScore?: number;
  isPractice?: boolean;
  viewResult?: 'Yes' | 'No';
  // Backend returns fields with spaces
  'Exam ID'?: string;
  'Exam Title'?: string;
  'Exam Type'?: string;
  Term?: string;
  Domain?: string;
  Subject?: string;
  Description?: string;
  'Duration (minutes)'?: number;
  'Total Marks'?: number;
  'Passing Marks'?: number;
  'Start DateTime'?: string;
  'End DateTime'?: string;
  Instructions?: string;
  Status?: string;
  'Password Type'?: string;
  'Master Password'?: string;
  'Total Questions'?: number;
  'Is Practice'?: string;
  'View Result'?: string;
  highestScore?: number;
  lowestScore?: number;
}

export interface ExamFilters {
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  examType?: 'Quiz' | 'Mid-Term' | 'End-Term';
  term?: 'Term 1' | 'Term 2' | 'Term 3';
  search?: string;
}

// ============================================================================
// EXAM MANAGEMENT APIS
// ============================================================================

/**
 * Get term structure (terms, domains, subjects, batches) from backend
 */
export async function getTermStructure(): Promise<any> {
  const params = new URLSearchParams({
    action: 'getTermStructure',
  });

  const response = await fetch(`${EXAM_API_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch term structure');
  }

  return response.json();
}

/**
 * Get exam types from CATEGORY&TYPE sheet where Category = 'EXAM'
 */
export async function getExamTypes(): Promise<any> {
  const params = new URLSearchParams({
    action: 'getExamTypes',
  });

  const response = await fetch(`${EXAM_API_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch exam types');
  }

  return response.json();
}

/**
 * Initialize exam sheets in Google Sheets (one-time setup)
 */
export async function initializeExamSheets(): Promise<any> {
  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'initializeExamSheets'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to initialize exam sheets');
  }

  return response.json();
}

/**
 * Create a new exam
 */
export async function createExam(examData: Partial<Exam>): Promise<any> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  // Add createdBy email to examData
  const examDataWithCreator = {
    ...examData,
    createdBy: user.email
  };

  // Use text/plain to avoid CORS preflight (same pattern as Forms API)
  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'createExam',
      userEmail: user.email,
      examData: examDataWithCreator
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create exam');
  }

  return response.json();
}

/**
 * Get all exams with optional filters
 */
export async function getAllExams(filters?: ExamFilters): Promise<any> {
  const params = new URLSearchParams();
  params.append('action', 'getAllExams');

  if (filters?.status) params.append('status', filters.status);
  if (filters?.examType) params.append('examType', filters.examType);
  if (filters?.term) params.append('term', filters.term);
  if (filters?.search) params.append('search', filters.search);

  const url = `${EXAM_API_URL}?${params.toString()}`;

  // Use request cache to prevent duplicate calls
  return requestCache.fetch(url, filters, async () => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch exams');
    }

    return response.json();
  });
}

/**
 * Get a single exam by ID
 */
export async function getExamById(examId: string): Promise<any> {
  const params = new URLSearchParams({
    action: 'getExamById',
    examId
  });

  const response = await fetch(`${EXAM_API_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch exam');
  }

  return response.json();
}

/**
 * Update an existing exam
 */
export async function updateExam(examId: string, updates: Partial<Exam>): Promise<any> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  // Use text/plain to avoid CORS preflight (same pattern as Forms API)
  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'updateExam',
      userEmail: user.email,
      examId,
      updates
    })
  });

  if (!response.ok) {
    throw new Error('Failed to update exam');
  }

  return response.json();
}

/**
 * Delete an exam
 */
export async function deleteExam(examId: string): Promise<any> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  // Use text/plain to avoid CORS preflight (same pattern as Forms API)
  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'deleteExam',
      userEmail: user.email,
      examId
    })
  });

  if (!response.ok) {
    throw new Error('Failed to delete exam');
  }

  return response.json();
}

/**
 * Publish an exam (change status from DRAFT to ACTIVE)
 */
export async function publishExam(examId: string): Promise<any> {
  return updateExam(examId, {
    status: 'ACTIVE',
    publishedAt: new Date().toISOString()
  });
}

// ============================================================================
// QUESTION MANAGEMENT APIS
// ============================================================================

/**
 * Add a question to an exam
 */
export async function addQuestion(examId: string, questionData: Question): Promise<any> {
  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'addQuestion',
      examId,
      questionData
    })
  });

  if (!response.ok) {
    throw new Error('Failed to add question');
  }

  return response.json();
}

/**
 * Update a question
 */
export async function updateQuestion(
  examId: string,
  questionId: string,
  updates: Partial<Question>
): Promise<any> {
  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'updateQuestion',
      examId,
      questionId,
      updates
    })
  });

  if (!response.ok) {
    throw new Error('Failed to update question');
  }

  return response.json();
}

/**
 * Delete a question
 */
export async function deleteQuestion(examId: string, questionId: string): Promise<any> {
  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'deleteQuestion',
      examId,
      questionId
    })
  });

  if (!response.ok) {
    throw new Error('Failed to delete question');
  }

  return response.json();
}

/**
 * Reorder questions
 */
export async function reorderQuestions(examId: string, questionOrder: string[]): Promise<any> {
  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'reorderQuestions',
      examId,
      questionOrder
    })
  });

  if (!response.ok) {
    throw new Error('Failed to reorder questions');
  }

  return response.json();
}

// ============================================================================
// PASSWORD MANAGEMENT APIS
// ============================================================================

/**
 * Generate unique passwords for students
 */
export async function generatePasswords(examId: string, studentCount: number): Promise<any> {
  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'generatePasswords',
      examId,
      studentCount
    })
  });

  if (!response.ok) {
    throw new Error('Failed to generate passwords');
  }

  return response.json();
}

/**
 * Save student passwords to sheet
 */
export async function saveStudentPasswords(
  examId: string,
  passwordData: Array<{
    studentId: string;
    studentName?: string;
    studentEmail?: string;
    password: string;
  }>
): Promise<any> {
  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'savePasswords',
      examId,
      passwordData
    })
  });

  if (!response.ok) {
    throw new Error('Failed to save passwords');
  }

  return response.json();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if exam is currently live
 */
export function isExamLive(exam: Exam): boolean {
  const examAny = exam as any;
  const status = examAny.Status || exam.status;

  if (status !== 'ACTIVE') return false;

  const now = new Date().getTime();
  // Backend returns fields with spaces, check both formats
  const startDateTimeStr = examAny['Start DateTime'] || exam.startDateTime;
  const endDateTimeStr = examAny['End DateTime'] || exam.endDateTime;

  if (!startDateTimeStr || !endDateTimeStr) return false;

  const start = new Date(startDateTimeStr).getTime();
  const end = new Date(endDateTimeStr).getTime();

  return now >= start && now <= end;
}

/**
 * Check if exam is upcoming
 */
export function isExamUpcoming(exam: Exam): boolean {
  const examAny = exam as any;
  const status = examAny.Status || exam.status;

  if (status !== 'ACTIVE') return false;

  const now = new Date().getTime();
  // Backend returns fields with spaces, check both formats
  const startDateTimeStr = examAny['Start DateTime'] || exam.startDateTime;

  if (!startDateTimeStr) return false;

  const start = new Date(startDateTimeStr).getTime();

  return now < start;
}

/**
 * Get time remaining until exam starts
 */
export function getTimeUntilStart(exam: Exam): string {
  const examAny = exam as any;
  // Backend returns fields with spaces, check both formats
  const startDateTimeStr = examAny['Start DateTime'] || exam.startDateTime;

  if (!startDateTimeStr) return 'Unknown';

  const now = new Date().getTime();
  const start = new Date(startDateTimeStr).getTime();
  const diff = start - now;

  if (diff <= 0) return 'Started';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Format datetime for display
 */
export function formatExamDateTime(dateTimeString: string): string {
  const date = new Date(dateTimeString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Validate exam before publishing
 */
export function validateExam(exam: Partial<Exam>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic details validation
  if (!exam.examTitle) errors.push('Exam title is required');
  if (!exam.examType) errors.push('Exam type is required');
  if (!exam.term) errors.push('Term is required');
  if (!exam.domain) errors.push('Domain is required');
  if (!exam.subject) errors.push('Subject is required');
  if (!exam.duration || exam.duration < 1) errors.push('Duration must be at least 1 minute');
  if (!exam.totalMarks || exam.totalMarks <= 0) errors.push('Total marks must be greater than 0');
  if (!exam.startDateTime) errors.push('Start date/time is required');
  if (!exam.endDateTime) errors.push('End date/time is required');

  // Instructions validation (now required)
  if (!exam.instructions || exam.instructions.trim().length === 0) {
    errors.push('Exam instructions are required');
  }

  // Date validation
  if (exam.startDateTime && exam.endDateTime) {
    const start = new Date(exam.startDateTime).getTime();
    const end = new Date(exam.endDateTime).getTime();

    if (start >= end) {
      errors.push('Start time must be before end time');
    }
  }

  // Question validation
  if (!exam.questions || exam.questions.length === 0) {
    errors.push('At least one question is required');
  }

  // Password validation (skip for practice exams)
  const isPractice = (exam as any).isPractice === true;
  if (!isPractice) {
    if (!exam.passwordType) {
      errors.push('Password configuration is required');
    } else if (exam.passwordType === 'SAME' && !exam.masterPassword) {
      errors.push('Master password is required');
    }
  }

  // Passing marks validation (now optional, but if provided must be valid)
  if (exam.passingMarks !== undefined && exam.passingMarks !== null && exam.totalMarks && exam.passingMarks > exam.totalMarks) {
    errors.push('Passing marks cannot exceed total marks');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// STUDENT EXAM ATTEMPT APIS
// ============================================================================

/**
 * Verify exam password
 */
export async function verifyExamPassword(examId: string, password: string): Promise<any> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'verifyExamPassword',
      examId,
      password,
      studentEmail: user.email
    })
  });

  if (!response.ok) {
    throw new Error('Failed to verify password');
  }

  return response.json();
}

/**
 * Start exam attempt
 */
export async function startExamAttempt(examId: string, studentName: string): Promise<any> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'startExamAttempt',
      examId,
      studentEmail: user.email,
      studentName
    })
  });

  if (!response.ok) {
    throw new Error('Failed to start exam attempt');
  }

  return response.json();
}

/**
 * Save answer for a question
 */
export async function saveAnswer(
  attemptId: string,
  examId: string,
  questionId: string,
  answer: string
): Promise<any> {
  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'saveAnswer',
      attemptId,
      examId,
      questionId,
      answer
    })
  });

  if (!response.ok) {
    throw new Error('Failed to save answer');
  }

  return response.json();
}

/**
 * Log proctoring violation
 */
export async function logViolation(
  attemptId: string,
  examId: string,
  violationType: 'tab_switch' | 'window_blur' | 'fullscreen_exit' | 'copy' | 'paste' | 'right_click' | 'screenshot' | 'webcam_off' | 'microphone_off',
  details: string
): Promise<any> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'logViolation',
      attemptId,
      examId,
      studentEmail: user.email,
      violationType,
      details
    })
  });

  if (!response.ok) {
    throw new Error('Failed to log violation');
  }

  return response.json();
}

/**
 * Upload screenshot
 */
export async function uploadScreenshot(
  attemptId: string,
  examId: string,
  screenshotBase64: string,
  type: 'periodic' | 'violation'
): Promise<any> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'uploadScreenshot',
      attemptId,
      examId,
      studentEmail: user.email,
      screenshot: screenshotBase64,
      type
    })
  });

  if (!response.ok) {
    throw new Error('Failed to upload screenshot');
  }

  return response.json();
}

/**
 * Submit exam
 */
export async function submitExam(
  attemptId: string,
  examId: string,
  answers: Array<{ questionId: string; answer: string; flagged: boolean }>,
  violations: any[],
  timeSpent: number
): Promise<any> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(EXAM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({
      action: 'submitExam',
      attemptId,
      examId,
      studentEmail: user.email,
      answers,
      violations,
      timeSpent
    })
  });

  if (!response.ok) {
    throw new Error('Failed to submit exam');
  }

  return response.json();
}

/**
 * Get exam result
 */
export async function getExamResult(attemptId: string): Promise<any> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  const params = new URLSearchParams({
    action: 'getExamResult',
    attemptId,
    studentEmail: user.email
  });

  const response = await fetch(`${EXAM_API_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch exam result');
  }

  return response.json();
}

/**
 * Get student's exam attempts
 */
export async function getStudentExamAttempts(examId?: string): Promise<any> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  const params = new URLSearchParams({
    action: 'getStudentAttempts',
    studentEmail: user.email
  });

  if (examId) {
    params.append('examId', examId);
  }

  const response = await fetch(`${EXAM_API_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch exam attempts');
  }

  return response.json();
}

/**
 * Get student's exam status from Response Sheet's Status subsheet
 * Returns status: "Completed" | "Disqualified" | null
 */
export async function getStudentExamStatus(examId: string): Promise<any> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error('User not authenticated');
  }

  const params = new URLSearchParams({
    action: 'getStudentExamStatus',
    examId,
    studentEmail: user.email
  });

  const response = await fetch(`${EXAM_API_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch exam status');
  }

  return response.json();
}
