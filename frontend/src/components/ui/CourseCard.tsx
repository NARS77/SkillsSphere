import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Clock, GraduationCap } from 'lucide-react';
import { type Course } from '../../features/courses/types';
import { Card } from './Card';

interface CourseCardProps {
  course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const { title, slug, short_description, thumbnail, instructor, difficulty, duration, price, discount_price, rating } = course;

  const difficultyLabels = {
    BEGINNER: 'Beginner',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
  };

  const difficultyColors = {
    BEGINNER: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 border border-slate-200/40 dark:border-slate-700/40',
    INTERMEDIATE: 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/30',
    ADVANCED: 'bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100/30 dark:border-purple-900/30',
  };

  // Fallback thumbnail using dynamic SVG path
  const defaultThumbnail = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%234f46e5"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="white">LMS</text></svg>`;

  const originalPrice = parseFloat(price);
  const salePrice = discount_price ? parseFloat(discount_price) : null;

  return (
    <Link to={`/courses/${slug}`} className="block group h-full">
      <Card hoverable className="h-full flex flex-col p-0 overflow-hidden border-slate-200/50 dark:border-slate-800/40 bg-white dark:bg-slate-900/50 transition-all duration-150">
        {/* Course Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-950/40">
          <img
            src={thumbnail || defaultThumbnail}
            alt={title}
            className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-95"
            loading="lazy"
          />
          <div className="absolute top-3 left-3">
            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm ${difficultyColors[difficulty]}`}>
              {difficultyLabels[difficulty]}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            {/* Category Name */}
            {course.category && (
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {course.category.name}
              </p>
            )}

            {/* Title */}
            <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors tracking-tight">
              {title}
            </h4>

            {/* Description */}
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-light">
              {short_description}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* Instructor and Stats */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="text-slate-700 dark:text-slate-350">
                By {instructor.first_name && instructor.last_name ? `${instructor.first_name} ${instructor.last_name}` : instructor.username}
              </span>

              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-750 dark:text-slate-200">{rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Specs bar (Duration and Level) */}
            <div className="flex items-center gap-4 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800/40 pt-3">
              <div className="flex items-center gap-1.5 font-light">
                <Clock className="h-3.5 w-3.5" />
                <span>{duration} hrs</span>
              </div>
              <div className="flex items-center gap-1.5 font-light">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>{difficultyLabels[difficulty]}</span>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="flex items-baseline gap-2 pt-1">
              {salePrice !== null ? (
                <>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    ${salePrice.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 line-through">
                    ${originalPrice.toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {originalPrice === 0 ? 'Free' : `$${originalPrice.toFixed(2)}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
};
