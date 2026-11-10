import { useLayoutEffect, type RefObject } from 'react'
import { gsap, prefersReducedMotion } from '../lib/gsap'

/**
 * Runs a GSAP setup function scoped to a container and reverts on unmount.
 * The callback receives `reduced` so scenes can fall back to static states.
 */
export function useGsap(
  scope: RefObject<HTMLElement | null>,
  setup: (ctx: { reduced: boolean; q: (sel: string) => Element[] }) => void,
  deps: unknown[] = [],
) {
  useLayoutEffect(() => {
    if (!scope.current) return
    const reduced = prefersReducedMotion()
    const ctx = gsap.context(() => {
      setup({ reduced, q: gsap.utils.selector(scope.current) })
    }, scope)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
