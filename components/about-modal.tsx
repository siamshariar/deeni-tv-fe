'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl mx-4"
          >
            <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">Deeni.tv</h2>
                  <p className="text-primary text-lg font-medium">Your Spiritual Journey</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-full"
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
              
              <div className="space-y-6 text-white/90 leading-relaxed">
                <p className="text-lg">
                  Experience premium Islamic content in a revolutionary lean-back TV interface designed for modern audiences.
                </p>
                
                <p>
                  Deeni.tv brings you high-quality spiritual programming including Quran recitations, 
                  Islamic lectures, historical documentaries, and daily reflections—all in a cinematic viewing experience.
                </p>
                
                <div className="pt-4 border-t border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-3">Our Mission</h3>
                  <p>
                    To make authentic Islamic knowledge accessible to everyone, 
                    anywhere, in a format that fits seamlessly into modern life.
                  </p>
                </div>
                
                <div className="pt-4">
                  <h3 className="text-xl font-semibold text-white mb-3">Features</h3>
                  <ul className="space-y-2 text-white/80">
                    <li>• 24/7 live streaming spiritual content</li>
                    <li>• Multi-language support</li>
                    <li>• Scheduled programming</li>
                    <li>• Premium production quality</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
