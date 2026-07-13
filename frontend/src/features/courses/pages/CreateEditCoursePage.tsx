import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CurriculumTree } from '../../curriculum/components/CurriculumTree';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../../../services/api';
import { type Category } from '../types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { toast } from '../../../store/toastStore';
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Check, 
  Play, 
  Trash2, 
  Plus
} from 'lucide-react';

// Form validation schemas per wizard step
const step1Schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  short_description: z.string().min(10, 'Short description must be at least 10 characters').max(300),
  category_id: z.string().min(1, 'Category is required'),
});

const step2Schema = z.object({
  description: z.string().min(20, 'Detailed description must be at least 20 characters'),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  language: z.string().min(2, 'Language is required'),
  duration: z.coerce.number().min(1, 'Duration must be at least 1 hour'),
});

// Since outcomes, prerequisites and tags are lists of strings, we validate them accordingly
const step3Schema = z.object({
  tags_input: z.string().optional(),
  prereq_input: z.string().optional(),
  outcome_input: z.string().optional(),
  tags: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  learning_outcomes: z.array(z.string()).min(1, 'Add at least one learning outcome'),
});

const step4Schema = z.object({
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  discount_price: z.coerce.number().min(0, 'Discount price cannot be negative').optional().nullable(),
}).refine((data) => {
  if (data.price !== undefined && data.discount_price !== undefined && data.discount_price !== null) {
    return data.discount_price <= data.price;
  }
  return true;
}, {
  message: 'Discount price cannot exceed base price',
  path: ['discount_price'],
});

