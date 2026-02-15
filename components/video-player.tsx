'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, Maximize, MoreHorizontal, Minimize, Maximize2, Tv } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useMediaQuery } from '@/hooks/use-media-query'

interface VideoPlayerProps {
  videoId: string
  onMenuOpen: () => void
  onChannelSwitcherOpen: () => void
}

// Extend Window interface for YouTube API
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export function VideoPlayer({ videoId, onMenuOpen, onChannelSwitcherOpen }: VideoPlayerProps) {
  const [showControls, setShowControls] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isTheaterMode, setIsTheaterMode] = useState(false)
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)
  const iframeContainerRef = useRef<HTMLDivElement>(null)
  const ytPlayerRef = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Initialize YouTube IFrame API
  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    // Initialize player when API is ready
    const initPlayer = () => {
      if (window.YT && window.YT.Player && iframeContainerRef.current) {
        ytPlayerRef.current = new window.YT.Player(iframeContainerRef.current, {
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            mute: 0,
            loop: 1,
            playlist: videoId,
            controls: 0,
            showinfo: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
          },
          events: {
            onReady: (event: any) => {
              event.target.setVolume(volume)
              event.target.playVideo()
            },
            onStateChange: (event: any) => {
              // Ensure continuous playback
              if (event.data === window.YT.PlayerState.ENDED) {
                event.target.playVideo()
              }
            },
          },
        })
      }
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
    } else {
      window.onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
        ytPlayerRef.current.destroy()
      }
    }
  }, [videoId, volume])

  const handleActivity = useCallback(() => {
    if (!isFullscreen) return // Only auto-hide in fullscreen
    
    setShowControls(true)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)
  }, [isFullscreen])

  const toggleMute = () => {
    if (ytPlayerRef.current) {
      if (isMuted) {
        ytPlayerRef.current.unMute()
        ytPlayerRef.current.setVolume(volume)
      } else {
        ytPlayerRef.current.mute()
      }
    }
    setIsMuted(prev => !prev)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    setShowVolumeTooltip(true)
    
    // Imperatively update YouTube player volume without reloading
    if (ytPlayerRef.current && ytPlayerRef.current.setVolume) {
      ytPlayerRef.current.setVolume(newVolume)
      if (newVolume > 0 && isMuted) {
        ytPlayerRef.current.unMute()
        setIsMuted(false)
      }
    }

    // Hide tooltip after delay
    setTimeout(() => setShowVolumeTooltip(false), 1000)
  }

  const handleFullscreen = () => {
    if (!playerRef.current) return
    
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      playerRef.current.requestFullscreen()
    }
  }

  const toggleTheaterMode = () => {
    setIsTheaterMode(prev => !prev)
  }

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      if (document.fullscreenElement) {
        setShowControls(true)
      } else {
        setShowControls(true)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Handle activity in fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      const player = playerRef.current
      if (player) {
        player.addEventListener('mousemove', handleActivity)
        player.addEventListener('mouseenter', handleActivity)
        
        return () => {
          player.removeEventListener('mousemove', handleActivity)
          player.removeEventListener('mouseenter', handleActivity)
        }
      }
    }
  }, [handleActivity, isFullscreen])

  return (
    <div className={`relative flex items-center justify-center bg-zinc-950 ${isTheaterMode ? 'p-0' : 'min-h-screen'}`}>
      {/* 16:9 Video Container - Responsive */}
      <div className={`w-full ${isTheaterMode ? '' : 'md:w-[70vw] md:max-w-[1400px]'}`}>
        <div 
          ref={playerRef}
          className={`relative w-full aspect-video bg-black overflow-hidden shadow-2xl ${isFullscreen ? '' : 'rounded-lg'}`}
        >
          {/* YouTube iframe container */}
          <div
            ref={iframeContainerRef}
            className="absolute inset-0 w-full h-full"
          />
          
          {/* Transparent overlay to block iframe interactions */}
          <div className="absolute inset-0 w-full h-full pointer-events-auto" />

          {/* Fullscreen Overlay Controls */}
          {isFullscreen && (
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3 }}
                  className="absolute bottom-0 left-0 right-0 z-50"
                >
                  <div className="bg-zinc-900/90 backdrop-blur-md border-t border-zinc-700/50 px-6 py-4">
                    <div className="flex items-center justify-between gap-6">
                      {/* Left: Volume Controls */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 max-w-xs relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={toggleMute}
                          className="text-white hover:bg-white/10 shrink-0"
                        >
                          {isMuted ? (
                            <VolumeX className="h-5 w-5" />
                          ) : (
                            <Volume2 className="h-5 w-5" />
                          )}
                        </Button>
                        <div className="flex-1 relative">
                          <Slider
                            value={[volume]}
                            onValueChange={handleVolumeChange}
                            max={100}
                            step={1}
                            className="w-full"
                            disabled={isMuted}
                          />
                          {showVolumeTooltip && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-sm font-medium whitespace-nowrap"
                            >
                              {Math.round(volume)}%
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {/* Center: Live Badge */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 rounded-full">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="text-red-100 text-sm font-medium uppercase tracking-wider">Live</span>
                      </div>

                      {/* Right: Action Group */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onChannelSwitcherOpen}
                          className="text-white hover:bg-white/10"
                          title="Switch Channel"
                        >
                          <Tv className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleFullscreen}
                          className="text-white hover:bg-white/10"
                        >
                          <Minimize className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onMenuOpen}
                          className="text-white hover:bg-white/10"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Windowed Mode Controls - Always visible below video */}
        {!isFullscreen && (
          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-b-lg px-4 py-3 -mt-1">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Volume Controls */}
              <div className="flex items-center gap-3 min-w-0 flex-1 max-w-xs relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/10 shrink-0"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <div className="hidden sm:block flex-1 relative">
                  <Slider
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="w-full"
                    disabled={isMuted}
                  />
                  {showVolumeTooltip && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-white px-2 py-1 rounded text-sm font-medium whitespace-nowrap"
                    >
                      {Math.round(volume)}%
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Center: Live Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-red-100 text-sm font-medium uppercase tracking-wider">Live</span>
              </div>

              {/* Right: Action Group */}
              <div className="flex items-center gap-2">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheaterMode}
                    className="text-white hover:bg-white/10"
                    title="Theater Mode"
                  >
                    {isTheaterMode ? (
                      <Minimize className="h-5 w-5" />
                    ) : (
                      <Maximize2 className="h-5 w-5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onChannelSwitcherOpen}
                  className="text-white hover:bg-white/10"
                  title="Switch Channel"
                >
                  <Tv className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFullscreen}
                  className="text-white hover:bg-white/10"
                >
                  <Maximize className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMenuOpen}
                  className="text-white hover:bg-white/10"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
