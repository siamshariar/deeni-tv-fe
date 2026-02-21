import { VideoProgram, CurrentVideoData } from '@/types/schedule'

// Dr. Khandaker Abdullah Jahangir schedule (3 confirmed + 2 placeholders)
// Replace placeholder entries (id 4 & 5) with exact YouTube IDs/titles when you have
export const SCHEDULE: VideoProgram[] = [
  {
    id: '1',
    videoId: 'BPf0rhGKM-Q',
    title: 'হৃদয় স্পর্শ করার মত কিছু কথা',
    description: 'A heartfelt, full-length lecture',
    duration: 5820, // 97 minutes (approx)
    startTime: new Date(),
    endTime: new Date(),
    category: 'Lecture',
    language: 'Bengali'
  },
  {
    id: '2',
    videoId: 'fXSwr_njN5U',
    title: 'Ramadan Guide – রমজান পূর্ব প্রস্তুতি',
    description: 'Dr. Abdullah Jahangir explains important Ramadan details and preparation.',
    duration: 1494, 
    startTime: new Date(),
    endTime: new Date(),
    category: 'Lecture',
    language: 'Bengali'
  },
  {
    id: '3',
    videoId: 'MsyOd9nnXRM',
    title: 'Ramadan FAQs – রামাদান প্রশ্নোত্তর',
    description: 'Dr. Abdullah Jahangir answers common Ramadan fasting (সিয়াম) questions.',
    duration: 1023,
    startTime: new Date(),
    endTime: new Date(),
    category: 'Lecture',
    language: 'Bengali'
  },
  {
    id: '4',
    videoId: 'O03n_lX0lnU',
    title: 'Important Ramadan Answers – মাহে রমজান সম্পর্কিত প্রশ্নের উত্তর',
    description: '20 key Ramadan questions answered by Dr. Abdullah Jahangir.',
    duration: 900,
    startTime: new Date(),
    endTime: new Date(),
    category: 'Lecture',
    language: 'Bengali'
  },
  {
    id: '5',
    videoId: 'wX1AEPleTHw',
    title: 'Siyam Sunnah & Rules – রোজার নিয়ত ও সুন্নত',
    description: 'Complete guide to fasting intention and Sunnah by Dr. Abdullah Jahangir.',
    duration: 1200,
    startTime: new Date(),
    endTime: new Date(),
    category: 'Lecture',
    language: 'Bengali'
  }
]


// Master epoch start (used to calculate an absolute, repeatable cycle position)
export const MASTER_EPOCH_START = Date.UTC(2023, 0, 1) // 2023-01-01T00:00:00Z

export function getTotalScheduleDuration() {
  return SCHEDULE.reduce((sum, prog) => sum + prog.duration, 0)
}

/**
 * Calculate which video should be playing right now based on a looping schedule
 * This ensures all users see the same video at the same position
 */
export function getCurrentProgram(): CurrentVideoData {
  const now = Date.now()
  
  // Calculate total schedule duration
  const totalDuration = SCHEDULE.reduce((sum, prog) => sum + prog.duration, 0)
  
  // Find position in the looping schedule (in seconds)
  const secondsInDay = 86400
  const cyclePosition = Math.floor((now / 1000) % totalDuration)
  
  // Find which program is currently playing
  let accumulatedTime = 0
  let currentProgram = SCHEDULE[0]
  let currentTime = 0
  
  for (const program of SCHEDULE) {
    if (cyclePosition >= accumulatedTime && cyclePosition < accumulatedTime + program.duration) {
      currentProgram = program
      currentTime = cyclePosition - accumulatedTime
      break
    }
    accumulatedTime += program.duration
  }
  
  // Find next program
  const currentIndex = SCHEDULE.findIndex(p => p.id === currentProgram.id)
  const nextProgram = SCHEDULE[(currentIndex + 1) % SCHEDULE.length]
  
  const timeRemaining = currentProgram.duration - currentTime
  
  return {
    program: currentProgram,
    currentTime,
    timeRemaining,
    nextProgram,
    serverTime: now,
    programIndex: currentIndex
  }
}

/**
 * Get upcoming programs
 */
export function getUpcomingPrograms(count: number = 10) {
  const current = getCurrentProgram()
  const currentIndex = SCHEDULE.findIndex(p => p.id === current.program.id)
  
  const upcoming: VideoProgram[] = []
  const nextStartTimes: number[] = []
  const nextStartAbsolute: number[] = []
  const programIndices: number[] = []

  // start offset is remaining time in current program
  let offset = current.timeRemaining

  for (let i = 1; i <= count; i++) {
    const index = (currentIndex + i) % SCHEDULE.length
    const prog = SCHEDULE[index]
    upcoming.push(prog)
    programIndices.push(index)

    // relative seconds until this program begins
    nextStartTimes.push(offset)
    // absolute timestamp in ms when it will start
    nextStartAbsolute.push(Date.now() + offset * 1000)

    offset += prog.duration
  }

  return {
    upcoming,
    nextStartTimes,
    nextStartAbsolute,
    programIndices
  }
}
/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins} mins`
}
