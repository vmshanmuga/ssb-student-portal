import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase/config';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import Overview from './pages/Overview';
import Dashboards from './pages/Dashboards';
import Announcements from './pages/Announcements';
import Resources from './pages/Resources';
import Calendar from './pages/Calendar';
import Forms from './pages/Forms';
import Policies from './pages/Policies';
import Profile from './pages/Profile';
import PlacementProfile from './pages/PlacementProfile';
import Exams from './pages/Exams';
import ExamPasswordEntry from './pages/ExamPasswordEntry';
import ExamConsent from './pages/ExamConsent';
import ExamAttempt from './pages/ExamAttempt';
import PracticeExamAttempt from './pages/PracticeExamAttempt';
import ExamResultPage from './pages/ExamResultPage';
import StudentsCorner from './pages/StudentsCorner';
import { SessionsPage } from './zoom/pages/SessionsPage';
import { VideoPlayerPage } from './zoom/pages/VideoPlayerPage';
import { NotesPopup } from './zoom/components/NotesPopup';
import { NotesPage } from './zoom/pages/NotesPage';
import { AdminPage } from './pages/AdminPage';
import { ZoomManagementPage } from './pages/admin/ZoomManagementPage';
import { ResourcesManagementPage } from './pages/admin/ResourcesManagementPage';
import { EventsManagementPage } from './pages/admin/EventsManagementPage';
import { PoliciesManagementPage } from './pages/admin/PoliciesManagementPage';
import { FormsManagementPage } from './pages/admin/FormsManagementPage';
import { FormBuilderPage } from './pages/admin/FormBuilderPage';
import { FormResponsesPage } from './pages/admin/FormResponsesPage';
import { FormFillPage } from './pages/FormFillPage';
import FormResponseView from './pages/FormResponseView';
import ExamManagementPage from './pages/admin/ExamManagementPage';
import ExamBuilderPage from './pages/admin/ExamBuilderPage';
import ExamViewPage from './pages/admin/ExamViewPage';
import { PlacementManagementPage } from './pages/admin/PlacementManagementPage';
import { JobPortalManagementPage } from './pages/admin/JobPortalManagementPage';
import { JobBuilderPage } from './pages/admin/JobBuilderPage';
import { JobResponsesPage } from './pages/admin/JobResponsesPage';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground text-xl">Loading SSB Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
            },
          }}
        />
        <Login />
      </>
    );
  }

  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
          },
        }}
      />
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          {/* Standalone video player route (opens in new tab without dashboard layout) */}
          <Route path="/video-player" element={<VideoPlayerPage />} />
          {/* Standalone notes popup route (opens in new window without dashboard layout) */}
          <Route path="/notes-popup" element={<NotesPopup />} />
          {/* Standalone exam routes (opens in new tab without dashboard layout) */}
          <Route path="/exams/:examId/verify" element={<ExamPasswordEntry />} />
          <Route path="/exams/:examId/consent" element={<ExamConsent />} />
          <Route path="/exams/:examId/attempt" element={<ExamAttempt />} />
          <Route path="/exams/:examId/practice" element={<PracticeExamAttempt />} />
          <Route path="/exams/result/:attemptId" element={<ExamResultPage />} />
          {/* Standalone job builder routes (opens in new tab without dashboard layout) */}
          <Route path="/admin/jobs/new" element={<JobBuilderPage />} />
          <Route path="/admin/jobs/:jobId/edit" element={<JobBuilderPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="overview" element={<Overview />} />
            <Route path="dashboards" element={<Dashboards />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/:term" element={<SessionsPage />} />
            <Route path="sessions/:term/:domain" element={<SessionsPage />} />
            <Route path="sessions/:term/:domain/:subject" element={<SessionsPage />} />
            <Route path="my-notes" element={<NotesPage />} />
            <Route path="my-notes/:term" element={<NotesPage />} />
            <Route path="my-notes/:term/:domain" element={<NotesPage />} />
            <Route path="my-notes/:term/:domain/:subject" element={<NotesPage />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="resources" element={<Resources />} />
            <Route path="resources/*" element={<Resources />} />
            <Route path="students-corner" element={<StudentsCorner />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="forms" element={<Forms />} />
            <Route path="forms/:formId/responses" element={<FormResponseView />} />
            <Route path="forms/:formId" element={<FormFillPage />} />
            <Route path="policies" element={<Policies />} />
            <Route path="exams" element={<Exams />} />
            <Route path="profile" element={<Profile />} />
            <Route path="profile/placement" element={<PlacementProfile />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="admin/zoom" element={<ZoomManagementPage />} />
            <Route path="admin/resources" element={<ResourcesManagementPage />} />
            <Route path="admin/events" element={<EventsManagementPage />} />
            <Route path="admin/policies" element={<PoliciesManagementPage />} />
            <Route path="admin/forms" element={<FormsManagementPage />} />
            <Route path="admin/forms/new" element={<FormBuilderPage />} />
            <Route path="admin/forms/:formId/edit" element={<FormBuilderPage />} />
            <Route path="admin/forms/:formId/responses" element={<FormResponsesPage />} />
            <Route path="admin/exams" element={<ExamManagementPage />} />
            <Route path="admin/exams/create" element={<ExamBuilderPage />} />
            <Route path="admin/exams/edit/:examId" element={<ExamBuilderPage />} />
            <Route path="admin/exams/view/:examId" element={<ExamViewPage />} />
            <Route path="admin/placement" element={<PlacementManagementPage />} />
            <Route path="admin/jobs" element={<JobPortalManagementPage />} />
            <Route path="admin/jobs/:jobId/responses" element={<JobResponsesPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;