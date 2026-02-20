'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, ArrowRight } from 'lucide-react'
import { CurrentVideoData, VideoProgram } from '@/types/schedule'
import { formatTime, formatDuration } from '@/lib/schedule-utils'

interface TVTickerProps {
  isVisible?: boolean
  className?: string
  currentData?: CurrentVideoData | null
  actualTimeRemaining?: number
}

export function TVTicker({ isVisible = true, className = '', currentData: propCurrentData, actualTimeRemaining }: TVTickerProps) {
  const [currentData, setCurrentData] = useState<CurrentVideoData | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [upcomingVideos, setUpcomingVideos] = useState<VideoProgram[]>([])

  // Use prop data if provided, otherwise fetch
  useEffect(() => {
    if (propCurrentData) {
      setCurrentData(propCurrentData)
      setTimeRemaining(actualTimeRemaining ?? propCurrentData.timeRemaining)
    } else {
      // Fallback to fetching if no prop data
      const fetchData = async () => {
        try {
          const response = await fetch('/api/current-video')
          const result = await response.json()
          if (result.success && result.data) {
            setCurrentData(result.data)
            setTimeRemaining(result.data.timeRemaining)
          }
        } catch (error) {
          console.error('Error fetching ticker data:', error)
        }
      }

      fetchData()
      const interval = setInterval(fetchData, 30000) // Update every 30 seconds

      return () => clearInterval(interval)
    }
  }, [propCurrentData, actualTimeRemaining])

  // Fetch upcoming videos
  useEffect(() => {
    const fetchUpcoming = async () => {
      try {
        const response = await fetch('/api/upcoming-videos?count=5')
        const result = await response.json()
        if (result.success && result.data) {
          setUpcomingVideos(result.data.upcoming)
        }
      } catch (error) {
        console.error('Error fetching upcoming videos:', error)
      }
    }

    fetchUpcoming()
    const interval = setInterval(fetchUpcoming, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Update time remaining when prop changes
  useEffect(() => {
    if (actualTimeRemaining !== undefined) {
      setTimeRemaining(actualTimeRemaining)
    }
  }, [actualTimeRemaining])

  // Countdown timer (only if not using real-time prop data)
  useEffect(() => {
    if (!actualTimeRemaining && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => Math.max(0, prev - 1))
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeRemaining, actualTimeRemaining])

  if (!isVisible || !currentData) return null

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-30 ${className}`}>
      {/* Main Ticker Bar */}
      <div className="relative overflow-hidden bg-gradient-to-r from-zinc-900/95 via-zinc-900/90 to-zinc-900/95 backdrop-blur-lg border-t border-white/10 shadow-2xl">
        <div className="relative h-20 flex items-center">
          {/* Current Program Info - Left Side */}
          <div className="flex items-center gap-4 px-6 min-w-0 flex-shrink-0">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/30 border border-red-500/50 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-red-100 text-xs font-bold uppercase tracking-wider">NOW</span>
            </div>

            {/* Program Title */}
            <div className="flex flex-col">
              <p className="text-white font-bold text-base line-clamp-1">
                {currentData.program.title}
              </p>
              <p className="text-white/60 text-xs font-medium">
                {currentData.program.category} {currentData.program.language && `• ${currentData.program.language}`}
              </p>
            </div>

            {/* Time Remaining */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="text-white text-xs font-semibold">
                {formatTime(timeRemaining)}
              </span>
            </div>
          </div>

          {/* Separator */}
          <div className="h-10 w-px bg-white/20 mx-4 flex-shrink-0" />

          {/* Up Next - Scrolling Section */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <ScrollingUpcomingVideos videos={upcomingVideos} />
          </div>

          {/* Next Program Indicator - Right Side */}
          {currentData.nextProgram && (
            <div className="flex items-center gap-3 px-6 flex-shrink-0">
              <ArrowRight className="h-4 w-4 text-primary animate-pulse" />
              <div className="flex flex-col">
                <p className="text-white/60 text-[10px] uppercase tracking-wider font-semibold">
                  Up Next
                </p>
                <p className="text-white text-sm font-semibold line-clamp-1">
                  {currentData.nextProgram.title}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/60"
            initial={{ width: '0%' }}
            animate={{
              width: `${((currentData.program.duration - timeRemaining) / currentData.program.duration) * 100}%`
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Scrolling Upcoming Videos Component
 * Creates continuous scrolling marquee effect showing upcoming videos
 */
function ScrollingUpcomingVideos({ videos }: { videos: VideoProgram[] }) {
  if (videos.length === 0) {
    return (
      <div className="relative flex overflow-hidden h-full items-center">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{
            x: [0, -1000],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <span className="text-primary font-semibold text-sm px-4">
            More great content coming up...
          </span>
          <span className="text-white/40 text-sm px-2">•</span>
          <span className="text-primary font-semibold text-sm px-4">
            More great content coming up...
          </span>
        </motion.div>
      </div>
    )
  }

  // Create a repeating sequence of upcoming videos for continuous scrolling
  const scrollingItems: string[] = []
  for (let i = 0; i < 6; i++) { // Repeat 6 times for smooth scrolling
    videos.forEach((video, index) => {
      if (index === 0) {
        scrollingItems.push(`NEXT: ${video.title} • ${formatDuration(video.duration)}`)
      } else {
        scrollingItems.push(`UP NEXT: ${video.title} • ${formatDuration(video.duration)}`)
      }
    })
  }

  return (
    <div className="relative flex overflow-hidden h-full items-center">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{
          x: [0, -2000], // Move further to accommodate more content
        }}
        transition={{
          duration: 30, // Slower for better readability
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {scrollingItems.map((item, index) => (
          <span key={index} className="text-primary font-semibold text-sm px-4">
            {item}
          </span>
        ))}
        {scrollingItems.map((item, index) => (
          <span key={`repeat-${index}`} className="text-primary font-semibold text-sm px-4">
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

/**
 * Scrolling Text Component
 * Creates continuous scrolling marquee effect like TV news tickers
 */
function ScrollingText({ text }: { text: string }) {
  return (
    <div className="relative flex overflow-hidden h-full items-center">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{
          x: [0, -1000],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <span className="text-primary font-semibold text-sm px-4">
          {text}
        </span>
        <span className="text-white/40 text-sm px-2">•</span>
        <span className="text-primary font-semibold text-sm px-4">
          {text}
        </span>
        <span className="text-white/40 text-sm px-2">•</span>
        <span className="text-primary font-semibold text-sm px-4">
          {text}
        </span>
        <span className="text-white/40 text-sm px-2">•</span>
        <span className="text-primary font-semibold text-sm px-4">
          {text}
        </span>
      </motion.div>
    </div>
  )
}

/**
 * Mini Ticker - Compact version for fullscreen mode
 */
export function TVTickerMini({ className = '' }: { className?: string }) {
  const [currentData, setCurrentData] = useState<CurrentVideoData | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/current-video')
        const result = await response.json()
        if (result.success && result.data) {
          setCurrentData(result.data)
        }
      } catch (error) {
        console.error('Error fetching ticker data:', error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)

    return () => clearInterval(interval)
  }, [])

  if (!currentData) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-20 left-6 right-6 z-40 ${className}`}
    >
      <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 px-2 py-1 bg-red-600/30 border border-red-500/50 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-red-100 text-xs font-bold uppercase">NO</span>
            </div>
            <p className="text-white font-bold text-sm line-clamp-1">
              {currentData.program.title}
            </p>
          </div>
          {currentData.nextProgram && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
              <p className="text-white/80 text-xs font-medium">
                {currentData.nextProgram.title}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
