import React, { useState } from 'react';
import { type Section, type Lesson, type LessonType } from '../../curriculum/types';
import { 
  CheckCircle, 
  Circle, 
  ChevronDown, 
  Video, 
  FileText, 
  ExternalLink,
  Paperclip,
  GraduationCap,
  Brain,
  Calendar,
  Lock
} from 'lucide-react';
import { toast } from '../../../store/toastStore';

interface LearningSidebarProps {
  sections: Section[];
  activeLessonId?: string;
  onSelectLesson: (lesson: Lesson) => void;
  onToggleComplete: (lessonId: string, currentStatus: boolean) => void;
  courseTitle: string;
  isMobileMode?: boolean;
}

export const LearningSidebar: React.FC<LearningSidebarProps> = ({
  sections,
  activeLessonId,
  onSelectLesson,
  onToggleComplete,
  courseTitle,
  isMobileMode = false
}) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Flattened lessons list to compute unlock/lock sequences
  const flattenedLessons = sections.flatMap(s => s.lessons);

  const checkIsLocked = (lessonId: string) => {
    const idx = flattenedLessons.findIndex(l => l.id === lessonId);
    if (idx <= 0) return false;
    // Locked if previous lesson is not completed
    return !flattenedLessons[idx - 1].is_completed;
  };

  const getLessonIcon = (type: LessonType, isCompleted?: boolean, isLocked?: boolean) => {
    if (isLocked) {
      return <Lock className="h-4 w-4 text-slate-400/70 shrink-0" />;
    }
    if (isCompleted) {
      return <CheckCircle className="h-4 w-4 text-emerald-500 fill-emerald-100/10 shrink-0" />;
    }
    
    switch (type) {
      case 'VIDEO': return <Video className="h-4 w-4 text-slate-400 shrink-0" />;
      case 'ARTICLE': return <FileText className="h-4 w-4 text-slate-400 shrink-0" />;
      case 'PDF': return <FileText className="h-4 w-4 text-slate-400 shrink-0" />;
      case 'RESOURCE': return <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />;
      case 'LINK': return <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />;
      case 'LIVE': return <Calendar className="h-4 w-4 text-slate-400 shrink-0" />;
      case 'CODING': return <Brain className="h-4 w-4 text-slate-400 shrink-0" />;
    }
  };

  // Aggregate duration stats
  const totalDuration = sections.reduce((acc, sec) => acc + sec.duration, 0);
  const completedDuration = sections.reduce((acc, sec) => {
    return acc + sec.lessons.filter(l => l.is_completed).reduce((sum, l) => sum + l.duration, 0);
  }, 0);
  const remainingDuration = Math.max(totalDuration - completedDuration, 0);

  return (
    <div className={`${isMobileMode ? 'w-full' : 'w-80 border-r'} border-slate-200/60 dark:border-slate-800/40 bg-white dark:bg-slate-950 flex flex-col h-full shrink-0 shadow-sm`}>
      {/* Title Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/10">
        <span className="text-[10px] text-brand-600 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1 select-none">
          <GraduationCap className="h-3.5 w-3.5" />
          Course Curriculum
        </span>
        <h3 className="text-xs font-bold text-slate-800 dark:text-white line-clamp-2 leading-relaxed">
          {courseTitle}
        </h3>
        <span className="text-[9px] text-slate-400 font-medium block mt-1">
          {remainingDuration} mins remaining of study
        </span>
      </div>

      {/* Curriculum Accordion List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/30">
        {sections.map((section, idx) => {
          const isCollapsed = collapsedSections[section.id] === true;
          
          const completedCount = section.lessons.filter(l => l.is_completed).length;
          const totalCount = section.lessons.length;

          return (
            <div key={section.id} className="flex flex-col">
              {/* Section Header */}
              <button 
                onClick={() => toggleSection(section.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
              >
                <div className="pr-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                    Section {idx + 1}: {section.title}
                  </h4>
                  <div className="flex gap-2 items-center text-[9px] text-slate-400 mt-0.5">
                    <span>{section.lessons.length} lessons • {section.duration} mins</span>
                    <span className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded font-extrabold text-[8px] text-slate-500">
                      {completedCount}/{totalCount} completed
                    </span>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-250 ease-in-out ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
              </button>

              {/* Section Lessons list with smooth height expand/collapse transition */}
              <div className={`grid transition-all duration-300 ease-in-out ${isCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                <div className="overflow-hidden bg-slate-50/30 dark:bg-slate-900/5 divide-y divide-slate-100/50 dark:divide-slate-800/20">
                  {section.lessons.map((lesson) => {
                    const isActive = lesson.id === activeLessonId;
                    const isLocked = checkIsLocked(lesson.id);

                    return (
                      <div 
                        key={lesson.id}
                        onClick={() => {
                          if (isLocked) {
                            toast.error('Please complete the previous lessons first to unlock!');
                            return;
                          }
                          onSelectLesson(lesson);
                        }}
                        className={`flex items-center justify-between pl-4 pr-3 py-2.5 transition-colors cursor-pointer group ${
                          isLocked ? 'opacity-50 hover:bg-transparent cursor-not-allowed' : ''
                        } ${
                          isActive 
                            ? 'bg-brand-50/50 dark:bg-brand-950/10 border-l-2 border-brand-500' 
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/20'
                        }`}
                      >
                        {/* Completion checkbox toggler */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isLocked) {
                              toast.error('Please complete the previous lessons first!');
                              return;
                            }
                            onToggleComplete(lesson.id, !!lesson.is_completed);
                          }}
                          className="p-1 mr-2 text-slate-400 hover:text-brand-500 transition-colors shrink-0"
                          disabled={isLocked}
                        >
                          {lesson.is_completed ? (
                            <CheckCircle className="h-4.5 w-4.5 text-emerald-500 fill-emerald-100/10" />
                          ) : (
                            <Circle className="h-4.5 w-4.5 group-hover:text-slate-600" />
                          )}
                        </button>

                        {/* Clickable Lesson body */}
                        <div 
                          className="flex-1 min-w-0 pr-1 flex items-center gap-2"
                        >
                          {getLessonIcon(lesson.lesson_type, lesson.is_completed, isLocked)}
                          <div className="min-w-0">
                            <span className={`text-xs block truncate ${isActive ? 'font-bold text-brand-700 dark:text-brand-400' : 'text-slate-650 dark:text-slate-350'}`}>
                              {lesson.title}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5 block">
                              {lesson.duration} mins
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
