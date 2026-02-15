'use client'

import { Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DonateButton() {
  return (
    <div className="fixed top-6 right-6 z-40">
      <Button
        size="lg"
        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg font-semibold px-6 animate-pulse-slow"
      >
        <Heart className="mr-2 h-5 w-5 fill-current" />
        Donate
      </Button>
    </div>
  )
}
