import { apiClient } from './client';

export type TestTopicSummary = {
  id: string;
  title: string;
  questionCount: number;
  estimatedMinutes: number;
};

export type TestQuestionOption = {
  id: string;
  label: string;
  text: string;
};

export type TestQuestion = {
  id: string;
  prompt: string;
  options: TestQuestionOption[];
  correctOptionId: string;
  explanation: string;
  topic: TestTopicSummary;
};

export type TestSession = {
  id: string;
  mode: string;
  title: string;
  questions: TestQuestion[];
};

const webDesignTopic: TestTopicSummary = {
  id: 'web-design',
  title: 'Веб-проектирование',
  questionCount: 10,
  estimatedMinutes: 5,
};

const defaultQuestionOptions: TestQuestionOption[] = [
  { id: 'a', label: 'A', text: 'Мыс өткізгіштер' },
  { id: 'b', label: 'B', text: 'Регистрлер' },
  { id: 'c', label: 'C', text: 'Шина' },
  { id: 'd', label: 'D', text: 'Жергілікті жад' },
];

const defaultQuestionPrompt =
  'Екілік кодтар түрінде берілген ақпаратты жазуға, сақтауға, беруге және түрлендіруге арналған құрылғылар';

const defaultQuestionExplanation =
  'Регистрлер - екілік кодтар түрінде берілген ақпаратты жазуға, сақтауға, беруге және түрлендіруге арналған құрылғылар.';

const testSessionFixtures: Record<string, TestSession> = {
  default: {
    id: 'default-session',
    mode: 'default',
    title: 'Обычный тест',
    questions: Array.from({ length: 10 }, (_, index) => ({
      id: `default-${index + 1}`,
      prompt: defaultQuestionPrompt,
      options: defaultQuestionOptions,
      correctOptionId: 'b',
      explanation: defaultQuestionExplanation,
      topic: webDesignTopic,
    })),
  },
};

function cloneTestSession(session: TestSession, topicCode?: string): TestSession {
  return {
    ...session,
    questions: session.questions.map((question) => ({
      ...question,
      options: question.options.map((option) => ({ ...option })),
      topic: { ...question.topic, ...(topicCode ? { id: topicCode } : {}) },
    })),
  };
}

export async function getTestSession(testMode: string, topicCode?: string): Promise<TestSession> {
  const useRemoteTestsApi =
    (import.meta.env.VITE_TESTS_API_ENABLED as string | undefined) === 'true';

  if (useRemoteTestsApi) {
    const { data } = await apiClient.get<TestSession>(`/api/tests/${encodeURIComponent(testMode)}`, {
      params: topicCode ? { topicCode } : undefined,
    });
    return data;
  }

  return cloneTestSession(testSessionFixtures[testMode] ?? testSessionFixtures.default, topicCode);
}
