'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
}

const schedule = [
  {
    time: 'Now',
    title: 'Morning Prayer & Reflection',
    duration: '30 mins',
    progress: 60,
    isLive: true,
  },
  {
    time: '10:00 AM',
    title: 'Quran Recitation',
    duration: '45 mins',
    progress: 0,
    isLive: false,
  },
  {
    time: '11:00 AM',
    title: 'Islamic History Series',
    duration: '60 mins',
    progress: 0,
    isLive: false,
  },
  {
    time: '1:00 PM',
    title: 'Daily Wisdom',
    duration: '30 mins',
    progress: 0,
    isLive: false,
  },
]

export function ScheduleModal({ isOpen, onClose }: ScheduleModalProps) {
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
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {schedule.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="backdrop-blur-lg bg-white/10 border border-white/10 rounded-2xl p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <Clock className="h-5 w-5 text-primary" />
                          <span className="text-white/70 font-medium">{item.time}</span>
                          {item.isLive && (
                            <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-1">{item.title}</h3>
                        <p className="text-white/60 text-sm">{item.duration}</p>
                      </div>
                    </div>
                    
                    {item.isLive && (
                      <div className="mt-4">
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progress}%` }}
                            transition={{ duration: 1 }}
                            className="h-full bg-primary"
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
