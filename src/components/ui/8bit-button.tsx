import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/** 8-bit button: retro font, notched pixel border built from four edge bars. */
export const buttonVariants = cva(
  'retro relative m-1.5 inline-flex items-center justify-center gap-2 whitespace-nowrap uppercase outline-none transition-[transform,background-color,color] duration-100 active:translate-y-1 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-4 focus-visible:ring-ink/30',
  {
    variants: {
      variant: {
        default: 'bg-ink text-parchment hover:bg-ink/85',
        secondary: 'bg-surface text-ink hover:bg-band',
        outline: 'bg-transparent text-ink hover:bg-ink/5',
        destructive: 'bg-loss text-parchment hover:bg-loss/85',
        ghost: 'bg-transparent text-ink hover:bg-ink/5',
      },
      size: {
        default: 'h-11 px-5 text-[11px]',
        sm: 'h-9 px-3 text-[10px]',
        lg: 'h-14 px-8 text-[13px]',
        icon: 'size-10 text-[11px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function PixelEdges({ className = 'bg-ink', w = 'w-1.5', h = 'h-1.5', inset = '1.5' }: { className?: string; w?: string; h?: string; inset?: '1' | '1.5' }) {
  const o = inset === '1' ? { t: '-top-1', b: '-bottom-1', l: '-left-1', r: '-right-1', x: 'left-1 right-1', y: 'top-1 bottom-1' } : { t: '-top-1.5', b: '-bottom-1.5', l: '-left-1.5', r: '-right-1.5', x: 'left-1.5 right-1.5', y: 'top-1.5 bottom-1.5' }
  return (
    <>
      <span aria-hidden="true" className={cn('pointer-events-none absolute', o.t, o.x, h, className)} />
      <span aria-hidden="true" className={cn('pointer-events-none absolute', o.b, o.x, h, className)} />
      <span aria-hidden="true" className={cn('pointer-events-none absolute', o.l, o.y, w, className)} />
      <span aria-hidden="true" className={cn('pointer-events-none absolute', o.r, o.y, w, className)} />
    </>
  )
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, size, children, ...props }, ref) {
  return (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
      {variant !== 'ghost' && <PixelEdges />}
    </button>
  )
})

export default Button
