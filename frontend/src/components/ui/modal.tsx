import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, description, children, footer, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-2 sm:p-4 animate-in fade-in">
      <div
        className={cn(
          'relative w-full max-h-[92vh] flex flex-col rounded-xl bg-white p-4 sm:p-6 shadow-xl border border-gray-200 overflow-hidden',
          maxWidth
        )}
      >
        <div className="flex items-start justify-between gap-3 pb-3 sm:pb-4 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{title}</h3>
            {description && <p className="text-xs text-gray-500 mt-0.5 break-words">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="py-3 sm:py-4 overflow-y-auto flex-1 min-h-0">{children}</div>

        {footer && (
          <div className="flex flex-wrap justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
