'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VideoProgram } from '@/types/schedule'
import { formatDuration } from '@/lib/schedule-utils'

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ScheduleModal({ isOpen, onClose }: ScheduleModalProps) {
  const [currentProgram, setCurrentProgram] = useState<VideoProgram | null>(null)
  const [upcomingPrograms, setUpcomingPrograms] = useState<VideoProgram[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchSchedule()
    }
  }, [isOpen])

  const fetchSchedule = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/upcoming-videos?count=10')
      const result = await response.json()
      
      if (result.success && result.data) {
        setCurrentProgram(result.data.current)
        setUpcomingPrograms(result.data.upcoming)
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl mx-4"
          >
            <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white">Program Schedule</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {/* Current Program */}
                  {currentProgram && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="backdrop-blur-lg bg-white/10 border-2 border-primary/50 rounded-2xl p-6"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Clock className="h-5 w-5 text-primary" />
                            <span className="text-white/70 font-medium">Now Playing</span>
                            <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full animate-pulse">
                              LIVE
                            </span>
                          </div>
                          <h3 className="text-xl font-semibold text-white mb-1">{currentProgram.title}</h3>
                          <p className="text-white/60 text-sm mb-2">{formatDuration(currentProgram.duration)}</p>
                          <p className="text-white/70 text-sm">{currentProgram.description}</p>
                          {currentProgram.category && (
                            <div className="flex gap-2 mt-3">
                              <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                                {currentProgram.category}
                              </span>
                              {currentProgram.language && (
                                <span className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full">
                                  {currentProgram.language}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Upcoming Programs */}
                  {upcomingPrograms.map((program, index) => (
                    <motion.div
                      key={program.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (index + 1) * 0.05 }}
                      className="backdrop-blur-lg bg-white/10 border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Clock className="h-5 w-5 text-white/50" />
                            <span className="text-white/70 font-medium">Up Next #{index + 1}</span>
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-1">{program.title}</h3>
                          <p className="text-white/60 text-sm mb-2">{formatDuration(program.duration)}</p>
                          <p className="text-white/70 text-sm">{program.description}</p>
                          {program.category && (
                            <div className="flex gap-2 mt-3">
                              <span className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full">
                                {program.category}
                              </span>
                              {program.language && (
                                <span className="px-2 py-1 bg-white/10 text-white/60 text-xs rounded-full">
                                  {program.language}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
