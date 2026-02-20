'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, Maximize, MoreHorizontal, Minimize, Tv, Clock, ArrowRight, Eye, EyeOff, Repeat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useMediaQuery } from '@/hooks/use-media-query'
import { CurrentVideoData, VideoProgram } from '@/types/schedule'
import { formatTime, SCHEDULE, MASTER_EPOCH_START, getTotalScheduleDuration } from '@/lib/schedule-utils'

interface SyncedVideoPlayerProps {
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

export function SyncedVideoPlayer({ onMenuOpen, onChannelSwitcherOpen }: SyncedVideoPlayerProps) {
  const [showControls, setShowControls] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [volume, setVolume] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false)
  const [forceRotate, setForceRotate] = useState(false)
  const [currentData, setCurrentData] = useState<CurrentVideoData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [upcomingVideos, setUpcomingVideos] = useState<VideoProgram[]>([])
  const [showTicker, setShowTicker] = useState(true)
  const [playerReady, setPlayerReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('syncing')
  const [cycleInfo, setCycleInfo] = useState<{ current: number; total: number }>({ current: 0, total: 5 })
  
  const playerRef = useRef<HTMLDivElement>(null)
  const iframeContainerRef = useRef<HTMLDivElement>(null)
  const ytPlayerRef = useRef<any>(null)
  const volumeRef = useRef<number>(volume)
  const fetchMetaRef = useRef<{ inFlight: boolean; lastTime: number; lastData: any }>({ inFlight: false, lastTime: 0, lastData: null })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const openMenuAfterExitRef = useRef(false)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const hasInitializedRef = useRef(false)
  const currentDataRef = useRef<CurrentVideoData | null>(null)
  const lastVideoIdRef = useRef<string>('')
  const syncInProgressRef = useRef<boolean>(false)
  const videoEndCheckRef = useRef<NodeJS.Timeout | null>(null)
  const syncLockRef = useRef<boolean>(false)
  const cycleTransitionRef = useRef<boolean>(false)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)
  const masterEpochRef = useRef<number>(MASTER_EPOCH_START)

  /**
   * CRITICAL: Calculate exact playback time using master epoch
   * This ensures ALL users get the EXACT same result regardless of when they joined
   */
  const calculateExactPlaybackTime = useCallback((): { 
    videoId: string, 
    currentTime: number,
    programIndex: number 
  } => {
    const now = Date.now()
    const totalDuration = getTotalScheduleDuration()
    
    // Calculate position from master epoch (SAME for ALL users)
    const elapsedSinceEpoch = Math.floor((now - masterEpochRef.current) / 1000)
    const cyclePosition = elapsedSinceEpoch % totalDuration
    
    // Find current program
    let accumulatedTime = 0
    let currentProgram = SCHEDULE[0]
    let currentTime = 0
    let programIndex = 0
    
    for (let i = 0; i < SCHEDULE.length; i++) {
      const program = SCHEDULE[i]
      if (cyclePosition >= accumulatedTime && cyclePosition < accumulatedTime + program.duration) {
        currentProgram = program
        currentTime = cyclePosition - accumulatedTime
        programIndex = i
        break
      }
      accumulatedTime += program.duration
    }
    
    return {
      videoId: currentProgram.videoId,
      currentTime,
      programIndex
    }
  }, [])

