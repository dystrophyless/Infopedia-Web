export interface Topic {
  public_id?: string;
  name?: string;
  page_start?: number;
  page_end?: number;
  book?: { public_id?: string; name: string };
  chapter?: { public_id?: string; name: string };
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
  created_at?: string;
}

export type SearchTaskStatus = 'pending' | 'success' | 'failure' | string;

export interface SearchTaskResult {
  term: string;
  book: string;
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
