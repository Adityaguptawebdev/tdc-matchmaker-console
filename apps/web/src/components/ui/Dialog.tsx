import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/format';
import { IconButton } from './Button';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Open dialogs, innermost last — only the top-most one reacts to Escape/Tab. */
const openStack: symbol[] = [];

/** Focus trap + Escape + scroll lock + focus restore, shared by Modal and Drawer. */
function useDialogBehaviour(
  open: boolean,
  onClose: () => void,
  panel: React.RefObject<HTMLDivElement>,
  dismissable: boolean,
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const token = Symbol('dialog');
    openStack.push(token);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const node = panel.current;
    const first =
      node?.querySelector<HTMLElement>('[data-autofocus]') ??
      [...(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].find(
        (el) => !el.hasAttribute('data-dialog-close'),
      );
    (first ?? node)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== token) return;
      if (e.key === 'Escape' && dismissable) {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === 'Tab' && node) {
        const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
          (el) => el.offsetParent !== null,
        );
        if (items.length === 0) return;
        const firstEl = items[0]!;
        const lastEl = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openStack.splice(openStack.indexOf(token), 1);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, panel, dismissable]);
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Prevent closing (e.g. while a request is in flight). */
  busy?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const MODAL_SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  busy,
  size = 'md',
}: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useDialogBehaviour(open, onClose, panel, !busy);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-stone-950/40 backdrop-blur-[2px]"
        onClick={() => !busy && onClose()}
        aria-hidden
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92vh] w-full animate-pop-in flex-col rounded-t-2xl bg-white shadow-pop sm:rounded-2xl',
          MODAL_SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-4">
          <div>
            <h2 id={`${id}-title`} className="text-base font-semibold text-stone-900">
              {title}
            </h2>
            {description && (
              <p id={`${id}-desc`} className="mt-1 text-sm text-stone-500">
                {description}
              </p>
            )}
          </div>
          <IconButton label="Close dialog" onClick={onClose} disabled={busy} data-dialog-close>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 bg-stone-50/60 px-6 py-3.5 sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, description, children, footer, busy }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useDialogBehaviour(open, onClose, panel, !busy);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 animate-fade-in bg-stone-950/30"
        onClick={() => !busy && onClose()}
        aria-hidden
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-2xl animate-slide-in flex-col bg-white shadow-pop"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-6 py-4">
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="text-base font-semibold text-stone-900">
              {title}
            </h2>
            {description && <div className="mt-1 text-sm text-stone-500">{description}</div>}
          </div>
          <IconButton label="Close panel" onClick={onClose} data-dialog-close>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 bg-stone-50/60 px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
