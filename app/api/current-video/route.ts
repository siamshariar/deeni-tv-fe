import { NextResponse } from 'next/server'
import { getCurrentProgram, SCHEDULE } from '@/lib/schedule-utils'

/**
 * API Endpoint: Get current video with timestamp
 * 
 * This endpoint returns the EXACT same video and position for ALL users
 * because it uses the MASTER_EPOCH_START to calculate the position
 * 
 * All users calling this API at the same time will get the SAME result
 */
export async function GET() {
  try {
    const data = getCurrentProgram()
    
    // Add cache control headers to prevent any caching
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...data,
        // Ensure all fields are present for perfect sync
        nextProgram: data.nextProgram,
        isLastInCycle: data.programIndex === SCHEDULE.length - 1,
        isFirstInCycle: data.programIndex === 0,
        totalPrograms: SCHEDULE.length,
        masterEpoch: data.epochStart // Send master epoch to client for local calculations
      },
      serverTimestamp: Date.now()
    }, { headers })
  } catch (error) {
    console.error('Error fetching current video:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch current video' 
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}

// Force dynamic to prevent any caching
export const dynamic = 'force-dynamic'
export const revalidate = 0