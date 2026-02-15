'use client'

import { useState } from 'react'
import { VideoPlayer } from '@/components/video-player'
import { MenuDrawer } from '@/components/menu-drawer'
import { DonateButton } from '@/components/donate-button'
import { LanguageModal } from '@/components/language-modal'
import { ScheduleModal } from '@/components/schedule-modal'
import { AboutModal } from '@/components/about-modal'
import { ChannelSwitcher, type Channel } from '@/components/channel-switcher'

// Placeholder channels data
const CHANNELS: Channel[] = [
  {
    id: '1',
    name: 'Deeni TV Main',
    videoId: '2VyyN6HHv_U',
    thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&h=200&fit=crop',
    isLive: true,
  },
  {
    id: '2',
    name: 'Islamic Lectures',
    videoId: 'jfKfPfyJRdk',
    thumbnail: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=200&h=200&fit=crop',
    isLive: true,
  },
  {
    id: '3',
    name: 'Quran Recitation',
    videoId: 'j4RUhuXHhFM',
    thumbnail: 'https://images.unsplash.com/photo-1590650153855-d9e808231d41?w=200&h=200&fit=crop',
    isLive: true,
  },
  {
    id: '4',
    name: 'Spiritual Guidance',
    videoId: 'C0DPdy98e4c',
    thumbnail: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=200&h=200&fit=crop',
    isLive: false,
  },
]

export default function Home() {
  const [activeChannelId, setActiveChannelId] = useState('1')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isChannelSwitcherOpen, setIsChannelSwitcherOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<'language' | 'schedule' | 'about' | null>(null)

  const activeChannel = CHANNELS.find(ch => ch.id === activeChannelId) || CHANNELS[0]

  const handleSelectChannel = (channel: Channel) => {
    setActiveChannelId(channel.id)
  }

  return (
    <main className="relative min-h-screen bg-zinc-950">
      <DonateButton />
      <VideoPlayer 
        videoId={activeChannel.videoId}
        onMenuOpen={() => setIsMenuOpen(true)}
        onChannelSwitcherOpen={() => setIsChannelSwitcherOpen(true)}
      />
      <MenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSelectOption={(option) => setActiveModal(option)}
      />
      
      {/* Channel Switcher */}
      <ChannelSwitcher
        isOpen={isChannelSwitcherOpen}
        onClose={() => setIsChannelSwitcherOpen(false)}
        channels={CHANNELS}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectChannel}
      />
      
      {/* Modals */}
      <LanguageModal
        isOpen={activeModal === 'language'}
        onClose={() => setActiveModal(null)}
      />
      <ScheduleModal
        isOpen={activeModal === 'schedule'}
        onClose={() => setActiveModal(null)}
      />
      <AboutModal
        isOpen={activeModal === 'about'}
        onClose={() => setActiveModal(null)}
      />
    </main>
  )
}
