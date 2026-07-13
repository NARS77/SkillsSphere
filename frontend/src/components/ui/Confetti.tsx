import React, { useEffect, useRef, useState } from 'react';

export const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handleTrigger = () => {
      setActive(true);
    };

    window.addEventListener('trigger-confetti-celebration', handleTrigger);
    return () => {
      window.removeEventListener('trigger-confetti-celebration', handleTrigger);
    };
  }, []);

  useEffect(() => {
    if (!active || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI screens
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    // Styling configuration
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const colors = [
      '#f43f5e', '#ec4899', '#d946ef', '#a855f7', 
      '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', 
      '#06b6d4', '#14b8a6', '#10b981', '#22c55e', 
      '#84cc16', '#eab308', '#f97316'
    ];
    
    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }

    const particles: Particle[] = [];
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * width,
        y: -20 - Math.random() * 100,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 5 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    let animationFrameId: number;
    let frames = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      frames++;

      let activeCount = 0;
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y < height) {
          activeCount++;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (activeCount > 0 && frames < 240) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        setActive(false);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
    />
  );
};

export const triggerConfetti = () => {
  window.dispatchEvent(new CustomEvent('trigger-confetti-celebration'));
};