export const CreateEditCoursePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(editId);
  const [isSaving, setIsSaving] = useState(false);
  const [activeOutcomes, setActiveOutcomes] = useState<string[]>([]);
  const [activePrereqs, setActivePrereqs] = useState<string[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('categories/');
      return Array.isArray(response.data) ? response.data : (response.data.results || []);
    },
  });

  // Initialize standard form controllers
  const {
    register: r1,
    handleSubmit: h1,
    formState: { errors: e1 },
    reset: reset1,
  } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: { title: '', short_description: '', category_id: '' },
  });

  const {
    register: r2,
    handleSubmit: h2,
    formState: { errors: e2 },
    reset: reset2,
  } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: { description: '', difficulty: 'BEGINNER' as const, language: 'English', duration: 1 },
  });

  const {
    register: r3,
    setValue: setV3,
    watch: w3,
  } = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: { tags_input: '', prereq_input: '', outcome_input: '', tags: [] as string[], prerequisites: [] as string[], learning_outcomes: [] as string[] },
  });

  const {
    register: r4,
    handleSubmit: h4,
    formState: { errors: e4 },
    reset: reset4,
  } = useForm({
    resolver: zodResolver(step4Schema),
    defaultValues: { price: 0, discount_price: null as number | null },
  });

  // Fetch existing course details if editing
  useEffect(() => {
    if (editId) {
      const fetchCourse = async () => {
        try {
          const response = await api.get(`instructor/courses/${editId}/`);
          const course = response.data;
          
          reset1({
            title: course.title,
            short_description: course.short_description,
            category_id: course.category?.id || '',
          });
          
          reset2({
            description: course.description,
            difficulty: course.difficulty,
            language: course.language,
            duration: course.duration,
          });

          setActiveOutcomes(course.learning_outcomes || []);
          setActivePrereqs(course.prerequisites || []);
          setActiveTags(course.tags || []);
          
          reset4({
            price: parseFloat(course.price) || 0,
            discount_price: course.discount_price ? parseFloat(course.discount_price) : null,
          });

          if (course.thumbnail) {
            setThumbnailPreviewUrl(course.thumbnail);
          }
        } catch (err) {
          toast.error('Failed to load course details.');
          navigate('/instructor/courses');
        }
      };
      fetchCourse();
    }
  }, [editId, reset1, reset2, reset4, navigate]);

  // Sync active lists with form values for validation
  useEffect(() => {
    setV3('learning_outcomes', activeOutcomes);
  }, [activeOutcomes, setV3]);

  useEffect(() => {
    setV3('prerequisites', activePrereqs);
  }, [activePrereqs, setV3]);

  useEffect(() => {
    setV3('tags', activeTags);
  }, [activeTags, setV3]);

  const handleNextStep1 = async (data: any) => {
    setIsSaving(true);
    try {
      let currentDraftId = draftId;
      if (!currentDraftId) {
        // Create new draft via POST
        const response = await api.post('instructor/courses/', data);
        currentDraftId = response.data.id;
        setDraftId(currentDraftId);
        toast.success('Course draft created!');
      } else {
        // Update existing draft via PATCH
        await api.patch(`instructor/courses/${currentDraftId}/`, data);
      }

      // Upload thumbnail file if selected
      if (thumbnailFile && currentDraftId) {
        const formData = new FormData();
        formData.append('thumbnail', thumbnailFile);
        await api.patch(`instructor/courses/${currentDraftId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      setStep(2);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save basic info.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextStep2 = async (data: any) => {
    if (!draftId) return;
    setIsSaving(true);
    try {
      await api.patch(`instructor/courses/${draftId}/`, data);
      setStep(3);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save course details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextStep3 = async () => {
    if (!draftId) return;
    if (activeOutcomes.length === 0) {
      toast.error('Please add at least one learning outcome');
      return;
    }
    setIsSaving(true);
    try {
      const data = {
        learning_outcomes: activeOutcomes,
        prerequisites: activePrereqs,
        tags: activeTags
      };
      await api.patch(`instructor/courses/${draftId}/`, data);
      setStep(4);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save course outcomes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextStep4 = async (data: any) => {
    if (!draftId) return;
    setIsSaving(true);
    try {
      await api.patch(`instructor/courses/${draftId}/`, {
        price: data.price,
        discount_price: data.discount_price === '' ? null : data.discount_price
      });
      setStep(6);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save pricing.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draftId) return;
    setIsSaving(true);
    try {
      await api.post(`instructor/courses/${draftId}/publish/`);
      toast.success('Course published successfully!');
      navigate('/instructor/courses');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to publish course. Make sure all steps are complete.');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper adding string lists dynamically
  const addItem = (type: 'outcome' | 'prereq' | 'tag') => {
    if (type === 'outcome') {
      const val = w3('outcome_input')?.trim();
      if (val && !activeOutcomes.includes(val)) {
        setActiveOutcomes([...activeOutcomes, val]);
        setV3('outcome_input', '');
      }
    } else if (type === 'prereq') {
      const val = w3('prereq_input')?.trim();
      if (val && !activePrereqs.includes(val)) {
        setActivePrereqs([...activePrereqs, val]);
        setV3('prereq_input', '');
      }
    } else {
      const val = w3('tags_input')?.trim();
      if (val && !activeTags.includes(val)) {
        setActiveTags([...activeTags, val]);
        setV3('tags_input', '');
      }
    }
  };

  const removeItem = (type: 'outcome' | 'prereq' | 'tag', index: number) => {
    if (type === 'outcome') {
      setActiveOutcomes(activeOutcomes.filter((_, i) => i !== index));
    } else if (type === 'prereq') {
      setActivePrereqs(activePrereqs.filter((_, i) => i !== index));
    } else {
      setActiveTags(activeTags.filter((_, i) => i !== index));
    }
  };

  // Step Indicators Header
  const getStepClass = (stepNum: number) => {
    if (step === stepNum) return 'bg-brand-600 text-white border-brand-600 font-bold';
    if (step > stepNum) return 'bg-emerald-50 text-emerald-600 border-emerald-250 dark:bg-emerald-950/20';
    return 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumbs */}
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/20 pb-4">
        <Link to="/instructor/courses" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
          <Save className="h-3.5 w-3.5" />
          <span>Draft autosaved automatically</span>
        </div>
      </div>

      {/* Progress steps bar */}
      <div className="flex items-center justify-between relative max-w-2xl mx-auto">
        {[1, 2, 3, 4, 5, 6].map((sNum) => {
          const titles = ['Basic Info', 'Specs', 'Syllabus', 'Curriculum', 'Pricing', 'Publish'];
          return (
            <div key={sNum} className="flex flex-col items-center gap-2 relative z-10">
              <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs transition-all duration-350 ${getStepClass(sNum)}`}>
                {step > sNum ? <Check className="h-4 w-4" /> : sNum}
              </div>
              <span className="text-[10px] font-bold text-slate-500">{titles[sNum - 1]}</span>
            </div>
          );
        })}
        {/* Connector lines behind steps */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
      </div>

      {/* Steps Wizard forms container */}
      <div className="pt-4">
        {step === 1 && (
          <form onSubmit={h1(handleNextStep1)}>
            <Card className="p-8 space-y-6 border-slate-200/50 shadow-md">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">Basic Information</h3>
                <p className="text-slate-500 text-xs">Set up the title and category slug details for this course draft.</p>
              </div>

              <Input
                {...r1('title')}
                type="text"
                label="Course Title"
                placeholder="e.g., Learn Full-Stack Django REST & React"
                error={e1.title?.message}
              />

              <Input
                {...r1('short_description')}
                type="text"
                label="Short Description"
                placeholder="Brief summary of what this course covers (max 300 chars)"
                error={e1.short_description?.message}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-350">Course Category</label>
                <select
                  {...r1('category_id')}
                  className="w-full block rounded-lg text-sm transition-all duration-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-2.5 px-3 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {e1.category_id && <p className="text-xs text-danger-600 mt-0.5">{e1.category_id.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-350">Course Thumbnail Image</label>
                {thumbnailPreviewUrl && (
                  <div className="relative w-48 aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 mb-1">
                    <img src={thumbnailPreviewUrl} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setThumbnailFile(file);
                      setThumbnailPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                  className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <Button type="submit" isLoading={isSaving}>
                  Next: Specs
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </Card>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={h2(handleNextStep2)}>
            <Card className="p-8 space-y-6 border-slate-200/50 shadow-md">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">Course Specifications</h3>
                <p className="text-slate-500 text-xs">Outline details like difficulty level, language medium, duration, and detailed syllabus description.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-350">Detailed Markdown Description</label>
                <textarea
                  {...r2('description')}
                  rows={8}
                  placeholder="Provide a detailed syllabus overview of this course..."
                  className="w-full block rounded-lg text-sm transition-all duration-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-2.5 px-3 focus:outline-none focus:border-brand-500"
                />
                {e2.description && <p className="text-xs text-danger-600 mt-0.5">{e2.description.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-350">Difficulty Level</label>
                  <select
                    {...r2('difficulty')}
                    className="w-full block rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 py-2.5 px-3 focus:outline-none focus:border-brand-500"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>

                <Input
                  {...r2('language')}
                  type="text"
                  label="Teaching Language"
                  placeholder="English"
                  error={e2.language?.message}
                />

                <Input
                  {...r2('duration')}
                  type="number"
                  label="Duration (Hours)"
                  placeholder="10"
                  error={e2.duration?.message}
                />
              </div>

              <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-800/40">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  Next: Syllabus
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </Card>
          </form>
        )}

        {step === 3 && (
          <Card className="p-8 space-y-6 border-slate-200/50 shadow-md">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">Outcomes, Prerequisites & Tags</h3>
              <p className="text-slate-500 text-xs">Help students discover your course by detailing outcomes and catalog metadata tags.</p>
            </div>

            {/* Learning Outcomes List */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-350 block">Learning Outcomes (Min 1)</label>
              <div className="flex gap-2">
                <input
                  {...r3('outcome_input')}
                  type="text"
                  placeholder="e.g. Build modular monolithic folders backend"
                  className="flex-1 text-sm block rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 px-3 focus:outline-none focus:border-brand-500"
                />
                <Button type="button" size="sm" onClick={() => addItem('outcome')} className="px-3.5">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-col gap-1.5 pt-1.5">
                {activeOutcomes.map((outcome, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/30 px-3 py-2 rounded-lg text-xs">
                    <span>{outcome}</span>
                    <button type="button" onClick={() => removeItem('outcome', idx)} className="text-slate-400 hover:text-danger-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Prerequisites List */}
            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-350 block">Prerequisites</label>
              <div className="flex gap-2">
                <input
                  {...r3('prereq_input')}
                  type="text"
                  placeholder="e.g. Basic familiarity with REST API definitions"
                  className="flex-1 text-sm block rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 px-3 focus:outline-none focus:border-brand-500"
                />
                <Button type="button" size="sm" onClick={() => addItem('prereq')} className="px-3.5">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-col gap-1.5 pt-1.5">
                {activePrereqs.map((prereq, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/30 px-3 py-2 rounded-lg text-xs">
                    <span>{prereq}</span>
                    <button type="button" onClick={() => removeItem('prereq', idx)} className="text-slate-400 hover:text-danger-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags List */}
            <div className="space-y-3 pt-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-350 block">Search Metadata Tags</label>
              <div className="flex gap-2">
                <input
                  {...r3('tags_input')}
                  type="text"
                  placeholder="e.g. react, django, fullstack"
                  className="flex-1 text-sm block rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 px-3 focus:outline-none focus:border-brand-500"
                />
                <Button type="button" size="sm" onClick={() => addItem('tag')} className="px-3.5">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {activeTags.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
                    {tag}
                    <button type="button" onClick={() => removeItem('tag', idx)} className="hover:text-danger-600 transition-colors">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-800/40">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button type="button" onClick={handleNextStep3} isLoading={isSaving}>
                Next: Curriculum
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </Card>
        )}

        {step === 4 && (
          <Card className="p-8 space-y-6 border-slate-200/50 shadow-md">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">Course Curriculum Builder</h3>
              <p className="text-slate-500 text-xs">Organize your course syllabus into modules and lessons. Drag or move elements up/down.</p>
            </div>

            {draftId ? (
              <CurriculumTree courseId={draftId} />
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                Please save basic details first to build curriculum.
              </div>
            )}

            <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-800/40 mt-6">
              <Button type="button" variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button type="button" onClick={() => setStep(5)}>
                Next: Pricing
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          </Card>
        )}

        {step === 5 && (
          <form onSubmit={h4(handleNextStep4)}>
            <Card className="p-8 space-y-6 border-slate-200/50 shadow-md">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white">Course Pricing</h3>
                <p className="text-slate-500 text-xs">Set course values. Keep discount empty if not running a promotion.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  {...r4('price')}
                  type="number"
                  step="0.01"
                  label="Original Base Price ($)"
                  placeholder="49.99"
                  error={e4.price?.message}
                />

                <Input
                  {...r4('discount_price')}
                  type="number"
                  step="0.01"
                  label="Sale Discount Price ($) - Optional"
                  placeholder="29.99"
                  error={e4.discount_price?.message}
                />
              </div>

              <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-800/40">
                <Button type="button" variant="outline" onClick={() => setStep(4)}>
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
                <Button type="submit" isLoading={isSaving}>
                  Next: Preview
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </Card>
          </form>
        )}

        {step === 6 && (
          <Card className="p-8 space-y-8 border-slate-200/50 shadow-md">
            <div className="space-y-1 text-center max-w-sm mx-auto">
              <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <Check className="h-6 w-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">Almost there!</h3>
              <p className="text-slate-500 text-xs">Review details and publish this course draft to the public catalog directory.</p>
            </div>

            {/* Preview specs summary */}
            <div className="border border-slate-200/60 dark:border-slate-850 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 space-y-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Outlines Check Summary:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex justify-between p-2.5 rounded-lg border bg-white dark:bg-slate-950">
                  <span className="text-slate-400">Title:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Completed</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg border bg-white dark:bg-slate-950">
                  <span className="text-slate-400">Duration:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Completed</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg border bg-white dark:bg-slate-950">
                  <span className="text-slate-400">Learning Outcomes:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{activeOutcomes.length} Added</span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg border bg-white dark:bg-slate-950">
                  <span className="text-slate-400">Prerequisites:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{activePrereqs.length} Added</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-800/40">
              <Button type="button" variant="outline" onClick={() => setStep(5)}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => navigate('/instructor/courses')}>
                  Save Draft & Exit
                </Button>
                <Button type="button" onClick={handlePublish} isLoading={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                  Publish Course
                  <Play className="h-4 w-4 ml-1.5 fill-current" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
