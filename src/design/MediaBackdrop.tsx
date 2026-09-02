import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// The tenant's food, behind everything.
//
// Video is the differentiator, so it has to be the thing that never breaks the
// panel: it is muted and inline (autoplay policy), it falls back to the poster
// on any error, and it does not play at all under prefers-reduced-motion. A
// panel that shows a broken video element sells less than one showing a photo.
//
// The scrim is not decoration. White display type over raw food photography
// fails contrast on the bright patches; the gradient is what keeps the headline
// readable no matter which frame is on screen.
// ---------------------------------------------------------------------------

export interface MediaBackdropProps {
  videoSrc?: string
  posterSrc?: string
  /** 0-100. Higher when type sits directly on top. */
  scrim?: number
}

export function MediaBackdrop({ videoSrc, posterSrc, scrim = 55 }: MediaBackdropProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const showVideo = Boolean(videoSrc) && !failed && !reducedMotion

  // Pause whenever the panel is not being looked at. Decoding video for a
  // backgrounded tab is pure heat on a machine that runs 12 hours a day.
  useEffect(() => {
    if (!showVideo) return
    const onVisibility = () => {
      const video = videoRef.current
      if (!video) return
      if (document.visibilityState === 'visible') void video.play().catch(() => setFailed(true))
      else video.pause()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [showVideo])

  return (
    // z-0, not -z-10: a negative index puts this BEHIND the stage's own
    // background, which paints over it and leaves a black panel. Content that
    // sits on top must be `relative z-10`.
    <div className="absolute inset-0 z-0 overflow-hidden bg-ink" data-testid="media-backdrop">
      {showVideo ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : posterSrc ? (
        <img src={posterSrc} alt="" className="size-full object-cover" />
      ) : null}

      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, rgba(11,11,12,${scrim / 100}) 0%, rgba(11,11,12,${
            Math.min(95, scrim + 25) / 100
          }) 100%)`,
        }}
      />
    </div>
  )
}
