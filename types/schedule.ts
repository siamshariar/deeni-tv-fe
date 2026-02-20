// Types for TV broadcasting schedule system

export interface VideoProgram {
  id: string
  videoId: string // YouTube video ID
  title: string
  description: string
  duration: number // in seconds
  startTime: Date
  endTime: Date
  thumbnail?: string
  category?: string
  language?: string
}

export interface CurrentVideoData {
  program: VideoProgram
  currentTime: number // Current playback time in seconds
  timeRemaining: number // Time remaining in seconds
  nextProgram: VideoProgram | null
  serverTime: number // Unix timestamp for sync
  epochStart?: number // Master epoch start for absolute sync
  cyclePosition?: number // Position in current cycle
  totalDuration?: number // Total cycle duration
  programIndex: number // Index of current program in schedule (0-based)
  nextVideoStartTime?: number // Timestamp when next video starts
  isLastInCycle?: boolean // Whether this is the last program in cycle
  isFirstInCycle?: boolean // Whether this is the first program in cycle
}

export interface UpcomingVideosData {
  current: VideoProgram
  upcoming: VideoProgram[]
  nextStartTimes: number[]
  nextStartAbsolute: number[]
  programIndices: number[]
  serverTime: number
  epochStart: number
  currentIndex: number
  totalPrograms: number
  isLastInCycle: boolean
  willWrapToFirst: boolean
}

export interface ScheduleEntry {
  time: string
  title: string
  duration: string
  videoId: string
  isLive: boolean
  progress: number
}