import React, { useRef, useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { Play, Pause, RotateCcw, Maximize, Settings } from 'lucide-react';

interface VideoPlayerProps {
  lessonId: string;
  videoUrl: string;
  initialPosition?: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  lessonId, 
  videoUrl, 
  initialPosition = 0 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const lastSavedTime = useRef(initialPosition);

  // Parse if it's YouTube/Vimeo or direct URL
  const isEmbed = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo.com');

  // Resume playback position on video load
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = initialPosition;
      lastSavedTime.current = initialPosition;
    }
  }, [lessonId, initialPosition]);

  // Listen for video seek requests (e.g. from notes timestamp clicks)
  useEffect(() => {
    const handleSeek = (e: any) => {
      if (videoRef.current && typeof e.detail?.seconds === 'number') {
        const targetSeconds = e.detail.seconds;
        if (targetSeconds >= 0) {
          videoRef.current.currentTime = targetSeconds;
          setCurrentTime(targetSeconds);
          if (!isPlaying) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        }
      }
    };
    window.addEventListener('classroom-seek-video', handleSeek);
    return () => {
      window.removeEventListener('classroom-seek-video', handleSeek);
    };
  }, [isPlaying, lessonId]);

  // Debounced/throttled watch progress sync (runs once every 5 seconds or on pause/end)
  const saveProgress = async (seconds: number) => {
    const roundedSeconds = Math.round(seconds);
    if (roundedSeconds === Math.round(lastSavedTime.current)) return;
    
    try {
      lastSavedTime.current = roundedSeconds;
      await api.post(`learning/${lessonId}/position/`, { seconds: roundedSeconds });
    } catch (err) {
      console.error('Failed to sync watch progress:', err);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    setCurrentTime(current);
    
    // Dispatch event for notes integration
    window.dispatchEvent(new CustomEvent('video-time-ping', { detail: { seconds: current } }));
    
    // Save progress every 5 seconds
    if (Math.abs(current - lastSavedTime.current) >= 5) {
      saveProgress(current);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    if (initialPosition > 0 && initialPosition < videoRef.current.duration) {
      videoRef.current.currentTime = initialPosition;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      saveProgress(videoRef.current.currentTime);
    } else {
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedMenu(false);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Safe clean-up on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        saveProgress(videoRef.current.currentTime);
      }
    };
  }, [lessonId]);

  if (isEmbed) {
    // If it's a YouTube embed, convert normal links to embed URL
    let embedSrc = videoUrl;
    if (videoUrl.includes('youtube.com/watch')) {
      const urlParams = new URLSearchParams(new URL(videoUrl).search);
      const videoId = urlParams.get('v');
      embedSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } else if (videoUrl.includes('youtu.be/')) {
      const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
      embedSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }

    return (
      <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden shadow-2xl border border-slate-200/20">
        <iframe
          src={embedSrc}
          title="Lesson Video Player"
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden shadow-2xl group border border-slate-200/20">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onEnded={() => {
          setIsPlaying(false);
          if (videoRef.current) saveProgress(videoRef.current.duration);
        }}
      />

      {/* Modern Player Overlay Controls */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        
        {/* Timeline Slider bar */}
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (videoRef.current) {
                videoRef.current.currentTime = val;
                setCurrentTime(val);
              }
            }}
            className="flex-1 h-1 rounded bg-slate-600 appearance-none cursor-pointer accent-brand-500"
          />
          <span className="text-[10px] font-bold text-white select-none">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Action Panel */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="hover:text-brand-400 transition-colors">
              {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            
            <button 
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
              }}
              className="hover:text-brand-400 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Speed Selector */}
            <button 
              onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
              className="text-xs font-bold hover:text-brand-400 flex items-center gap-1 transition-colors"
            >
              <Settings className="h-4 w-4" />
              {playbackSpeed}x
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-8 right-0 bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 flex flex-col gap-1 z-20 shadow-2xl">
                {[0.5, 1, 1.25, 1.5, 2].map((sp) => (
                  <button
                    key={sp}
                    onClick={() => handleSpeedChange(sp)}
                    className={`text-[10px] font-bold hover:bg-slate-800 py-1 px-3.5 rounded text-left ${playbackSpeed === sp ? 'text-brand-400' : 'text-slate-300'}`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            )}

            <button 
              onClick={() => {
                if (videoRef.current) {
                  if (document.fullscreenElement) {
                    document.exitFullscreen();
                  } else {
                    videoRef.current.requestFullscreen().catch(() => {});
                  }
                }
              }}
              className="hover:text-brand-400 transition-colors"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
