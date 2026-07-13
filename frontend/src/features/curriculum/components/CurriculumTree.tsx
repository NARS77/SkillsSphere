import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { type Section, type Lesson, type LessonType } from '../types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { toast } from '../../../store/toastStore';
import { QuizBuilder } from './QuizBuilder';
import { AssignmentBuilder } from './AssignmentBuilder';
import { 
  Folder, 
  FileText, 
  Video, 
  Paperclip, 
  ExternalLink,
  ChevronDown, 
  Plus, 
  Trash2, 
  Copy, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Clock,
  X,
  Brain,
  ClipboardList
} from 'lucide-react';

interface CurriculumTreeProps {
  courseId: string;
}

export const CurriculumTree: React.FC<CurriculumTreeProps> = ({ courseId }) => {
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  
  // Lesson Editor state
  const [activeLessonEditor, setActiveLessonEditor] = useState<{
    sectionId: string;
    lessonId?: string; // If undefined, we are creating a new lesson
  } | null>(null);

  // Lesson Form fields
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('VIDEO');
  const [lessonDuration, setLessonDuration] = useState(10);
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonVideoFile, setLessonVideoFile] = useState<File | null>(null);
  const [lessonVideoPreview, setLessonVideoPreview] = useState<string | null>(null);
  const [lessonContentText, setLessonContentText] = useState('');
  const [lessonExternalLink, setLessonExternalLink] = useState('');
  const [lessonIsPreview, setLessonIsPreview] = useState(false);
  const [lessonStatus, setLessonStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

  // Resource Upload state
  const [uploadingLessonId, setUploadingLessonId] = useState<string | null>(null);
  const [resourceTitle, setResourceTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Drag and drop states
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [draggedLessonSourceSectionId, setDraggedLessonSourceSectionId] = useState<string | null>(null);

  // Fetch sections & lessons for this course
  const { data: sections = [], isLoading } = useQuery<Section[]>({
    queryKey: ['course-curriculum', courseId],
    queryFn: async () => {
      const response = await api.get(`curriculum/sections/?course_id=${courseId}`);
      const allSecs: Section[] = response.data.results || response.data;
      return allSecs.filter(s => s.course === courseId).sort((a, b) => a.order - b.order);
    },
  });

  // Toggle Collapse
  const toggleSection = (secId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [secId]: !prev[secId]
    }));
  };

  // --- Section Mutations ---
  const addSectionMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await api.post('curriculum/sections/', { course_id: courseId, title });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-curriculum', courseId] });
      setNewSectionTitle('');
      toast.success('Section added!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to add section.');
    }
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const response = await api.patch(`curriculum/sections/${id}/`, { title });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-curriculum', courseId] });
      setEditingSectionId(null);
      toast.success('Section renamed.');
    }
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`curriculum/sections/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-curriculum', courseId] });
      toast.success('Section deleted.');
    }
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: async (sectionIds: string[]) => {
      await api.post('curriculum/sections/reorder/', {
        course_id: courseId,
        section_ids: sectionIds
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-curriculum', courseId] });
      toast.success('Sections reordered.');
    }
  });

  // --- Lesson Mutations ---
  const saveLessonMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('title', lessonTitle);
      formData.append('description', lessonDesc);
      formData.append('lesson_type', lessonType);
      formData.append('duration', String(lessonDuration));
      formData.append('video_url', lessonType === 'VIDEO' ? lessonVideoUrl : '');
      formData.append('content_text', (lessonType === 'ARTICLE' || lessonType === 'CODING') ? lessonContentText : '');
      formData.append('external_link', (lessonType === 'LINK' || lessonType === 'PDF' || lessonType === 'LIVE' || lessonType === 'RESOURCE') ? lessonExternalLink : '');
      formData.append('is_preview', String(lessonIsPreview));
      formData.append('status', lessonStatus);

      if (lessonType === 'VIDEO' && lessonVideoFile) {
        formData.append('content_file', lessonVideoFile);
      }

      if (activeLessonEditor?.lessonId) {
        await api.patch(`curriculum/lessons/${activeLessonEditor.lessonId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        if (activeLessonEditor?.sectionId) {
          formData.append('section_id', activeLessonEditor.sectionId);
        }
        await api.post('curriculum/lessons/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-curriculum', courseId] });
      setActiveLessonEditor(null);
      toast.success(activeLessonEditor?.lessonId ? 'Lesson updated!' : 'Lesson created!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to save lesson.');
    }
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`curriculum/lessons/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-curriculum', courseId] });
      toast.success('Lesson deleted.');
    }
  });

  const duplicateLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`curriculum/lessons/${id}/duplicate/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-curriculum', courseId] });
      toast.success('Lesson duplicated.');
    }
  });

  const reorderLessonsMutation = useMutation({
    mutationFn: async ({ sectionId, lessonIds }: { sectionId: string; lessonIds: string[] }) => {
      await api.post('curriculum/lessons/reorder/', {
        section_id: sectionId,
        lesson_ids: lessonIds
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-curriculum', courseId] });
    }
  });

  // --- Resource Upload Mutations ---
  const uploadResourceMutation = useMutation({
    mutationFn: async () => {
      if (!uploadingLessonId || !selectedFile || !resourceTitle) return;
      const formData = new FormData();
      formData.append('lesson_id', uploadingLessonId);
      formData.append('title', resourceTitle);
      formData.append('file', selectedFile);

      await api.post('curriculum/resources/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-curriculum', courseId] });
      setUploadingLessonId(null);
      setSelectedFile(null);
      setResourceTitle('');
      toast.success('Resource file attached!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to upload resource.');
    }
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`curriculum/resources/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-curriculum', courseId] });
      toast.success('Resource removed.');
    }
  });

  // --- Drag and Drop Handlers ---
  const handleSectionDrop = (targetSectionId: string) => {
    if (!draggedSectionId || draggedSectionId === targetSectionId) return;
    const fromIdx = sections.findIndex(s => s.id === draggedSectionId);
    const toIdx = sections.findIndex(s => s.id === targetSectionId);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    reorderSectionsMutation.mutate(reordered.map(s => s.id));
  };

  const handleLessonDrop = async (targetSectionId: string, targetLessonId: string | null) => {
    if (!draggedLessonId || !draggedLessonSourceSectionId) return;

    // 1. Move within the same section
    if (draggedLessonSourceSectionId === targetSectionId) {
      const section = sections.find(s => s.id === targetSectionId);
      if (!section) return;

      const fromIdx = section.lessons.findIndex(l => l.id === draggedLessonId);
      let toIdx = targetLessonId ? section.lessons.findIndex(l => l.id === targetLessonId) : section.lessons.length;
      if (fromIdx === -1) return;

      const reordered = [...section.lessons];
      const [moved] = reordered.splice(fromIdx, 1);
      if (fromIdx < toIdx && targetLessonId) toIdx--;
      reordered.splice(toIdx, 0, moved);

      reorderLessonsMutation.mutate({
        sectionId: targetSectionId,
        lessonIds: reordered.map(l => l.id)
      });
      toast.success('Lesson order updated.');
    } else {
      // 2. Move between sections
      const sourceSection = sections.find(s => s.id === draggedLessonSourceSectionId);
      const targetSection = sections.find(s => s.id === targetSectionId);
      if (!sourceSection || !targetSection) return;

      const fromIdx = sourceSection.lessons.findIndex(l => l.id === draggedLessonId);
      if (fromIdx === -1) return;

      const sourceLessons = [...sourceSection.lessons];
      const [moved] = sourceLessons.splice(fromIdx, 1);

      const targetLessons = [...targetSection.lessons];
      const toIdx = targetLessonId ? targetSection.lessons.findIndex(l => l.id === targetLessonId) : targetSection.lessons.length;
      targetLessons.splice(toIdx, 0, moved);

      try {
        await reorderLessonsMutation.mutateAsync({
          sectionId: targetSectionId,
          lessonIds: targetLessons.map(l => l.id)
        });
        await reorderLessonsMutation.mutateAsync({
          sectionId: draggedLessonSourceSectionId,
          lessonIds: sourceLessons.map(l => l.id)
        });
        toast.success('Lesson moved to new section.');
      } catch (err) {
        toast.error('Failed to move lesson.');
      }
    }
  };

  // --- Button-based Reordering Fallbacks ---
  const moveSection = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= sections.length) return;

    const reordered = [...sections];
    const temp = reordered[index];
    reordered[index] = reordered[nextIndex];
    reordered[nextIndex] = temp;

    reorderSectionsMutation.mutate(reordered.map(s => s.id));
  };

  const moveLesson = (section: Section, index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= section.lessons.length) return;

    const reordered = [...section.lessons];
    const temp = reordered[index];
    reordered[index] = reordered[nextIndex];
    reordered[nextIndex] = temp;

    reorderLessonsMutation.mutate({
      sectionId: section.id,
      lessonIds: reordered.map(l => l.id)
    });
    toast.success('Lesson order updated.');
  };

  // --- Lesson Form Triggers ---
  const triggerNewLesson = (sectionId: string) => {
    setLessonTitle('');
    setLessonDesc('');
    setLessonType('VIDEO');
    setLessonDuration(10);
    setLessonVideoUrl('');
    setLessonVideoFile(null);
    setLessonVideoPreview(null);
    setLessonContentText('');
    setLessonExternalLink('');
    setLessonIsPreview(false);
    setLessonStatus('DRAFT');
    setActiveLessonEditor({ sectionId });
  };

  const triggerEditLesson = (lesson: Lesson) => {
    setLessonTitle(lesson.title);
    setLessonDesc(lesson.description || '');
    setLessonType(lesson.lesson_type);
    setLessonDuration(lesson.duration);
    setLessonVideoUrl(lesson.video_url || '');
    setLessonVideoFile(null);
    setLessonVideoPreview(lesson.content_file || null);
    setLessonContentText(lesson.content_text || '');
    setLessonExternalLink(lesson.external_link || '');
    setLessonIsPreview(lesson.is_preview);
    setLessonStatus(lesson.status);
    setActiveLessonEditor({ sectionId: lesson.section, lessonId: lesson.id });
  };

  const getLessonIcon = (type: LessonType) => {
    switch (type) {
      case 'VIDEO': return <Video className="h-4 w-4 text-brand-600" />;
      case 'ARTICLE': return <FileText className="h-4 w-4 text-amber-600" />;
      case 'PDF': return <FileText className="h-4 w-4 text-rose-600" />;
      case 'RESOURCE': return <Paperclip className="h-4 w-4 text-emerald-600" />;
      case 'LINK': return <ExternalLink className="h-4 w-4 text-sky-600" />;
      case 'LIVE': return <Clock className="h-4 w-4 text-indigo-600" />;
      case 'CODING': return <Brain className="h-4 w-4 text-purple-600" />;
      case 'QUIZ': return <Brain className="h-4 w-4 text-amber-600 fill-amber-50" />;
      case 'ASSIGNMENT': return <ClipboardList className="h-4 w-4 text-indigo-650" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sections Header input */}
      <div className="flex gap-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/30">
        <input
          type="text"
          value={newSectionTitle}
          onChange={(e) => setNewSectionTitle(e.target.value)}
          placeholder="New section title (e.g. Module 1: React Basics)"
          className="flex-1 text-sm block rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 py-2 px-3 focus:outline-none focus:border-brand-500"
        />
        <Button onClick={() => newSectionTitle.trim() && addSectionMutation.mutate(newSectionTitle)} disabled={!newSectionTitle.trim()}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Section
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        </div>
      )}

      {/* Curriculum list trees */}
      <div className="space-y-4">
        {sections.map((section, sIdx) => {
          const isExpanded = expandedSections[section.id] !== false;
          
          return (
            <Card 
              key={section.id} 
              className={`border-slate-200/55 dark:border-slate-850 overflow-hidden shadow-sm transition-all duration-200 ${draggedSectionId === section.id ? 'opacity-40 border-dashed border-brand-500 scale-[0.99] bg-brand-500/5' : ''}`}
              draggable={editingSectionId === null && activeLessonEditor === null}
              onDragStart={(e) => {
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
                e.dataTransfer.setData('text/plain', section.id);
                setDraggedSectionId(section.id);
              }}
              onDragEnd={() => setDraggedSectionId(null)}
              onDragOver={(e) => {
                if (draggedSectionId) {
                  e.preventDefault();
                }
              }}
              onDrop={() => {
                if (draggedSectionId && draggedSectionId !== section.id) {
                  handleSectionDrop(section.id);
                }
              }}
            >
              {/* Section header bar */}
              <div className="bg-slate-50/70 dark:bg-slate-900/30 px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40">
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleSection(section.id)} className="text-slate-400 hover:text-slate-600">
                    <ChevronDown className={`h-4.5 w-4.5 transition-transform duration-250 ${isExpanded ? '' : '-rotate-90'}`} />
                  </button>
                  
                  {editingSectionId === section.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingSectionTitle}
                        onChange={(e) => setEditingSectionTitle(e.target.value)}
                        className="text-sm font-semibold block rounded border px-2 py-0.5"
                      />
                      <Button size="sm" onClick={() => updateSectionMutation.mutate({ id: section.id, title: editingSectionTitle })}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSectionId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Folder className="h-4 w-4 text-brand-500 fill-brand-100/10" />
                        {section.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {section.lessons.length} lessons • {section.duration} mins published
                      </p>
                    </div>
                  )}
                </div>

                {/* Section Action controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveSection(sIdx, 'up')}
                    disabled={sIdx === 0}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveSection(sIdx, 'down')}
                    disabled={sIdx === sections.length - 1}
                    className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>

                  <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1.5" />

                  <button
                    onClick={() => {
                      setEditingSectionId(section.id);
                      setEditingSectionTitle(section.title);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this section and all associated lessons?')) {
                        deleteSectionMutation.mutate(section.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-danger-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  <Button size="sm" className="ml-2 font-bold py-1 px-2 text-[10px]" onClick={() => triggerNewLesson(section.id)}>
                    <Plus className="h-3 w-3 mr-1" /> Add Lesson
                  </Button>
                </div>
              </div>

              {/* Section Lessons list */}
              {isExpanded && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/40 bg-white dark:bg-slate-950">
                  {section.lessons.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No lessons inside this section yet. Drag lessons here or click Add Lesson.
                    </div>
                  ) : (
                    section.lessons.map((lesson, lIdx) => (
                      <div 
                        key={lesson.id} 
                        className={`p-4 flex items-center justify-between group hover:bg-slate-50/45 dark:hover:bg-slate-900/10 transition-colors cursor-grab active:cursor-grabbing ${draggedLessonId === lesson.id ? 'opacity-40 bg-slate-100 dark:bg-slate-900 border-dashed border border-slate-300' : ''}`}
                        draggable={true}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData('text/plain', lesson.id);
                          setDraggedLessonId(lesson.id);
                          setDraggedLessonSourceSectionId(section.id);
                        }}
                        onDragEnd={() => {
                          setDraggedLessonId(null);
                          setDraggedLessonSourceSectionId(null);
                        }}
                        onDragOver={(e) => {
                          if (draggedLessonId) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        onDrop={(e) => {
                          if (draggedLessonId) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLessonDrop(section.id, lesson.id);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {getLessonIcon(lesson.lesson_type)}
                          <div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              {lesson.title}
                              {lesson.status === 'DRAFT' ? (
                                <span className="bg-slate-100 text-slate-500 border dark:bg-slate-900 dark:border-slate-800 px-1 py-0.5 rounded text-[8px] font-bold">DRAFT</span>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20 px-1 py-0.5 rounded text-[8px] font-bold">PUBLISHED</span>
                              )}
                              {lesson.is_preview && (
                                <span className="bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-950/20 px-1 py-0.5 rounded text-[8px] font-bold">PREVIEW</span>
                              )}
                            </span>
                            <div className="flex gap-2 mt-0.5 text-[9px] text-slate-400 items-center">
                              <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {lesson.duration} mins</span>
                              {lesson.resources.length > 0 && (
                                <span className="flex items-center gap-0.5 text-emerald-600"><Paperclip className="h-2.5 w-2.5" /> {lesson.resources.length} resource(s)</span>
                              )}
                            </div>
                            
                            {lesson.resources && lesson.resources.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {lesson.resources.map((res) => (
                                  <span key={res.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/30 text-[9px] text-slate-500">
                                    <Paperclip className="h-2.5 w-2.5 text-slate-400" />
                                    <span className="max-w-[120px] truncate">{res.title}</span>
                                    <button 
                                      type="button"
                                      onClick={() => deleteResourceMutation.mutate(res.id)} 
                                      className="text-slate-400 hover:text-danger-600 font-bold ml-1"
                                      title="Remove attachment"
                                    >
                                      &times;
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveLesson(section, lIdx, 'up')}
                            disabled={lIdx === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveLesson(section, lIdx, 'down')}
                            disabled={lIdx === section.lessons.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>

                          <div className="w-px h-3 bg-slate-200 dark:bg-slate-800 mx-1" />

                          <button
                            onClick={() => setUploadingLessonId(lesson.id)}
                            className="p-1 text-slate-400 hover:text-emerald-600"
                            title="Attach Resource"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => duplicateLessonMutation.mutate(lesson.id)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Duplicate Lesson"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => triggerEditLesson(lesson)}
                            className="p-1 text-slate-400 hover:text-brand-600"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm('Delete this lesson?')) {
                                deleteLessonMutation.mutate(lesson.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-danger-600"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {/* End Drop zone */}
                  <div
                    onDragOver={(e) => {
                      if (draggedLessonId) {
                        e.preventDefault();
                      }
                    }}
                    onDrop={(e) => {
                      if (draggedLessonId) {
                        e.preventDefault();
                        handleLessonDrop(section.id, null);
                      }
                    }}
                    className={`flex items-center justify-center text-[9px] font-bold text-brand-600 dark:text-brand-450 border border-dashed rounded-xl m-2 transition-all duration-150 ${draggedLessonId ? 'border-brand-500 bg-brand-500/5 py-2.5 opacity-100 h-10' : 'border-transparent opacity-0 h-2 pointer-events-none'}`}
                  >
                    {draggedLessonId ? 'Drop lesson here at the end of section' : ''}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Slide-out Lesson Form Editor panel */}
      {activeLessonEditor && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white dark:bg-slate-950 h-full p-6 overflow-y-auto border-l border-slate-200 dark:border-slate-800/40 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/30">
                <h3 className="text-base font-bold text-slate-950 dark:text-white">
                  {activeLessonEditor.lessonId ? 'Edit Lesson Parameters' : 'Create New Lesson'}
                </h3>
                <button onClick={() => setActiveLessonEditor(null)} className="text-slate-400 hover:text-slate-900">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  type="text"
                  label="Lesson Title"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  placeholder="e.g. Getting Started with state hooks"
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Description</label>
                  <textarea
                    value={lessonDesc}
                    onChange={(e) => setLessonDesc(e.target.value)}
                    rows={3}
                    className="w-full text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Lesson Type</label>
                    <select
                      value={lessonType}
                      onChange={(e) => setLessonType(e.target.value as LessonType)}
                      className="text-xs rounded-lg border bg-white dark:bg-slate-950 p-2"
                    >
                      <option value="VIDEO">Video</option>
                      <option value="ARTICLE">Text Article</option>
                      <option value="PDF">PDF Document</option>
                      <option value="RESOURCE">Downloadable File</option>
                      <option value="LINK">External Link</option>
                      <option value="LIVE">Live Session</option>
                      <option value="CODING">Interactive Coding Exercise</option>
                      <option value="QUIZ">Quiz Assessment</option>
                      <option value="ASSIGNMENT">Assignment Task</option>
                    </select>
                  </div>

                  <Input
                    type="number"
                    label="Duration (minutes)"
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(parseInt(e.target.value) || 0)}
                  />
                </div>

                {lessonType === 'VIDEO' && (
                  <div className="space-y-4">
                    <Input
                      type="text"
                      label="Video Stream URL"
                      value={lessonVideoUrl}
                      onChange={(e) => setLessonVideoUrl(e.target.value)}
                      placeholder="https://example.com/stream.mp4 or YouTube link"
                    />
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Or Upload Video File Directly</label>
                      {lessonVideoPreview && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-450 font-semibold mb-1">
                          ✓ File configured: {lessonVideoPreview.split('/').pop()}
                        </div>
                      )}
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLessonVideoFile(file);
                          }
                        }}
                        className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                      />
                    </div>
                  </div>
                )}

                {(lessonType === 'ARTICLE' || lessonType === 'CODING') && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                      {lessonType === 'CODING' ? 'Exercise Instructions (Markdown supported)' : 'Markdown Content'}
                    </label>
                    <textarea
                      value={lessonContentText}
                      onChange={(e) => setLessonContentText(e.target.value)}
                      rows={6}
                      className="w-full text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 p-2 font-mono"
                      placeholder={lessonType === 'CODING' ? 'Write coding assignment instructions here...' : '# Markdown heading...'}
                    />
                  </div>
                )}

                {(lessonType === 'LINK' || lessonType === 'PDF' || lessonType === 'LIVE' || lessonType === 'RESOURCE') && (
                  <Input
                    type="url"
                    label={lessonType === 'LIVE' ? 'Zoom/Meet Joining Link' : lessonType === 'PDF' ? 'PDF Document Link' : 'External URL'}
                    value={lessonExternalLink}
                    onChange={(e) => setLessonExternalLink(e.target.value)}
                    placeholder={lessonType === 'LIVE' ? 'https://zoom.us/j/...' : 'https://example.com/file.pdf'}
                  />
                )}

                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/30 p-3 rounded-lg border">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lessonIsPreview}
                      onChange={(e) => setLessonIsPreview(e.target.checked)}
                      className="rounded"
                    />
                    Free Preview (allows non-enrolled students to watch)
                  </label>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Status</label>
                  <select
                    value={lessonStatus}
                    onChange={(e) => setLessonStatus(e.target.value as any)}
                    className="text-xs rounded-lg border bg-white dark:bg-slate-950 p-2"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>

                {lessonType === 'QUIZ' && (
                  activeLessonEditor.lessonId ? (
                    <QuizBuilder 
                      lessonId={activeLessonEditor.lessonId} 
                      courseId={courseId} 
                      lessonTitle={lessonTitle} 
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-500">
                      Save this lesson first to configure quiz questions and settings.
                    </div>
                  )
                )}

                {lessonType === 'ASSIGNMENT' && (
                  activeLessonEditor.lessonId ? (
                    <AssignmentBuilder 
                      lessonId={activeLessonEditor.lessonId} 
                      courseId={courseId} 
                      lessonTitle={lessonTitle} 
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs text-slate-500">
                      Save this lesson first to configure assignment tasks and rubrics.
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/30 mt-6">
              <Button variant="outline" onClick={() => setActiveLessonEditor(null)}>Cancel</Button>
              <Button onClick={() => saveLessonMutation.mutate()} isLoading={saveLessonMutation.isPending}>Save Lesson</Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Resource modal */}
      {uploadingLessonId && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800/40 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-950 dark:text-white mb-4">Attach Downloadable Resource</h3>
            
            <div className="space-y-4">
              <Input
                type="text"
                label="Resource Name"
                value={resourceTitle}
                onChange={(e) => setResourceTitle(e.target.value)}
                placeholder="e.g. Exercise Zip File"
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Attach File</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedFile(e.target.files[0]);
                      if (!resourceTitle) {
                        setResourceTitle(e.target.files[0].name.split('.')[0]);
                      }
                    }
                  }}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" size="sm" onClick={() => setUploadingLessonId(null)}>Cancel</Button>
              <Button size="sm" onClick={() => uploadResourceMutation.mutate()} disabled={!selectedFile || !resourceTitle.trim()}>
                Upload Resource
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
