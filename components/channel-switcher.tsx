'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export interface Channel {
  id: string
  name: string
  videoId: string
  thumbnail: string
  isLive: boolean
}

interface ChannelSwitcherProps {
  isOpen: boolean
  onClose: () => void
  channels: Channel[]
  activeChannelId: string
  onSelectChannel: (channel: Channel) => void
}

export function ChannelSwitcher({
  isOpen,
  onClose,
  channels,
  activeChannelId,
  onSelectChannel,
}: ChannelSwitcherProps) {
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

          {/* Mobile: Slide-up Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-700/50 rounded-t-3xl overflow-hidden max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-700/50">
              <h2 className="text-xl font-semibold text-white">Live Channels</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Channel List */}
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="space-y-3">
                {channels.map((channel) => {
                  const isActive = channel.id === activeChannelId
                  return (
                    <motion.button
                      key={channel.id}
                      onClick={() => {
                        onSelectChannel(channel)
                        onClose()
                      }}
                      className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-primary/20 border-2 border-primary shadow-lg shadow-primary/20'
                          : 'bg-zinc-800/50 border-2 border-transparent hover:bg-zinc-800'
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-zinc-700">
                        <Image
                          src={channel.thumbnail || "/placeholder.svg"}
                          alt={channel.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Channel Info */}
                      <div className="flex-1 text-left">
                        <h3 className="text-white font-medium text-base">{channel.name}</h3>
                        {channel.isLive && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-red-400 text-sm font-medium uppercase tracking-wider">
                              Live Now
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Active Indicator */}
                      {isActive && (
                        <div className="shrink-0 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>

          {/* Desktop: Popover Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="hidden md:block fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[500px] bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-700/50">
              <h2 className="text-lg font-semibold text-white">Live Channels</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Channel List */}
            <div className="p-4 max-h-[400px] overflow-y-auto">
              <div className="space-y-2">
                {channels.map((channel) => {
                  const isActive = channel.id === activeChannelId
                  return (
                    <motion.button
                      key={channel.id}
                      onClick={() => {
                        onSelectChannel(channel)
                        onClose()
                      }}
                      className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-primary/20 border-2 border-primary shadow-lg shadow-primary/20'
                          : 'bg-zinc-800/50 border-2 border-transparent hover:bg-zinc-800'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-zinc-700">
                        <Image
                          src={channel.thumbnail || "/placeholder.svg"}
                          alt={channel.name}
                          fill
                          className="object-cover"
                        />
                      </div>

                      {/* Channel Info */}
                      <div className="flex-1 text-left">
                        <h3 className="text-white font-medium text-base">{channel.name}</h3>
                        {channel.isLive && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span className="text-red-400 text-xs font-medium uppercase tracking-wider">
                              Live Now
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Active Indicator */}
                      {isActive && (
                        <div className="shrink-0 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
