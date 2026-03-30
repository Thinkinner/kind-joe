'use client';

import React, { useState } from 'react';
import Hero from '@/components/newsletter/hero';
import NewsletterCard from '@/components/newsletter/newsletter-card';
import type { Newsletter } from '@/components/newsletter/types';

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';


import VenturaModal from '@/components/newsletter/modals/ventura-modal'; // <- adjust path
import KindJoeModal from '@/components/newsletter/modals/kindjoe-modal'; // <- adjust path

const NEWSLETTERS: Newsletter[] = [
  {
    id: '1',
    title: 'Kind Joe Top Stories',
    description:
      'Curated positive news, heartwarming stories, and the best of humanity delivered straight to your inbox.',
    frequency: 'Daily',
    imageUrl:
      'https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/69274cc45f7cbcff2fc7cfdb.png',
    topic: 'kindjoe',
  },
  {
    id: '2',
    title: 'Joe Knows Ventura',
    description:
      'Stay informed with local updates, events, and community highlights from across Ventura County.',
    frequency: 'Daily',
    imageUrl:
      'https://storage.googleapis.com/msgsndr/VPl4AjuzzxeZqlljHIdI/media/69274d386203af50dd38f88d.png',
    topic: 'ventura',
  },
];

const Page: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);

  const handleSubscribeClick = (id: string) => {
    setSelectedNewsletterId(id);
    setDialogOpen(true);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // clear selection when dialog closes
      setSelectedNewsletterId(null);
    }
  };

  const selectedNewsletter = NEWSLETTERS.find(
    (newsletter) => newsletter.id === selectedNewsletterId
  );

  return (
    <>
      <Hero />

      <section className="py-16 sm:py-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Our Newsletters
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Browse our collection of curated content designed to brighten your day and keep you informed.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:gap-12 max-w-4xl mx-auto">
            {NEWSLETTERS.map((newsletter) => (
              <NewsletterCard
                key={newsletter.id}
                newsletter={newsletter}
                onSubscribe={handleSubscribeClick}
              />
            ))}
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-lg">
          {!selectedNewsletter ? null : selectedNewsletter.id === '2' ? (
            // Joe Knows Ventura -> full Ventura flow
            <VenturaModal />
          ) : (
            <KindJoeModal />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Page;
