'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const winners = [
  { id: 1, name: 'Alex M.', won: 'Ohtani RC Refractor', prize: '$450' },
  { id: 2, name: 'Jordan H.', won: 'Wembanyama Silver Prizm', prize: '$350' },
  { id: 3, name: 'Chris B.', won: 'Herbert Base RC', prize: '$120' },
  { id: 4, name: 'Mike T.', won: '5x Mystery Card Bundle', prize: '$200' },
  { id: 5, name: 'Sarah L.', won: 'Sealed 2024 Topps Box', prize: '$180' },
  { id: 6, name: 'David K.', won: 'PSA Gem Mint Card', prize: '$400' },
  { id: 7, name: 'Lisa R.', won: 'Graded Slab Bundle', prize: '$280' },
  { id: 8, name: 'James P.', won: '10x Premium Singles', prize: '$320' },
]

export default function SpinPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-center gap-8 px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="space-y-4 text-center">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
              🎰 DAILY $5 SPIN
            </span>
            <h1 className="text-5xl font-black tracking-tighter sm:text-6xl lg:text-7xl">
              Win Cards Worth
              <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Up to $500
              </span>
            </h1>
          </div>
          <p className="max-w-xl text-lg text-foreground/70">
            Spin the wheel every day for just $5. Win premium cards, sealed product, or cash prizes. Play daily for better odds.
          </p>

          {/* CTA Button */}
          <Link href="#spin-section">
            <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
              SPIN NOW — $5
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          {/* How It Works */}
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                num: '1',
                title: 'Pay $5',
                desc: 'Quick & secure checkout via Stripe',
              },
              {
                num: '2',
                title: 'Spin Wheel',
                desc: 'Watch the wheel land on your prize',
              },
              {
                num: '3',
                title: 'Win & Receive',
                desc: 'Prize ships immediately or added to account',
              },
            ].map((step) => (
              <Card key={step.num} className="border-primary/20 bg-card/50">
                <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-xl font-black text-primary">
                    {step.num}
                  </div>
                  <h3 className="font-bold text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Big Winners - Scrolling Bottom */}
      <section
        id="spin-section"
        className="border-t border-border bg-accent/30 py-8 sm:py-12"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-center text-2xl font-black tracking-tight">
            Recent Big Winners
          </h2>

          {/* Scrolling ticker */}
          <div className="overflow-hidden">
            <div className="flex gap-4 animate-scroll">
              {/* First set */}
              {winners.map((winner) => (
                <Card
                  key={`${winner.id}-1`}
                  className="flex-shrink-0 w-80 border-primary/20"
                >
                  <CardContent className="flex flex-col gap-3 p-6">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{winner.name}</span>
                      <span className="text-sm font-bold text-secondary">
                        {winner.prize}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/70">{winner.won}</p>
                    <div className="mt-2 h-1 w-full bg-gradient-to-r from-primary to-secondary rounded-full" />
                  </CardContent>
                </Card>
              ))}
              {/* Duplicate set for seamless loop */}
              {winners.map((winner) => (
                <Card
                  key={`${winner.id}-2`}
                  className="flex-shrink-0 w-80 border-primary/20"
                >
                  <CardContent className="flex flex-col gap-3 p-6">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{winner.name}</span>
                      <span className="text-sm font-bold text-secondary">
                        {winner.prize}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/70">{winner.won}</p>
                    <div className="mt-2 h-1 w-full bg-gradient-to-r from-primary to-secondary rounded-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <style>{`
            @keyframes scroll {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(calc(-50% - 1rem));
              }
            }
            .animate-scroll {
              animation: scroll 30s linear infinite;
            }
            .animate-scroll:hover {
              animation-play-state: paused;
            }
          `}</style>
        </div>
      </section>
    </div>
  )
}
