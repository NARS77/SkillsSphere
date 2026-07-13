export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  order: number;
  course_count?: number;
}

export type CourseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CourseVisibility = 'PUBLIC' | 'PRIVATE';

export interface InstructorProfile {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  headline?: string;
  avatar?: string | null;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  thumbnail: string | null;
  banner: string | null;
  category: Category | null;
  instructor: InstructorProfile;
  difficulty: CourseDifficulty;
  language: string;
  duration: number;
  price: string; // Decimals are serialized as strings in JSON API
  discount_price: string | null;
  status: CourseStatus;
  visibility: CourseVisibility;
  tags: string[];
  prerequisites: string[];
  learning_outcomes: string[];
  students_count: number;
  rating: number;
  is_enrolled?: boolean;
  lessons_count?: number;
  certificate?: boolean;
  reviews_count?: number;
  rating_distribution?: Record<number, number>;
  progress_percent?: number;
  created_at: string;
  updated_at: string;
}

export interface CatalogFilters {
  category?: string;
  difficulty?: CourseDifficulty | '';
  min_price?: number;
  max_price?: number;
  search?: string;
  sort_by?: string;
  page?: number;
}
