export type LessonType = 'VIDEO' | 'ARTICLE' | 'PDF' | 'RESOURCE' | 'LINK' | 'LIVE' | 'CODING' | 'QUIZ' | 'ASSIGNMENT';
export type LessonStatus = 'DRAFT' | 'PUBLISHED';

export interface LessonResource {
  id: string;
  title: string;
  file: string;
  created_at: string;
}

export interface Lesson {
  id: string;
  section: string;
  title: string;
  description: string;
  lesson_type: LessonType;
  duration: number;
  video_url: string;
  content_text: string;
  content_file: string | null;
  external_link: string;
  is_preview: boolean;
  status: LessonStatus;
  order: number;
  resources: LessonResource[];
  // Frontend computed fields for classroom
  is_completed?: boolean;
  last_position?: number;
}

export interface Section {
  id: string;
  course: string;
  title: string;
  order: number;
  lessons: Lesson[];
  duration: number;
}
