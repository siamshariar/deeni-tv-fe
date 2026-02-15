'use client'

import { useEffect, useRef } from 'react'

interface TVHeroProps {
  videoId: string
}

export function TVHero({ videoId }: TVHeroProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // YouTube iframe API
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <iframe
        ref={iframeRef}
        className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '100vw',
          height: '100vh',
          minWidth: '177.77vh',
          minHeight: '56.25vw',
          objectFit: 'cover',
        }}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`}
        title="Background Video"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
      <div className="absolute inset-0 bg-black/20" />
    </div>
  )
}
