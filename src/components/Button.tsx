import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-sage-500 text-white shadow-sm active:bg-sage-600 disabled:bg-sage-200 disabled:text-sage-400 disabled:shadow-none',
  secondary:
    'bg-sage-100 text-sage-700 active:bg-sage-200 disabled:bg-cream-100 disabled:text-slate-300',
  ghost: 'bg-transparent text-sage-600 active:bg-sage-50 disabled:text-slate-300',
  danger: 'bg-blush-500 text-white shadow-sm active:bg-blush-600 disabled:bg-blush-100',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}
