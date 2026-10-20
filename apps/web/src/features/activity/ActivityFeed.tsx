import { Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  CircleSlash,
  Heart,
  MessageSquare,
  PencilLine,
  PhoneCall,
  Send,
  Star,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { Activity, ActivityType } from '@tdc/shared';
import { cn, formatDateTime, relativeTime } from '../../lib/format';

const ICONS: Record<ActivityType, { Icon: typeof Send; tone: string }> = {
  note_added: { Icon: MessageSquare, tone: 'bg-sky-50 text-sky-700' },
  note_updated: { Icon: PencilLine, tone: 'bg-stone-100 text-stone-600' },
  note_deleted: { Icon: Trash2, tone: 'bg-stone-100 text-stone-600' },
  match_sent: { Icon: Send, tone: 'bg-brand-50 text-brand-700' },
  match_feedback: { Icon: Heart, tone: 'bg-rose-50 text-rose-700' },
  journey_status_changed: { Icon: ArrowRightLeft, tone: 'bg-violet-50 text-violet-700' },
  suggestion_shortlisted: { Icon: Star, tone: 'bg-amber-50 text-amber-700' },
  suggestion_dismissed: { Icon: CircleSlash, tone: 'bg-stone-100 text-stone-600' },
  suggestion_restored: { Icon: Undo2, tone: 'bg-stone-100 text-stone-600' },
  contact_logged: { Icon: PhoneCall, tone: 'bg-emerald-50 text-emerald-700' },
};

export function ActivityFeed({
  items,
  showCustomer = true,
  dense = false,
}: {
  items: Activity[];
  showCustomer?: boolean;
  dense?: boolean;
}) {
  return (
    <ol className="relative">
      {items.map((a, i) => {
        const { Icon, tone } = ICONS[a.type];
        return (
          <li key={a.id} className={cn('relative flex gap-3', dense ? 'pb-4' : 'pb-5')}>
            {i < items.length - 1 && (
              <span
                className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-stone-200"
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white',
                tone,
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm text-stone-800">
                {showCustomer && a.customerId && a.customerName && (
                  <>
                    <Link
                      to={`/customers/${a.customerId}`}
                      className="font-medium text-stone-900 hover:text-brand-700"
                    >
                      {a.customerName}
                    </Link>
                    <span className="text-stone-400"> · </span>
                  </>
                )}
                {a.message}
              </p>
              <p className="mt-0.5 text-xs text-stone-500">
                <time dateTime={a.createdAt} title={formatDateTime(a.createdAt)}>
                  {relativeTime(a.createdAt)}
                </time>
                {a.actorName && <> · {a.actorName}</>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
