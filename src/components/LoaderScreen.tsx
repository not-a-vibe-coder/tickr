import TetrisLoading from '@/components/ui/tetris-loader'

/** Full-page loading screen: the Tetris loader centred in the storybook frame. */
export default function LoaderScreen({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="frame-page grid place-items-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center">
        <TetrisLoading size="md" speed="fast" loadingText={text} />
      </div>
    </div>
  )
}

/** Inline variant for panels (e.g. while today's puzzle loads). */
export function LoaderInline({ text = 'Loading…' }: { text?: string }) {
  return (
    <div className="grid place-items-center py-10" role="status" aria-live="polite">
      <TetrisLoading size="sm" speed="fast" loadingText={text} />
    </div>
  )
}
