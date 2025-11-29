/**
 * Question Builder Modal
 * Modal for adding/editing exam questions with support for:
 * - MCQ (Multiple Choice)
 * - MCQ_IMAGE (Multiple Choice with Image)
 * - SHORT_ANSWER (Short Answer)
 * - LONG_ANSWER (Long Answer)
 */

import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Upload, Plus, Minus } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import type { Question } from '../../../services/examApi';

interface QuestionBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => void;
  editingQuestion?: Question | null;
  questionNumber: number;
}

const QuestionBuilderModal: React.FC<QuestionBuilderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingQuestion,
  questionNumber
}) => {
  const [questionData, setQuestionData] = useState<Partial<Question>>({
    questionType: 'MCQ',
    questionText: '',
    marks: 1,
    negativeMarks: 0,
    difficulty: 'Medium',
    enableRoughSpace: false
  });

  const [imagePreview, setImagePreview] = useState<string>('');
  const [numberOfOptions, setNumberOfOptions] = useState<number>(4); // Default: A, B, C, D
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    if (editingQuestion) {
      setQuestionData(editingQuestion);
      if (editingQuestion.questionImageUrl) {
        setImagePreview(editingQuestion.questionImageUrl);
      }
      // Count existing options
      const options = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      let count = 2; // Minimum A and B
      for (let i = 2; i < options.length; i++) {
        const optionKey = `option${options[i]}` as keyof Question;
        if (editingQuestion[optionKey]) {
          count = i + 1;
        }
      }
      setNumberOfOptions(Math.max(4, count)); // Minimum 4 options (A-D)
    } else {
      setQuestionData({
        questionType: 'MCQ',
        questionText: '',
        marks: 1,
        negativeMarks: 0,
        difficulty: 'Medium',
        enableRoughSpace: false
      });
      setImagePreview('');
      setNumberOfOptions(4);
    }
  }, [editingQuestion, isOpen]);

  const handleChange = (field: keyof Question, value: any) => {
    setQuestionData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, just show preview. In production, upload to Google Drive
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        handleChange('questionImageUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    // Clear previous errors
    setValidationError('');

    // Validation
    if (!questionData.questionText?.trim()) {
      setValidationError('Question text is required');
      return;
    }

    if (questionData.questionType === 'MCQ' || questionData.questionType === 'MCQ_IMAGE') {
      if (!questionData.optionA || !questionData.optionB) {
        setValidationError('At least options A and B are required for MCQ questions');
        return;
      }
      if (!questionData.correctAnswer) {
        setValidationError('Please select the correct answer');
        return;
      }
    }

    const finalQuestion: Question = {
      ...questionData as Question,
      questionNumber: editingQuestion?.questionNumber || questionNumber,
      questionId: editingQuestion?.questionId || `Q${Date.now()}`
    };

    onSave(finalQuestion);
    onClose();
  };

  if (!isOpen) return null;

  const isMCQ = questionData.questionType === 'MCQ' || questionData.questionType === 'MCQ_IMAGE';
  const showImageUpload = questionData.questionType === 'MCQ_IMAGE';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingQuestion ? 'Edit Question' : `Add Question ${questionNumber}`}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Question Type <span className="text-red-500">*</span>
            </label>
            <select
              value={questionData.questionType}
              onChange={(e) => handleChange('questionType', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="MCQ">Multiple Choice (Text)</option>
              <option value="MCQ_IMAGE">Multiple Choice (With Image)</option>
              <option value="SHORT_ANSWER">Short Answer</option>
              <option value="LONG_ANSWER">Long Answer</option>
            </select>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Question Text <span className="text-red-500">*</span>
            </label>
            <ReactQuill
              theme="snow"
              value={questionData.questionText || ''}
              onChange={(value) => handleChange('questionText', value)}
              placeholder="Enter your question here..."
              className="bg-white dark:bg-gray-700 rounded-lg"
              modules={{
                toolbar: [
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  [{ 'script': 'sub'}, { 'script': 'super' }],
                  ['formula', 'code-block'],
                  ['clean']
                ]
              }}
            />
          </div>

          {/* Image Upload (for MCQ_IMAGE) */}
          {showImageUpload && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Question Image
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                {imagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Question"
                      className="max-h-64 mx-auto rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setImagePreview('');
                        handleChange('questionImageUrl', '');
                      }}
                      className="text-sm text-red-600 dark:text-red-400 hover:underline"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Click to upload image
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      PNG, JPG up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* MCQ Options */}
          {isMCQ && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Answer Options <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                    ({numberOfOptions} options)
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNumberOfOptions(Math.max(2, numberOfOptions - 1))}
                    disabled={numberOfOptions <= 2}
                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove option"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setNumberOfOptions(Math.min(10, numberOfOptions + 1))}
                    disabled={numberOfOptions >= 10}
                    className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Add option"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, numberOfOptions).map((option) => (
                <div key={option} className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={questionData.correctAnswer === option}
                    onChange={() => handleChange('correctAnswer', option)}
                    className="mt-3"
                  />
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Option {option} {(option === 'A' || option === 'B') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={questionData[`option${option}` as keyof Question] as string || ''}
                      onChange={(e) => handleChange(`option${option}` as keyof Question, e.target.value)}
                      placeholder={`Enter option ${option}`}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required={option === 'A' || option === 'B'}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select the radio button next to the correct answer. Use +/- buttons to add/remove options (2-10 options).
              </p>
            </div>
          )}

          {/* Marks, Negative Marks, Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Marks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={questionData.marks || 1}
                onChange={(e) => handleChange('marks', parseFloat(e.target.value))}
                min="0.5"
                step="0.5"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Negative Marks
              </label>
              <input
                type="number"
                value={questionData.negativeMarks || 0}
                onChange={(e) => handleChange('negativeMarks', parseFloat(e.target.value))}
                min="0"
                step="0.25"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty <span className="text-red-500">*</span>
              </label>
              <select
                value={questionData.difficulty}
                onChange={(e) => handleChange('difficulty', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Explanation (Optional)
            </label>
            <textarea
              value={questionData.explanation || ''}
              onChange={(e) => handleChange('explanation', e.target.value)}
              placeholder="Provide an explanation for the correct answer..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Enable Rough Space */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableRoughSpace"
              checked={questionData.enableRoughSpace || false}
              onChange={(e) => handleChange('enableRoughSpace', e.target.checked)}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label htmlFor="enableRoughSpace" className="text-sm text-gray-700 dark:text-gray-300">
              Enable rough space for this question
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          {validationError && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <X className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              {editingQuestion ? 'Update Question' : 'Add Question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBuilderModal;
