import * as React from 'react'

import { cn } from '@/lib/utils'
import { PixelEdges } from '@/components/ui/8bit-button'

/** 8-bit card: surface panel with a notched pixel border. */
export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('retro relative m-1.5 bg-surface text-ink', className)} {...props}>
      {children}
      <PixelEdges />
    </div>
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-2 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('retro text-center text-[15px] leading-relaxed uppercase', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('retro text-center text-[9px] leading-relaxed text-ink/60', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-6', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center px-6 pb-6', className)} {...props} />
}
