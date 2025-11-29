import React, { useState } from 'react';
import { Plus, GripVertical, Edit2, Trash2, AlertCircle } from 'lucide-react';
import type { Question } from '../../../services/examApi';
import QuestionBuilderModal from './QuestionBuilderModal';

interface QuestionsTabProps {
  questions: Question[];
  onQuestionsChange: (questions: Question[]) => void;
}

export default function QuestionsTab({ questions, onQuestionsChange }: QuestionsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setIsModalOpen(true);
  };

  const handleEditQuestion = (question: Question, index: number) => {
    setEditingQuestion(question);
    setIsModalOpen(true);
  };

  const handleSaveQuestion = (question: Question) => {
    if (editingQuestion) {
      // Update existing question
      const updatedQuestions = questions.map((q) =>
        q.questionId === editingQuestion.questionId ? question : q
      );
      onQuestionsChange(updatedQuestions);
    } else {
      // Add new question
      const newQuestion = {
        ...question,
        questionNumber: questions.length + 1
      };
      onQuestionsChange([...questions, newQuestion]);
    }
  };

  const handleDeleteQuestion = (index: number) => {
    setDeleteIndex(index);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteIndex !== null) {
      const updatedQuestions = questions.filter((_, i) => i !== deleteIndex);
      // Renumber questions
      const renumbered = updatedQuestions.map((q, i) => ({
        ...q,
        questionNumber: i + 1
      }));
      onQuestionsChange(renumbered);
      setShowDeleteConfirm(false);
      setDeleteIndex(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteIndex(null);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const updatedQuestions = [...questions];
    const [draggedQuestion] = updatedQuestions.splice(draggedIndex, 1);
    updatedQuestions.splice(dropIndex, 0, draggedQuestion);

    // Renumber questions
    const renumbered = updatedQuestions.map((q, i) => ({
      ...q,
      questionNumber: i + 1
    }));

    onQuestionsChange(renumbered);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Strip HTML tags for preview
  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Questions</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Add and manage exam questions</p>
        </div>
        <button
          onClick={handleAddQuestion}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No questions added yet</p>
          <button
            onClick={handleAddQuestion}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors mx-auto"
          >
            <Plus className="w-4 h-4" />
            Add First Question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => (
            <div
              key={question.questionId || index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-500 transition-colors bg-white dark:bg-gray-800 ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <GripVertical className="w-5 h-5 text-gray-400 dark:text-gray-500 cursor-move flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Q{question.questionNumber || index + 1}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    {question.questionType}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                  </span>
                  {question.negativeMarks > 0 && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      -{question.negativeMarks} negative
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    question.difficulty === 'Easy'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : question.difficulty === 'Hard'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  }`}>
                    {question.difficulty}
                  </span>
                </div>
                <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
                  {stripHtml(question.questionText)}
                </p>
                {question.questionType === 'MCQ' || question.questionType === 'MCQ_IMAGE' ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>Correct: {question.correctAnswer}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleEditQuestion(question, index)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  title="Edit question"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteQuestion(index)}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Delete question"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Question Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Questions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{questions.length}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Marks</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {questions.reduce((sum, q) => sum + (q.marks || 0), 0)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Marks/Question</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {questions.length > 0
              ? (questions.reduce((sum, q) => sum + (q.marks || 0), 0) / questions.length).toFixed(1)
              : '0'}
          </p>
        </div>
      </div>

      {/* Question Builder Modal */}
      <QuestionBuilderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveQuestion}
        editingQuestion={editingQuestion}
        questionNumber={questions.length + 1}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Delete Question
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Are you sure you want to delete this question? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
