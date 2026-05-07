export interface Topic {
  id: number;
  title?: string;
  page_start?: number;
  page_end?: number;
  book?: { id: number; title: string };
  chapter?: { id: number; title: string };
}

export interface Definition {
  id?: number;
  text: string;
  page: number;
  topic?: Topic;
}

export interface Term {
  id: number;
  name: string;
  definitions?: Definition[];
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
}

export type UserRole = 'admin' | 'client' | 'user';
export type UserGrade = '10' | '11' | 'undefined';
export type UserLanguage = 'ru' | 'kk';

export interface User {
  id: number;
  username: string;
  email: string;
  language: UserLanguage;
  grade: UserGrade;
  role: UserRole;
  banned?: boolean;
  created_at?: string;
}

export type SearchTaskStatus = 'pending' | 'success' | 'failure' | string;

export interface SearchTask {
  task_id: string;
  status: SearchTaskStatus;
  result?: Definition | null;
  error?: string | null;
  step?: string | null;
}
