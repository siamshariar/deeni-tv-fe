'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Languages, Calendar, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MenuDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSelectOption: (option: 'language' | 'schedule' | 'about') => void
}

export function MenuDrawer({ isOpen, onClose, onSelectOption }: MenuDrawerProps) {
  const menuItems = [
    { id: 'language' as const, label: 'Language', icon: Languages },
    { id: 'schedule' as const, label: 'Program Schedule', icon: Calendar },
    { id: 'about' as const, label: 'About', icon: Info },
  ]

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

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-700/50 z-50 shadow-2xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-700/50">
                <h2 className="text-xl font-semibold text-white">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectOption(item.id)
                          onClose()
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/30 transition-colors text-left group"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-white font-medium">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
