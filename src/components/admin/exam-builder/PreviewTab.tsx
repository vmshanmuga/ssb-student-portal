import React from 'react';
import { CheckCircle2, Clock, FileText, Settings, Lock, AlertCircle } from 'lucide-react';

interface PreviewTabProps {
  examData: any;
  onPublish: () => void;
}

export default function PreviewTab({ examData, onPublish }: PreviewTabProps) {
  const isPractice = examData.isPractice === true;

  const allChecks = [
    {
      label: 'Basic details completed',
      completed: examData.examTitle && examData.examType && examData.subject,
      icon: FileText
    },
    {
      label: 'At least one question added',
      completed: (examData.questions || []).length > 0,
      icon: FileText
    },
    {
      label: 'Duration and marks configured',
      completed: examData.duration > 0 && examData.totalMarks > 0,
      icon: Clock
    },
    {
      label: 'Password configured',
      completed: examData.passwordType === 'UNIQUE' || examData.masterPassword,
      icon: Lock,
      hideForPractice: true
    },
    {
      label: 'Settings configured',
      completed: examData.settings && examData.settings.proctoring,
      icon: Settings,
      hideForPractice: true
    }
  ];

  // Filter checks based on practice mode
  const readinessChecks = isPractice
    ? allChecks.filter(check => !check.hideForPractice)
    : allChecks;

  const allChecksCompleted = readinessChecks.every(check => check.completed);

  return (
    <div className="space-y-6">
      {/* Exam Summary */}
      <div className="p-6 border border-border rounded-xl bg-card">
        <h3 className="text-xl font-bold text-foreground mb-4">{examData.examTitle || 'Untitled Exam'}</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="font-medium text-foreground">{examData.examType || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Subject</p>
            <p className="font-medium text-foreground">{examData.subject || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-medium text-foreground">{examData.duration || 0} mins</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Marks</p>
            <p className="font-medium text-foreground">{examData.totalMarks || 0}</p>
          </div>
        </div>

        {examData.description && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-1">Description</p>
            <p className="text-sm text-foreground">{examData.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Start Date & Time</p>
            <p className="text-sm font-medium text-foreground">{examData.startDateTime || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">End Date & Time</p>
            <p className="text-sm font-medium text-foreground">{examData.endDateTime || 'Not set'}</p>
          </div>
        </div>
      </div>

      {/* Readiness Checklist */}
      <div className="p-6 border border-border rounded-xl bg-card">
        <h4 className="font-semibold text-foreground mb-4">Pre-Publish Checklist</h4>
        <div className="space-y-3">
          {readinessChecks.map((check, index) => {
            const Icon = check.icon;
            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  check.completed
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-orange-500/10 border border-orange-500/20'
                }`}
              >
                {check.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                )}
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{check.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Questions Summary */}
      <div className="p-6 border border-border rounded-xl bg-card">
        <h4 className="font-semibold text-foreground mb-4">Questions Summary</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-secondary/10 rounded-lg">
            <p className="text-2xl font-bold text-foreground">{(examData.questions || []).length}</p>
            <p className="text-sm text-muted-foreground">Total Questions</p>
          </div>
          <div className="text-center p-4 bg-secondary/10 rounded-lg">
            <p className="text-2xl font-bold text-foreground">
              {(examData.questions || []).reduce((sum: number, q: any) => sum + (q.Marks || 0), 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total Marks</p>
          </div>
          <div className="text-center p-4 bg-secondary/10 rounded-lg">
            <p className="text-2xl font-bold text-foreground">{examData.passingMarks || 0}</p>
            <p className="text-sm text-muted-foreground">Passing Marks</p>
          </div>
        </div>
      </div>

      {/* Publish Button */}
      <div className="flex items-center justify-between p-6 border border-border rounded-xl bg-card">
        <div>
          <p className="font-medium text-foreground mb-1">Ready to publish?</p>
          <p className="text-sm text-muted-foreground">
            {allChecksCompleted
              ? 'Your exam is ready to be published!'
              : 'Please complete all checklist items before publishing'}
          </p>
        </div>
        <button
          onClick={onPublish}
          disabled={!allChecksCompleted}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            allChecksCompleted
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-secondary text-secondary-foreground cursor-not-allowed opacity-50'
          }`}
        >
          Publish Exam
        </button>
      </div>
    </div>
  );
}
