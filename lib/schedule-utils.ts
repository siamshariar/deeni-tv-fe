import { VideoProgram, CurrentVideoData } from '@/types/schedule'

// Sample schedule - In production, this would come from a database
// This creates a looping 24-hour schedule that cycles continuously
export const SCHEDULE: VideoProgram[] = [
  {
    id: '1',
    videoId: 'TosSYbyRKXs', // Islamic Content - The Power of Dua
    title: 'Islamic Reminder - The Power of Dua',
    description: 'A heartfelt reminder on the importance and power of making dua (supplication) to Allah.',
    duration: 180, // 3 minutes
    startTime: new Date(),
    endTime: new Date(),
    category: 'Prayer',
    language: 'English'
  },
  {
    id: '2',
    videoId: 'ye6tv8DhnSI', // Islamic Content - The Mercy of Allah
    title: 'The Mercy of Allah - Short Islamic Lecture',
    description: 'An inspiring lecture discussing the infinite mercy of Allah.',
    duration: 210, // 3:30 minutes
    startTime: new Date(),
    endTime: new Date(),
    category: 'Lecture',
    language: 'English'
  },
  {
    id: '3',
    videoId: 'k2ExG9Nc_aA', // Islamic Content - Patience in Islam
    title: 'Patience in Islam - Sabr',
    description: 'A motivational talk on the virtue of patience (sabr) in Islam.',
    duration: 195, // 3:15 minutes
    startTime: new Date(),
    endTime: new Date(),
    category: 'Education',
    language: 'English'
  },
  {
    id: '4',
    videoId: '7nJhwFCKMVk', // Islamic Content - The Importance of Salah
    title: 'The Importance of Salah',
    description: 'Explaining why prayer (Salah) is the pillar of Islam.',
    duration: 225, // 3:45 minutes
    startTime: new Date(),
    endTime: new Date(),
    category: 'Lecture',
    language: 'English'
  },
  {
    id: '5',
    videoId: '9ziaWq9Pv7k', // Islamic Content - Forgiveness in Islam
    title: 'Forgiveness in Islam - Tawbah',
    description: 'A short video on the concept of repentance (Tawbah).',
    duration: 200, // 3:20 minutes
    startTime: new Date(),
    endTime: new Date(),
    category: 'Devotional',
    language: 'English'
  },
]

// MASTER EPOCH START - THIS IS THE KEY TO PERFECT SYNCHRONIZATION
// All users calculate their position from this fixed point in time
// Set this to when your channel launched (Unix timestamp in milliseconds)
// IMPORTANT: This MUST be the same for ALL users across ALL browsers
export const MASTER_EPOCH_START = 1704067200000 // January 1, 2024 00:00:00 UTC

// Cache for total duration to avoid recalculating
let TOTAL_DURATION_CACHE: number | null = null

/**
 * Get total duration of the entire schedule
 */
export function getTotalScheduleDuration(): number {
  if (TOTAL_DURATION_CACHE === null) {
    TOTAL_DURATION_CACHE = SCHEDULE.reduce((sum, prog) => sum + prog.duration, 0)
  }
  return TOTAL_DURATION_CACHE
}

/**
 * Calculate which video should be playing right now based on a looping schedule
 * This ENSURES ALL users see the EXACT same video at the EXACT same position
 * regardless of when they joined or what browser they're using
 * 
 * The magic happens here - all users use the SAME master epoch start time
 * and the SAME current time (Date.now()) to calculate their position
 */
export function getCurrentProgram(): CurrentVideoData {
  const now = Date.now()
  
  // Calculate total schedule duration
  const totalDuration = getTotalScheduleDuration()
  
  // Calculate elapsed time since master epoch
  // THIS IS THE CRITICAL PART - all users use the same starting point
  const elapsedSinceEpoch = Math.floor((now - MASTER_EPOCH_START) / 1000)
  
  // Get position in the current cycle (0 to totalDuration-1)
  // This automatically wraps around when reaching the end
  const cyclePosition = elapsedSinceEpoch % totalDuration
  
  // Find which program is currently playing
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
  
  // Find next program (wraps around to first when at the end)
  const nextProgramIndex = (programIndex + 1) % SCHEDULE.length
  const nextProgram = SCHEDULE[nextProgramIndex]
  
  const timeRemaining = currentProgram.duration - currentTime
  
  // Calculate when the next video will start (for precise scheduling)
  const nextVideoStartTime = now + (timeRemaining * 1000)
  
  return {
    program: currentProgram,
    currentTime,
    timeRemaining,
    nextProgram,
    serverTime: now,
    epochStart: MASTER_EPOCH_START,
    cyclePosition,
    totalDuration,
    programIndex,
    nextVideoStartTime,
    isLastInCycle: programIndex === SCHEDULE.length - 1,
    isFirstInCycle: programIndex === 0
  }
}

/**
 * Get upcoming programs with accurate timing
 * This handles the loop from last back to first seamlessly
 */
export function getUpcomingPrograms(count: number = 10): { 
  upcoming: VideoProgram[], 
  nextStartTimes: number[],
  nextStartAbsolute: number[],
  programIndices: number[]
} {
  const current = getCurrentProgram()
  const currentIndex = current.programIndex
  
  const upcoming: VideoProgram[] = []
  const nextStartTimes: number[] = []
  const nextStartAbsolute: number[] = []
  const programIndices: number[] = []
  
  let accumulatedTime = current.timeRemaining
  
  for (let i = 1; i <= count; i++) {
    // Calculate index with wrap-around
    const index = (currentIndex + i) % SCHEDULE.length
    programIndices.push(index)
    upcoming.push(SCHEDULE[index])
    nextStartTimes.push(accumulatedTime)
    
    // Calculate absolute timestamp when this video will start
    const startAbsolute = Date.now() + (accumulatedTime * 1000)
    nextStartAbsolute.push(startAbsolute)
    
    accumulatedTime += SCHEDULE[index].duration
  }
  
  return { upcoming, nextStartTimes, nextStartAbsolute, programIndices }
}

/**
 * Calculate expected playback time for ANY user at ANY time
 * This uses the master epoch to ensure ALL users get the SAME result
 */
export function calculateExactPlaybackTime(): { 
  videoId: string, 
  currentTime: number,
  programIndex: number,
  timeRemaining: number,
  nextProgram: VideoProgram | null
} {
  const now = Date.now()
  const totalDuration = getTotalScheduleDuration()
  
  // Calculate position from master epoch
  const elapsedSinceEpoch = Math.floor((now - MASTER_EPOCH_START) / 1000)
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
  
  // Find next program
  const nextProgramIndex = (programIndex + 1) % SCHEDULE.length
  const nextProgram = SCHEDULE[nextProgramIndex]
  const timeRemaining = currentProgram.duration - currentTime
  
  return {
    videoId: currentProgram.videoId,
    currentTime,
    programIndex,
    timeRemaining,
    nextProgram
  }
}

/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0 min'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins} mins`
}