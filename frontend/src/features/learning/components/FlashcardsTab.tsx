import React, { useState } from 'react';
import { api } from '../../../services/api';
import { Button } from '../../../components/ui/Button';
import { Brain, ArrowLeft, ArrowRight, RotateCw, Bookmark } from 'lucide-react';
import { toast } from '../../../store/toastStore';

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardsTabProps {
  lessonId: string;
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({ lessonId }) => {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post('ai/flashcards/generate/', { lesson_id: lessonId });
      const cardsList = res.data.results || res.data;
      if (cardsList && cardsList.length > 0) {
        setCards(cardsList);
        setCurrentIndex(0);
        setFlipped(false);
      } else {
        toast.error("Could not generate cards for this content.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to generate flashcards.");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setFlipped(false);
    setCurrentIndex(prev => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setFlipped(false);
    setCurrentIndex(prev => (prev - 1 + cards.length) % cards.length);
  };

  const toggleFavorite = (idx: number) => {
    if (favorites.includes(idx)) {
      setFavorites(prev => prev.filter(item => item !== idx));
    } else {
      setFavorites(prev => [...prev, idx]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1">
            <Brain className="h-4.5 w-4.5 text-brand-600" />
            AI Flashcards Deck
          </h2>
          <p className="text-[10px] text-slate-500">Auto-generate flashcards from lesson texts using spaced repetition criteria.</p>
        </div>
        {cards.length === 0 && (
          <Button size="sm" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Deck"}
          </Button>
        )}
      </div>

      {cards.length > 0 ? (
        <div className="space-y-6 max-w-md mx-auto">
          {/* Active Card Body */}
          <div 
            onClick={() => setFlipped(!flipped)}
            className="group relative h-48 w-full cursor-pointer [perspective:1000px]"
          >
            <div className={`relative h-full w-full rounded-2xl border transition-all duration-500 [transform-style:preserve-3d] ${flipped ? '[transform:rotateY(180deg)]' : ''} border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm`}>
              
              {/* Front Side */}
              <div className="absolute inset-0 flex flex-col p-6 [backface-visibility:hidden]">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Card {currentIndex + 1} of {cards.length}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(currentIndex);
                    }}
                    className="p-1 hover:text-amber-500"
                  >
                    <Bookmark className={`h-4 w-4 ${favorites.includes(currentIndex) ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>
                <div className="flex-1 flex items-center justify-center text-center font-bold text-slate-850 dark:text-slate-200 px-4 text-xs">
                  {cards[currentIndex].front}
                </div>
                <div className="text-[9px] text-center text-slate-400 font-medium flex items-center justify-center gap-1">
                  <RotateCw className="h-3 w-3 animate-spin-slow" /> Click to Flip
                </div>
              </div>

              {/* Back Side */}
              <div className="absolute inset-0 flex flex-col p-6 [transform:rotateY(180deg)] [backface-visibility:hidden] bg-slate-50 dark:bg-slate-900/90 rounded-2xl">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Answer Reference</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(currentIndex);
                    }}
                    className="p-1"
                  >
                    <Bookmark className={`h-4 w-4 ${favorites.includes(currentIndex) ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>
                <div className="flex-1 flex items-center justify-center text-center font-semibold text-brand-700 dark:text-brand-400 px-4 text-xs">
                  {cards[currentIndex].back}
                </div>
                <div className="text-[9px] text-center text-slate-400 font-medium flex items-center justify-center gap-1">
                  <RotateCw className="h-3 w-3" /> Click to Flip Front
                </div>
              </div>

            </div>
          </div>

          {/* Navigation Controllers */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex justify-between w-full sm:w-auto gap-4 order-2 sm:order-1">
              <Button variant="outline" size="sm" onClick={handlePrev} className="flex-1 sm:flex-none">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext} className="flex-1 sm:flex-none">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-center order-1 sm:order-2">
              <Button variant="ghost" size="sm" className="flex-1 sm:flex-none text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-[10px]">Easy (4d)</Button>
              <Button variant="ghost" size="sm" className="flex-1 sm:flex-none text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-955/20 text-[10px]">Hard (1d)</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400 border border-dashed rounded-2xl">
          Click the generate button above to auto-build flashcards from this lesson text.
        </div>
      )}
    </div>
  );
};
