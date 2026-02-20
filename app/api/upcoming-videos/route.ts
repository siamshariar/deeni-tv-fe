import { NextResponse } from 'next/server'
import { getCurrentProgram, getUpcomingPrograms, SCHEDULE } from '@/lib/schedule-utils'

/**
 * API Endpoint: Get upcoming videos schedule
 * 
 * Returns the current program and a list of upcoming programs
 * All users get the SAME upcoming list at the SAME time
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '10')
    
    const current = getCurrentProgram()
    const { upcoming, nextStartTimes, nextStartAbsolute, programIndices } = getUpcomingPrograms(count)
    
    // Add cache control headers to prevent caching
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    }
    
    // Mark which videos are the first in the next cycle
    const upcomingWithMeta = upcoming.map((program, index) => ({
      ...program,
      isFirstInNextCycle: programIndices[index] === 0 && current.programIndex === SCHEDULE.length - 1,
      isWrapAround: programIndices[index] < current.programIndex
    }))
    
    return NextResponse.json({
      success: true,
      data: {
        current: current.program,
        currentIndex: current.programIndex,
        upcoming: upcomingWithMeta,
        nextStartTimes,
        nextStartAbsolute,
        programIndices,
        currentTime: current.currentTime,
        timeRemaining: current.timeRemaining,
        serverTime: Date.now(),
        epochStart: current.epochStart,
        totalPrograms: SCHEDULE.length,
        isLastInCycle: current.programIndex === SCHEDULE.length - 1,
        willWrapToFirst: current.programIndex === SCHEDULE.length - 1
      }
    }, { headers })
  } catch (error) {
    console.error('Error fetching upcoming videos:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch upcoming videos' 
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

// Enable dynamic behavior
export const dynamic = 'force-dynamic'
export const revalidate = 0