  /**
   * Force perfect sync - ensures ALL users are at EXACT same position
   */
  const forcePerfectSync = useCallback(async () => {
    if (!ytPlayerRef.current || !hasInitializedRef.current || syncLockRef.current) return
    
    syncLockRef.current = true
    
    try {
      // Calculate exact time using master epoch (no server needed for this part)
      const exactTime = calculateExactPlaybackTime()
      
      // Get current player state
      const currentVideoId = typeof ytPlayerRef.current.getVideoData === 'function' 
        ? ytPlayerRef.current.getVideoData()?.video_id 
        : lastVideoIdRef.current

      // If video needs to change
      if (currentVideoId !== exactTime.videoId) {
        console.log('🔄 Perfect sync: switching to', exactTime.videoId, 'at', exactTime.currentTime.toFixed(2))
        
        if (typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById({
            videoId: exactTime.videoId,
            startSeconds: Math.floor(exactTime.currentTime)
          })
        }
        
        // Update cycle info
        setCycleInfo({
          current: exactTime.programIndex + 1,
          total: SCHEDULE.length
        })
        
        lastVideoIdRef.current = exactTime.videoId
      } else {
        // Same video - check drift
        const playerTime = ytPlayerRef.current.getCurrentTime?.() || 0
        const drift = Math.abs(playerTime - exactTime.currentTime)
        
        // Correct any drift > 0.1 seconds
        if (drift > 0.1 && typeof ytPlayerRef.current.seekTo === 'function') {
          console.log(`🎯 Perfect sync: correcting drift ${drift.toFixed(3)}s to ${exactTime.currentTime.toFixed(3)}s`)
          ytPlayerRef.current.seekTo(exactTime.currentTime, true)
          setCurrentTime(exactTime.currentTime)
        }
      }
      
      // Broadcast sync to other tabs
      try {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage({ 
            type: 'perfect-sync', 
            time: exactTime.currentTime,
            videoId: exactTime.videoId,
            programIndex: exactTime.programIndex,
            timestamp: Date.now()
          })
        }
      } catch (err) {
        // Ignore broadcast errors
      }
    } catch (err) {
      console.error('Error in perfect sync:', err)
    } finally {
      syncLockRef.current = false
    }
  }, [calculateExactPlaybackTime])

  /**
   * Fetch current video data from API (as backup, but we mainly use master epoch)
   */
  const fetchCurrentVideo = useCallback(async (skipCache = false) => {
    const now = Date.now()
    const meta = fetchMetaRef.current
    const FETCH_CACHE_MS = 5000 // 5 second cache

    if (!skipCache && meta.lastTime && now - meta.lastTime < FETCH_CACHE_MS && meta.lastData) {
      return meta.lastData
    }

    if (meta.inFlight) {
      return meta.lastData || null
    }

    meta.inFlight = true
    try {
      const response = await fetch('/api/current-video', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      })
      const result = await response.json()

      if (result.success && result.data) {
        // Update master epoch if provided
        if (result.data.masterEpoch) {
          masterEpochRef.current = result.data.masterEpoch
        }
        
        if (!meta.lastData || meta.lastData.program.id !== result.data.program.id) {
          setCurrentData(result.data)
          
          // Calculate exact time using master epoch
          const exactTime = calculateExactPlaybackTime()
          setCurrentTime(exactTime.currentTime)
          
          setCycleInfo({
            current: exactTime.programIndex + 1,
            total: SCHEDULE.length
          })
        }
        setSyncError(null)
        setSyncStatus('synced')
        meta.lastData = result.data
        meta.lastTime = Date.now()
        
        return result.data
      }
    } catch (error) {
      console.error('Error fetching current video:', error)
      setSyncError('Sync issue - using master time')
      setSyncStatus('syncing')
    } finally {
      meta.inFlight = false
    }
    return null
  }, [calculateExactPlaybackTime])

  /**
   * Handle video ended - load next automatically
   */
  const handleVideoEnded = useCallback(async () => {
    if (syncInProgressRef.current || cycleTransitionRef.current) return
    
    console.log('📺 Video ended, calculating next from master epoch...')
    syncInProgressRef.current = true
    cycleTransitionRef.current = true
    
    try {
      // Calculate next video using master epoch
      const exactTime = calculateExactPlaybackTime()
      
      if (ytPlayerRef.current) {
        console.log('➡️ Loading next video:', exactTime.videoId, 'at', exactTime.currentTime.toFixed(2))
        
        // Update state
        setCurrentTime(exactTime.currentTime)
        lastVideoIdRef.current = exactTime.videoId
        
        setCycleInfo({
          current: exactTime.programIndex + 1,
          total: SCHEDULE.length
        })
        
        // Load next video
        if (typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById({
            videoId: exactTime.videoId,
            startSeconds: Math.floor(exactTime.currentTime)
          })
        }
        
        // Fetch updated upcoming
        try {
          const res = await fetch('/api/upcoming-videos?count=10', {
            headers: { 'Cache-Control': 'no-cache' }
          })
          const result = await res.json()
          if (result.success) {
            setUpcomingVideos(result.data.upcoming)
          }
        } catch (err) {
          console.error('Error fetching upcoming:', err)
        }
        
        // Broadcast to other tabs
        try {
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({ 
              type: 'video-ended',
              videoId: exactTime.videoId,
              time: exactTime.currentTime,
              programIndex: exactTime.programIndex,
              timestamp: Date.now()
            })
          }
        } catch (err) {
          // Ignore
        }
      }
    } catch (err) {
      console.error('Error handling video end:', err)
    } finally {
      syncInProgressRef.current = false
      setTimeout(() => {
        cycleTransitionRef.current = false
      }, 500)
    }
  }, [calculateExactPlaybackTime])

  /**
   * Initialize YouTube player
   */
  const initializePlayer = useCallback((videoData: CurrentVideoData) => {
    console.log('🎬 Initializing YouTube player with master epoch sync...')
    
    if (!window.YT || !window.YT.Player) {
      console.error('❌ YouTube API not available')
      setSyncError('YouTube API not loaded')
      setTimeout(() => initializePlayer(videoData), 1000)
      return
    }

    if (!iframeContainerRef.current) {
      console.error('❌ iframe container not found')
      return
    }

    // Clear container
    iframeContainerRef.current.innerHTML = ''

    // Calculate exact start time using master epoch
    const exactTime = calculateExactPlaybackTime()
    const startTime = exactTime.currentTime

    console.log('Starting at exact time:', startTime.toFixed(3), 'seconds')
    console.log('Program:', exactTime.programIndex + 1, 'of', SCHEDULE.length)

    try {
      // Create player
      ytPlayerRef.current = new window.YT.Player(iframeContainerRef.current, {
        videoId: exactTime.videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          start: Math.floor(startTime),
          playsinline: 1,
          origin: window.location.origin,
          enablejsapi: 1
        },
        events: {
          onReady: (event: any) => {
            console.log('✅ Player ready')
            try {
              if (event.target && typeof event.target.setVolume === 'function') {
                event.target.setVolume(volumeRef.current)
              }
              if (!isMuted && event.target && typeof event.target.unMute === 'function') {
                event.target.unMute()
              }
              if (event.target && typeof event.target.playVideo === 'function') {
                event.target.playVideo()
              }
              
              // Verify position after ready
              setTimeout(() => {
                if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
                  const actualTime = ytPlayerRef.current.getCurrentTime()
                  const targetTime = calculateExactPlaybackTime().currentTime
                  const drift = Math.abs(actualTime - targetTime)
                  
                  if (drift > 0.2 && typeof ytPlayerRef.current.seekTo === 'function') {
                    console.log(`🎯 Initial sync correction: ${drift.toFixed(3)}s`)
                    ytPlayerRef.current.seekTo(targetTime, true)
                    setCurrentTime(targetTime)
                  }
                }
              }, 500)
            } catch (err) {
              console.error('Error in onReady:', err)
            }
            
            hasInitializedRef.current = true
            setPlayerReady(true)
            setIsLoading(false)
            
            try {
              const time = event.target.getCurrentTime?.() || 0
              setCurrentTime(time)
            } catch (err) {
              console.error('Error getting current time:', err)
            }
            lastVideoIdRef.current = exactTime.videoId
            
            setCycleInfo({
              current: exactTime.programIndex + 1,
              total: SCHEDULE.length
            })
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              console.log('📺 Video ended')
              handleVideoEnded()
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              try {
                const time = event.target.getCurrentTime?.() || 0
                setCurrentTime(time)
              } catch (err) {
                console.error('Error getting time:', err)
              }
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              // Auto-resume
              if (typeof event.target.playVideo === 'function') {
                event.target.playVideo()
              }
            }
          },
          onError: (event: any) => {
            console.error('❌ Player error:', event.data)
            setSyncError(`Error: ${event.data}`)
            setIsLoading(false)
            
            // Retry
            setTimeout(() => {
              if (currentDataRef.current) {
                initializePlayer(currentDataRef.current)
              }
            }, 3000)
          }
        }
      })
    } catch (err) {
      console.error('Error creating player:', err)
      setSyncError('Failed to create player')
      setIsLoading(false)
    }
  }, [isMuted, handleVideoEnded, calculateExactPlaybackTime])

  /**
   * Load YouTube API
   */
  useEffect(() => {
    if (window.YT?.Player) {
      console.log('✅ YouTube API already loaded')
      return
    }

    console.log('🔄 Loading YouTube API...')
    
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]')
    if (existing) existing.remove()

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    
    window.onYouTubeIframeAPIReady = () => {
      console.log('🎬 YouTube API ready')
    }

    document.head.appendChild(script)
  }, [])

  /**
   * Initial load
   */
  useEffect(() => {
    let mounted = true
    let initTimer: NodeJS.Timeout | null = null

    const init = async () => {
      // First, calculate using master epoch (no server needed)
      const exactTime = calculateExactPlaybackTime()
      
      // Then fetch from server for validation
      const data = await fetchCurrentVideo()
      
      if (!mounted) return

      // Update cycle info from master epoch calculation
      setCycleInfo({
        current: exactTime.programIndex + 1,
        total: SCHEDULE.length
      })
      
      setCurrentTime(exactTime.currentTime)

      // Fetch upcoming
      try {
        const res = await fetch('/api/upcoming-videos?count=10', {
          headers: { 'Cache-Control': 'no-cache' }
        })
        const result = await res.json()
        if (result.success && mounted) {
          setUpcomingVideos(result.data.upcoming)
        }
      } catch (err) {
        console.error('Error fetching upcoming:', err)
      }

      // Initialize player
      if (window.YT?.Player) {
        // Use data from server if available, otherwise use master epoch calculation
        if (data) {
          initializePlayer(data)
        } else {
          // Create temporary data object from master epoch
          const tempData: CurrentVideoData = {
            program: SCHEDULE[exactTime.programIndex],
            currentTime: exactTime.currentTime,
            timeRemaining: SCHEDULE[exactTime.programIndex].duration - exactTime.currentTime,
            nextProgram: SCHEDULE[(exactTime.programIndex + 1) % SCHEDULE.length],
            serverTime: Date.now(),
            programIndex: exactTime.programIndex,
            epochStart: MASTER_EPOCH_START
          }
          initializePlayer(tempData)
        }
      } else {
        // Wait for API
        const checkAPI = setInterval(() => {
          if (window.YT?.Player && mounted) {
            clearInterval(checkAPI)
            if (data) {
              initializePlayer(data)
            } else {
              const tempData: CurrentVideoData = {
                program: SCHEDULE[exactTime.programIndex],
                currentTime: exactTime.currentTime,
                timeRemaining: SCHEDULE[exactTime.programIndex].duration - exactTime.currentTime,
                nextProgram: SCHEDULE[(exactTime.programIndex + 1) % SCHEDULE.length],
                serverTime: Date.now(),
                programIndex: exactTime.programIndex,
                epochStart: MASTER_EPOCH_START
              }
              initializePlayer(tempData)
            }
          }
        }, 100)
        
        return () => clearInterval(checkAPI)
      }
    }

    init()

    return () => {
      mounted = false
      if (initTimer) clearTimeout(initTimer)
    }
  }, [fetchCurrentVideo, initializePlayer, calculateExactPlaybackTime])

  /**
   * PERFECT SYNC: Check every second using master epoch
   */
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (!hasInitializedRef.current || !ytPlayerRef.current || syncLockRef.current) return
      
      // Calculate exact time from master epoch
      const exactTime = calculateExactPlaybackTime()
      const currentVideoId = lastVideoIdRef.current

      // If video needs to change
      if (currentVideoId !== exactTime.videoId) {
        console.log('🔄 Master sync: switching to', exactTime.videoId)
        if (typeof ytPlayerRef.current.loadVideoById === 'function') {
          ytPlayerRef.current.loadVideoById({
            videoId: exactTime.videoId,
            startSeconds: Math.floor(exactTime.currentTime)
          })
        }
        lastVideoIdRef.current = exactTime.videoId
        setCurrentTime(exactTime.currentTime)
        setCycleInfo({
          current: exactTime.programIndex + 1,
          total: SCHEDULE.length
        })
        return
      }

      // Check drift
      if (typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const playerTime = ytPlayerRef.current.getCurrentTime() || 0
        const drift = Math.abs(playerTime - exactTime.currentTime)

        // Correct any drift > 0.2 seconds
        if (drift > 0.2 && typeof ytPlayerRef.current.seekTo === 'function') {
          console.log(`🎯 Master sync: drift ${drift.toFixed(3)}s`)
          ytPlayerRef.current.seekTo(exactTime.currentTime, true)
          setCurrentTime(exactTime.currentTime)
        }
      }
    }, 1000) // Check every second

    return () => clearInterval(syncInterval)
  }, [calculateExactPlaybackTime])

  /**
   * Time update interval
   */
  useEffect(() => {
    const timeInterval = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const time = ytPlayerRef.current.getCurrentTime()
          if (typeof time === 'number' && !isNaN(time)) {
            setCurrentTime(time)
          }
        } catch (err) {
          // Ignore
        }
      }
    }, 100)

    return () => clearInterval(timeInterval)
  }, [])

  /**
   * End detection
   */
  useEffect(() => {
    if (!currentData || !ytPlayerRef.current || !playerReady) return

    const endCheck = setInterval(() => {
      if (!currentData || !ytPlayerRef.current || syncInProgressRef.current) return

      const playerTime = currentTime
      const videoDuration = currentData.program.duration

      if (playerTime >= videoDuration - 0.1 && videoDuration > 0) {
        console.log('📺 End detected')
        handleVideoEnded()
      }
    }, 100)

    return () => clearInterval(endCheck)
  }, [currentData, currentTime, playerReady, handleVideoEnded])

  /**
   * Broadcast channel for cross-tab sync
   */
  useEffect(() => {
    let bc: BroadcastChannel | null = null
    
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('deeni-tv-master-sync')
        broadcastChannelRef.current = bc
        
        bc.onmessage = (event) => {
          const data = event.data
          if (!data || !hasInitializedRef.current) return
          
          if (data.type === 'perfect-sync' || data.type === 'force-sync') {
            // Another tab synced - verify our position
            if (Math.abs(Date.now() - data.timestamp) < 2000) {
              forcePerfectSync()
            }
          } else if (data.type === 'video-ended') {
            // Another tab detected end
            if (Math.abs(Date.now() - data.timestamp) < 2000) {
              const exactTime = calculateExactPlaybackTime()
              if (exactTime.videoId !== lastVideoIdRef.current) {
                handleVideoEnded()
              }
            }
          }
        }
        
        // Announce presence
        setTimeout(() => {
          if (bc) {
            try {
              bc.postMessage({ 
                type: 'perfect-sync', 
                timestamp: Date.now() 
              })
            } catch (err) {
              // Ignore
            }
          }
        }, 1000)
      }
    } catch (err) {
      console.error('BroadcastChannel error:', err)
    }

    return () => {
      if (bc) {
        try {
          bc.close()
        } catch (err) {
          // Ignore
        }
      }
      broadcastChannelRef.current = null
    }
  }, [forcePerfectSync, handleVideoEnded, calculateExactPlaybackTime])

  /**
   * Update refs
   */
  useEffect(() => {
    currentDataRef.current = currentData
  }, [currentData])

  useEffect(() => {
    volumeRef.current = volume
  }, [volume])

  // UI Handlers
  const handleActivity = useCallback(() => {
    if (!isFullscreen) return
    setShowControls(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setShowControls(false), 3000)
  }, [isFullscreen])

  const toggleMute = () => {
    if (ytPlayerRef.current) {
      if (isMuted) {
        if (typeof ytPlayerRef.current.unMute === 'function') ytPlayerRef.current.unMute()
        if (typeof ytPlayerRef.current.setVolume === 'function') ytPlayerRef.current.setVolume(volumeRef.current)
      } else {
        if (typeof ytPlayerRef.current.mute === 'function') ytPlayerRef.current.mute()
      }
    }
    setIsMuted(prev => !prev)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    setShowVolumeTooltip(true)
    
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(newVolume)
        if (newVolume > 0 && isMuted && typeof ytPlayerRef.current.unMute === 'function') {
          ytPlayerRef.current.unMute()
          setIsMuted(false)
        }
      } catch (err) {
        console.error('Error setting volume:', err)
      }
    }

    setTimeout(() => setShowVolumeTooltip(false), 1000)
  }

  const handleFullscreen = async () => {
    if (!playerRef.current) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        setForceRotate(false)
        try { (screen as any).orientation?.unlock?.() } catch (err) { /* ignore */ }
      } else {
        await playerRef.current.requestFullscreen()
        if (isMobile) {
          try {
            await (screen as any).orientation?.lock?.('landscape')
            setForceRotate(false)
          } catch (err) {
            // orientation lock unavailable — use CSS rotate fallback
            setForceRotate(true)
          }
        } else {
          setForceRotate(false)
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err)
      // ensure fallback so user still sees full video
      setForceRotate(true)
    }
  }

  const handleMenuOpen = useCallback(() => {
    if (document.fullscreenElement) {
      openMenuAfterExitRef.current = true
      document.exitFullscreen()
    } else {
      onMenuOpen()
    }
  }, [onMenuOpen])

  // Fullscreen change handler (attempt orientation lock; fallback to CSS rotate)
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreen(isFs)

      if (isFs) {
        setShowControls(true)
        if (isMobile) {
          try {
            await (screen as any).orientation?.lock?.('landscape')
            setForceRotate(false)
          } catch (err) {
            // lock not supported or denied -> rotate iframe via CSS
            setForceRotate(true)
          }
        } else {
          setForceRotate(false)
        }
      } else {
        // exit fullscreen
        try { (screen as any).orientation?.unlock?.() } catch (err) { /* ignore */ }
        setForceRotate(false)
        if (openMenuAfterExitRef.current) {
          openMenuAfterExitRef.current = false
          onMenuOpen()
        }
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [onMenuOpen, isMobile])

  // Apply CSS rotation to iframe container when orientation lock isn't available
  useEffect(() => {
    const el = iframeContainerRef.current
    const apply = () => {
      if (!el) return
      if (forceRotate && isFullscreen) {
        // set rotated size so video fills the screen (width/height swapped)
        el.style.position = 'absolute'
        el.style.left = '50%'
        el.style.top = '50%'
        el.style.transform = 'translate(-50%, -50%) rotate(90deg)'
        el.style.transformOrigin = 'center center'
        el.style.width = `${window.innerHeight}px`
        el.style.height = `${window.innerWidth}px`
      } else {
        // reset styles
        el.style.position = ''
        el.style.left = ''
        el.style.top = ''
        el.style.transform = ''
        el.style.transformOrigin = ''
        el.style.width = ''
        el.style.height = ''
      }
    }

    apply()
    const onResize = () => { if (forceRotate) apply() }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (el) {
        el.style.position = ''
        el.style.left = ''
        el.style.top = ''
        el.style.transform = ''
        el.style.transformOrigin = ''
        el.style.width = ''
        el.style.height = ''
      }
    }
  }, [forceRotate, isFullscreen])

  // Activity listeners
  useEffect(() => {
    if (isFullscreen) {
      const el = playerRef.current
      if (el) {
        el.addEventListener('mousemove', handleActivity)
        el.addEventListener('touchstart', handleActivity)
        return () => {
          el.removeEventListener('mousemove', handleActivity)
          el.removeEventListener('touchstart', handleActivity)
        }
      }
    }
  }, [handleActivity, isFullscreen])

  // Block keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const blocked = [' ', 'Spacebar', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'k', 'j', 'l']
      if (blocked.includes(e.key) || e.code === 'MediaPlayPause') {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [])

  // Format time
  const currentTimeFormatted = formatTime(currentTime)
  const durationFormatted = currentData ? formatTime(currentData.program.duration) : '0:00'

  // Check if we're at the last video in cycle
  const isLastInCycle = currentData ? (currentData.programIndex ?? 0) === SCHEDULE.length - 1 : false

  return (
    <div className="relative flex items-center justify-center bg-zinc-950 min-h-screen">
      {/* Video Container */}
      <div className="w-full md:w-[70vw] md:max-w-[1400px]">
        <div 
          ref={playerRef}
          className={`relative w-full ${isFullscreen ? 'h-screen max-w-none' : 'aspect-video rounded-t-lg'} bg-black overflow-hidden shadow-2xl`}
        >
          {/* YouTube iframe container */}
          <div
            ref={iframeContainerRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Transparent overlay to block iframe interactions so the app's controls are used */}
          <div className="absolute inset-0 w-full h-full pointer-events-auto" />
          
          {/* Loading overlay */}
          {isLoading && !playerReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-40">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-white text-lg">Loading broadcast...</p>
              </div>
            </div>
          )}

          {/* Mobile rotate fallback notice (shown when orientation lock isn't supported) */}
          {forceRotate && isMobile && isFullscreen && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="bg-black/60 text-white text-sm px-3 py-2 rounded-md">If your device didn't rotate automatically, the video has been rotated to fill the screen.</div>
            </div>
          )}

          {/* Perfect Sync Status */}
          {syncStatus === 'syncing' && playerReady && (
            <div className="absolute top-4 right-4 z-40">
              <div className="flex items-center gap-2 bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs border border-yellow-500/30">
                <div className="animate-spin h-3 w-3 border-2 border-yellow-300 border-t-transparent rounded-full"></div>
                <span>Perfect Sync</span>
              </div>
            </div>
          )}

          {syncStatus === 'error' && (
            <div className="absolute top-4 right-4 z-40">
              <div className="flex items-center gap-2 bg-red-500/20 text-red-300 px-3 py-1 rounded-full text-xs border border-red-500/30">
                <span>Sync Error</span>
              </div>
            </div>
          )}

          {syncStatus === 'synced' && playerReady && (
            <div className="absolute top-4 right-4 z-40">
              <div className="flex items-center gap-2 bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs border border-green-500/30">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span>Live</span>
              </div>
            </div>
          )}

          {/* Cycle Indicator */}
          {/* {playerReady && (
            <div className="absolute top-4 left-4 z-40">
              <div className="flex items-center gap-2 bg-zinc-900/80 text-white/80 px-3 py-1 rounded-full text-xs border border-white/10 backdrop-blur-sm">
                <Repeat className="h-3 w-3 text-primary" />
                <span>{cycleInfo.current} / {cycleInfo.total}</span>
                {isLastInCycle && (
                  <span className="text-primary ml-1">↻</span>
                )}
              </div>
            </div>
          )} */}

          {/* TV Ticker */}
          {showTicker && currentData && (
            <div className="absolute bottom-0 left-0 right-0 z-30">
              <div className={`relative overflow-hidden bg-gradient-to-r from-zinc-900/95 via-zinc-900/90 to-zinc-900/95 backdrop-blur-lg border-t border-white/10 ${
                isFullscreen ? (isMobile ? 'h-20' : 'h-16') : (isMobile ? 'h-16' : 'h-14')
              }`}>
                <div className="relative h-full flex items-center px-2 sm:px-4">
                  {/* Left: Current Program */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Live Dot */}
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-600/30 border border-red-500/50 rounded-full">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <span className="text-red-100 text-[10px] sm:text-xs font-bold uppercase">NOW</span>
                    </div>

                    {/* Title */}
                    {!isMobile && (
                      <div className="flex flex-col">
                        <p className="text-white font-bold text-xs sm:text-sm line-clamp-1">
                          {currentData.program.title}
                        </p>
                        <p className="text-white/60 text-[10px] sm:text-xs">
                          {currentData.program.category || 'Program'} • {cycleInfo.current}/{cycleInfo.total}
                        </p>
                      </div>
                    )}

                    {/* Time */}
                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded-full">
                      <Clock className="text-primary h-3 w-3" />
                      <span className="text-white font-semibold text-[10px] sm:text-xs">
                        {currentTimeFormatted} / {durationFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="h-6 sm:h-8 w-px bg-white/20 mx-2 flex-shrink-0" />

                  {/* Scrolling Upcoming */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <ScrollingUpcomingVideos 
                      videos={upcomingVideos} 
                      isMobile={isMobile} 
                      isFullscreen={isFullscreen}
                      currentIndex={cycleInfo.current - 1}
                    />
                  </div>

                  {/* Next Program */}
                  {currentData.nextProgram && !isMobile && (
                    <div className="flex items-center gap-2 px-3 flex-shrink-0">
                      <ArrowRight className="text-primary animate-pulse h-3 w-3" />
                      <div className="flex flex-col">
                        <p className="text-white/60 uppercase tracking-wider text-[10px] font-semibold">
                          Up Next
                        </p>
                        <p className="text-white font-semibold text-xs line-clamp-1">
                          {currentData.nextProgram.title}
                          {isLastInCycle && (
                            <span className="text-primary ml-1">↻</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Controls */}
          {isFullscreen && (
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`absolute ${showTicker ? 'bottom-16' : 'bottom-0'} left-0 right-0 z-50`}
                >
                  <div className="bg-zinc-900/90 backdrop-blur-md border-t border-zinc-700/50 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-4">
                      {/* Volume */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-xs">
                        <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10">
                          {isMuted ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </Button>
                        <div className="flex-1 relative">
                          {/* Volume percentage tooltip (shown above slider briefly) */}
                          {showVolumeTooltip && (
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-zinc-800/90 text-white text-xs px-2 py-1 rounded-md shadow-sm z-50">
                              {volume}%
                            </div>
                          )}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <Slider
                                aria-label="Volume"
                                value={[volume]}
                                onValueChange={handleVolumeChange}
                                max={100}
                                step={1}
                              />
                            </div>
                            <div className="ml-2 text-xs text-white/70 w-10 text-right">{volume}%</div>
                          </div>
                        </div>
                      </div>

                      {/* Center Info */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-full">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute bg-red-500 rounded-full"></span>
                            <span className="relative bg-red-500 rounded-full h-2 w-2"></span>
                          </span>
                          <span className="text-red-100 text-xs font-medium uppercase">LIVE</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Repeat className={`h-3 w-3 ${isLastInCycle ? 'text-primary' : 'text-white/40'}`} />
                          <span className="text-white/60 text-[10px]">{cycleInfo.current}/{cycleInfo.total}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setShowTicker(!showTicker)} className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10">
                          {showTicker ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onChannelSwitcherOpen} className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10">
                          <Tv className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleFullscreen} className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10">
                          <Minimize className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleMenuOpen} className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Exact program title + description shown directly beneath the iframe (windowed mode) */}
        {!isFullscreen && currentData && (
          <div className="bg-zinc-900/90 border-b border-zinc-700/50 rounded-b-lg px-4 py-3">
            <h3 className="text-white text-lg font-semibold line-clamp-2">{currentData.program.title}</h3>
            {currentData.program.description && (
              <p className="text-white/60 text-sm mt-1 line-clamp-2">{currentData.program.description}</p>
            )}
          </div>
        )}

        {/* Windowed Mode Controls */}
        {!isFullscreen && (
          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 rounded-b-lg px-2 sm:px-4 py-2">
            <div className="flex items-center justify-between gap-2">
              {/* Volume */}
              <div className="flex items-center gap-2 flex-1 max-w-[100px] sm:max-w-xs">
                <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/10 h-8 w-8">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <div className="hidden sm:block flex-1">
                  <Slider 
                    value={[volume]} 
                    onValueChange={handleVolumeChange} 
                    max={100} 
                    step={1} 
                    disabled={isMuted}
                  />
                </div>
              </div>

              {/* Live Badge */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-red-600/20 border border-red-500/30 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute bg-red-500 rounded-full"></span>
                    <span className="relative bg-red-500 rounded-full h-2 w-2"></span>
                  </span>
                  <span className="text-red-100 text-xs font-medium uppercase">LIVE</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full">
                  <Repeat className="h-3 w-3 text-primary" />
                  <span className="text-white/80 text-xs">{cycleInfo.current}/{cycleInfo.total}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setShowTicker(!showTicker)} className="text-white hover:bg-white/10 h-8 w-8">
                  {showTicker ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={onChannelSwitcherOpen} className="text-white hover:bg-white/10 h-8 w-8">
                  <Tv className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleFullscreen} className="text-white hover:bg-white/10 h-8 w-8">
                  <Maximize className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleMenuOpen} className="text-white hover:bg-white/10 h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Scrolling Upcoming Videos Component
 */
function ScrollingUpcomingVideos({ videos, isMobile, isFullscreen, currentIndex }: { videos: VideoProgram[], isMobile: boolean, isFullscreen: boolean, currentIndex: number }) {
  if (videos.length === 0) {
    return (
      <div className="relative flex overflow-hidden h-full items-center">
        <motion.div
          className="flex whitespace-nowrap"
          animate={{ x: [0, -500] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        >
          <span className={`text-primary font-semibold px-2 sm:px-3 ${isFullscreen ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs'}`}>
            More content coming...
          </span>
        </motion.div>
      </div>
    )
  }

  // Create scrolling items
  const items: string[] = []
  const repeatCount = isMobile ? 2 : 3
  
  for (let i = 0; i < repeatCount; i++) {
    videos.forEach((video, index) => {
      const isFirstInNextCycle = index === 0 && currentIndex === SCHEDULE.length - 1
      if (index === 0) {
        items.push(`NEXT: ${video.title} • ${formatTime(video.duration)} ${isFirstInNextCycle ? '↻' : ''}`)
      } else {
        items.push(`UP NEXT: ${video.title} • ${formatTime(video.duration)}`)
      }
    })
  }

  return (
    <div className="relative flex overflow-hidden h-full items-center">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: [0, -2000] }}
        transition={{ duration: isMobile ? 25 : 35, repeat: Infinity, ease: "linear" }}
      >
        {items.map((item, i) => (
          <span key={i} className={`text-primary font-semibold px-2 sm:px-3 ${isFullscreen ? 'text-xs sm:text-sm' : 'text-[10px] sm:text-xs'}`}>
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
