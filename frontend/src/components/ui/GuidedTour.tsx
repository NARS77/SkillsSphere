import React, { useState, useEffect } from 'react';
import { Sparkles, BookOpen, Award, LayoutDashboard, Play, Brain, TrendingUp, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const GuidedTour: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Show tour if not previously completed
    const completed = localStorage.getItem('skillsphere_tour_completed');
    if (completed !== 'true') {
      // Delay slightly for smooth transition on initial mount
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const steps: TourStep[] = [
    {
      title: "Welcome to SkillSphere",
      description: "Let's take a quick 1-minute tour of your next-generation intelligence learning suite.",
      icon: <Sparkles className="h-10 w-10 text-indigo-500 animate-pulse" />
    },
    {
      title: "Student Dashboard",
      description: "Track your active learning hours, completed certifications, average quiz scores, and recent activities in one clean overview.",
      icon: <LayoutDashboard className="h-10 w-10 text-blue-500" />
    },
    {
      title: "Course Catalog",
      description: "Browse curated, high-performance tech courses matching all skill levels. Filter by categories, find detailed curriculums, and enroll.",
      icon: <BookOpen className="h-10 w-10 text-emerald-500" />
    },
    {
      title: "Immersive Learning Player",
      description: "Stream lectures in a focused workspace. Access lecture slides, reference download materials, and save notes directly linked to video timestamps.",
      icon: <Play className="h-10 w-10 text-amber-500" />
    },
    {
      title: "Interactive AI Tutor",
      description: "Get immediate answers to coding queries and complex topics. The AI Study Tutor is accessible inside every lesson module.",
      icon: <Brain className="h-10 w-10 text-purple-500" />
    },
    {
      title: "Verifiable Certificates",
      description: "Finish 100% of course lessons, quizzes, and assignments to unlock cryptographic, shareable certificates for your resume.",
      icon: <Award className="h-10 w-10 text-indigo-500" />
    },
    {
      title: "Analytics & Payouts Console",
      description: "Instructors and administrators can check monthly revenue trends, active student timelines, test scores, and AI token usages.",
      icon: <TrendingUp className="h-10 w-10 text-rose-500" />
    },
    {
      title: "You're All Set!",
      description: "Enjoy exploring SkillSphere. Choose a role or course and begin your learning journey.",
      icon: <Sparkles className="h-10 w-10 text-emerald-500 animate-bounce" />
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('skillsphere_tour_completed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const activeStep = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden p-6 text-center space-y-6">
        
        {/* Close/Skip button */}
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-655 dark:hover:text-slate-350 transition-colors p-1"
          aria-label="Skip tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon container */}
        <div className="mx-auto h-20 w-20 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-full flex items-center justify-center">
          {activeStep.icon}
        </div>

        {/* Title & Description */}
        <div className="space-y-2 px-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            {activeStep.title}
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-light">
            {activeStep.description}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-1.5 pt-2">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-250 ${
                idx === currentStep
                  ? 'w-6 bg-indigo-600 dark:bg-indigo-500'
                  : 'w-1.5 bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Actions panel */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-850/80">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className={`text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs ${currentStep === 0 ? 'invisible' : ''}`}
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>

          <Button
            size="sm"
            onClick={handleNext}
            className="text-xs px-5 shadow-sm"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            {currentStep < steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
};
