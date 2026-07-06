export type UserRole = "admin" | "user";
export type QuestionType = "single" | "multiple" | "drag";
export type ExamStatus = "in_progress" | "completed" | "abandoned";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  current_stage: number;
  max_passed_stage: number;
  certificate_issued_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface DragOptions {
  left: QuestionOption[];
  right: QuestionOption[];
}

export interface DragPair {
  left: string;
  right: string;
}

export interface Question {
  id: string;
  stage_id: number;
  type: QuestionType;
  content: string;
  options: QuestionOption[] | DragOptions;
  correct_answer: string | string[] | DragPair[];
  explanation: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LearningProgress {
  id: string;
  user_id: string;
  stage_id: number;
  question_order: string[];
  viewed_question_ids: string[];
  learning_completed: boolean;
  learning_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamRecord {
  id: string;
  user_id: string;
  stage_id: number;
  question_ids: string[];
  answers: Record<string, string | string[] | DragPair[]>;
  total_questions: number;
  correct_count: number;
  score: number;
  passed: boolean;
  status: ExamStatus;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export type UserAnswer = string | string[] | DragPair[];
