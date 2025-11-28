export interface CorrectionPoint {
  questionId: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
  pointsAwarded: number;
  maxPoints: number;
}

export interface IntegrityAnalysis {
  isSuspicious: boolean;
  suspicionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'NONE';
  reasons: string[]; 
  plagiarismDetected?: boolean; 
  matchedStudentId?: string; 
}

export interface PracticeProblem {
  id: string;
  content: string; // The generated question text in LaTeX
}

export interface GradingResult {
  totalScore: number;
  maxTotalScore: number;
  summary: string;
  letterGrade: string;
  corrections: CorrectionPoint[];
  studentHandwritingTranscription: string;
  integrityAnalysis?: IntegrityAnalysis;
  
  // New Educational Fields
  textbookKnowledge?: string; // Core theory from textbooks
  solutionMethod?: string; // Step-by-step methodology
  practiceProblems?: PracticeProblem[]; // Remedial questions
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}

export interface UploadedFile {
  file: File;
  previewUrl: string;
  base64: string;
  id?: string; 
}

export interface StudentSubmission {
  id: string;
  studentName: string;
  studentId: string;
  submissionTime: number; 
  files: UploadedFile[];
  result?: GradingResult; 
  status: 'PENDING' | 'GRADED' | 'ERROR';
}

export interface QuestionConfig {
  id: string;
  label: string; 
  file: UploadedFile | null;
}

export interface ExamConfig {
  id: string;
  title: string;
  generalAnswerKey?: UploadedFile | null; 
  questions: QuestionConfig[]; 
  referenceFile: UploadedFile | null;
  instructions: string;
  createdRequest: number;
}

declare global {
  interface Window {
    MathJax: {
      typesetPromise: (elements?: HTMLElement[]) => Promise<void>;
      typeset: (elements?: HTMLElement[]) => void;
    } | any;
  }
}