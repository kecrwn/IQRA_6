
export interface LessonPart {
  id: string;
  arabic: string;
  transliteration?: string;
  meaning?: string;
}

export interface Lesson {
  id: number;
  title: string;
  description: string;
  parts: LessonPart[];
}

export interface Progress {
  completedLessons: number[];
  currentLessonId: number;
}
