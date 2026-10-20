import type { CSSProperties, ReactNode } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '../../lib/format';

const EASE_SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/** Small hearts that drift upward once the two people meet. */
const FLOATERS = [
  { x: -22, delay: 0, size: 'h-3 w-3' },
  { x: 2, delay: 160, size: 'h-4 w-4' },
  { x: 24, delay: 320, size: 'h-3 w-3' },
];

/**
 * Two people approach from either side and a heart appears between them as they meet.
 * Pure CSS animation; the global reduced-motion rule in index.css collapses it to the final frame.
 */
export function CoupleMeeting({
  left,
  right,
  delayMs = 0,
  tone = 'dark',
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  /** When the approach starts. */
  delayMs?: number;
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const meet = delayMs + 600;
  const style = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });
  return (
    <div className={cn('relative flex items-center justify-center gap-4 sm:gap-5', className)} aria-hidden>
      <div className="animate-converge-left" style={style(delayMs)}>
        {left}
      </div>
      <Heart
        className={cn(
          'h-8 w-8',
          tone === 'dark' ? 'fill-rose-400 text-rose-400' : 'fill-rose-500 text-rose-500',
        )}
        style={{
          animation: `heart-pop 520ms ${EASE_SPRING} ${meet}ms both, heartbeat 1.8s ease-in-out ${meet + 700}ms infinite`,
        }}
      />
      <div className="animate-converge-right" style={style(delayMs)}>
        {right}
      </div>
      {FLOATERS.map((f) => (
        <Heart
          key={f.x}
          className={cn(
            'absolute left-1/2 top-0 animate-heart-float',
            f.size,
            tone === 'dark' ? 'fill-rose-300/80 text-rose-300/80' : 'fill-rose-400/70 text-rose-400/70',
          )}
          style={{ marginLeft: f.x, ...style(meet + 200 + f.delay) }}
        />
      ))}
    </div>
  );
}
