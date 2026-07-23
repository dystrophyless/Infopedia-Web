export interface Topic {
  public_id?: string;
  name?: string;
  page_start?: number;
  page_end?: number;
  book?: {
    public_id?: string;
    publisher?: string;
    grade?: number;
  };
  chapter?: { public_id?: string; code: string; title?: string };
}

export interface Definition {
  public_id?: string;
  text: string;
  page: number;
  topic?: Topic;
}

export interface Term {
  public_id: string;
  name: string;
  definitions?: Definition[];
}

export interface FeaturedTerm {
  term: Term;
  featured_definition: Definition;
}

export interface BookCatalogItem {
  public_id: string;
  publisher: string;
  grade: number;
}

export interface ChapterCatalogItem {
  public_id: string;
  code?: string;
  title?: string;
  /** Legacy fixture compatibility; API responses use title. */
  name?: string;
}

export type TopicLocale = 'kk' | 'ru';

export interface TopicCodeDetail {
  public_id: string;
  /** Stable public topic code; keep this separate from the localized title. */
  name: string;
  /** Localized lesson-goal display text selected by the API. */
  title: string;
  chapter?: ChapterCatalogItem | null;
}

export interface TopicDetail {
  public_id: string;
  name: string;
  page_start: number;
  page_end: number;
  book: BookCatalogItem;
  topic_codes: TopicCodeDetail[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type UserRole = 'admin' | 'client' | 'user';
// 'undefined' is the API sentinel string for "grade not set" — matches backend UserGrade enum
export type UserGrade = '10' | '11' | 'undefined';
export type UserLanguage = 'ru' | 'kk';

export interface User {
  id: number;
  username: string | null;
  email: string;
  language: UserLanguage;
  grade: UserGrade | null;
  role: UserRole;
  banned?: boolean;
  onboarding_completed?: boolean;
  has_password?: boolean;
  created_at?: string;
}

export type SearchTaskStatus = 'pending' | 'success' | 'failure' | string;

export interface SearchTaskResult {
  term: string;
  book_publisher: string;
  book_grade: number;
  text: string;
  topic: string;
  page: number;
  definition_public_id?: string;
}

export interface SearchTaskError {
  code?: string;
  message?: string;
}

export interface SearchTask {
  task_id: string;
  status: SearchTaskStatus;
  result?: SearchTaskResult | null;
  error?: SearchTaskError | string | null;
  step?: string | null;
}

export type AnalyzeTaskStatus = 'pending' | 'started' | 'success' | 'failure';

export interface AnalyzeTaskError {
  code?: string;
  message?: string;
}

export interface AnalyzeBookCoverage {
  public_id: string;
  publisher: string;
  grade: number;
  topic_count: number;
  percentage: number;
}

export interface AnalyzeTopicCode {
  /** Stable topic-code identifier; keep it separate from the localized title. */
  name: string;
  /** Localized lesson-goal display text selected by the API. */
  title: string;
  /** Optional practice state; legacy analyze responses omit practice progress. */
  status?: 'completed' | 'active' | 'pending';
  /** Optional topic progress percentage supplied by a practice-aware API. */
  progress?: number;
}

export interface AnalyzeChapterResult {
  chapter_id: number;
  code: string;
  title: string;
  question_count: number;
  max_score: number;
  score: number;
  percentage: number;
  books: AnalyzeBookCoverage[];
  /** Total topic count used for locked previews without exposing topic details. */
  topic_count?: number;
  /** School grades represented by the chapter's material topics. */
  material_grades?: number[];
  /** API responses include this field; optional for legacy fixtures and clients. */
  topic_codes?: AnalyzeTopicCode[];
}

export interface AnalyzeTask {
  task_id: string;
  status: AnalyzeTaskStatus;
  stage?: string | null;
  result?: AnalyzeChapterResult[] | null;
  error?: AnalyzeTaskError | string | null;
}
