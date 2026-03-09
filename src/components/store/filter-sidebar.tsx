'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Checkbox } from '@/components/ui/checkbox'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { SlidersHorizontal } from 'lucide-react'

const filterGroups = [
  {
    id: 'type',
    label: 'Type',
    options: ['Singles', 'Graded Slabs', 'Sealed'],
  },
  {
    id: 'condition',
    label: 'Condition',
    options: ['Mint', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played'],
  },
  {
    id: 'grade',
    label: 'Grade Company',
    options: ['PSA', 'BGS', 'CGC'],
  },
  {
    id: 'rarity',
    label: 'Rarity',
    options: ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare'],
  },
  {
    id: 'language',
    label: 'Language',
    options: ['English', 'Japanese'],
  },
  {
    id: 'edition',
    label: 'Edition',
    options: ['1st Edition', 'Unlimited', 'Shadowless'],
  },
]

function FilterContent() {
  return (
    <div className="space-y-2">
      {/* Price range */}
      <div className="px-1 py-3">
        <p className="mb-3 text-sm font-medium">Price Range</p>
        <Slider defaultValue={[0, 500]} max={5000} step={1} className="mb-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>$0</span>
          <span>$5,000+</span>
        </div>
      </div>

      {/* Filter groups */}
      <Accordion type="multiple" defaultValue={['type', 'condition']}>
        {filterGroups.map((group) => (
          <AccordionItem key={group.id} value={group.id}>
            <AccordionTrigger className="text-sm">{group.label}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {group.options.map((option) => (
                  <label key={option} className="flex items-center gap-2 text-sm">
                    <Checkbox />
                    <span className="text-muted-foreground">{option}</span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

export function FilterSidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <h2 className="mb-4 text-lg font-semibold">Filters</h2>
        <FilterContent />
      </aside>

      {/* Mobile trigger */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetTitle>Filters</SheetTitle>
            <div className="mt-4">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
