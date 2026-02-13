'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

// ============================================
// FEATURED LOCATIONS - Sacred Sites & Live Streams  
// ============================================
export const FEATURED_LOCATIONS = [
    {
        id: 'mecca',
        name: 'Mecca',
        subtitle: 'Masjid al-Haram',
        image: '/featured/mecca.png',
        isLive: false,
        category: 'Sacred Sites',
    },
    {
        id: 'medina',
        name: 'Medina',
        subtitle: "Prophet's Mosque ﷺ",
        image: '/featured/medina.png',
        isLive: false,
        category: 'Sacred Sites',
    },
    {
        id: 'jerusalem',
        name: 'Jerusalem',
        subtitle: 'Al-Aqsa Compound',
        image: '/featured/jerusalem.png',
        isLive: false,
        category: 'Sacred Sites',
    },
    {
        id: 'abu-dhabi',
        name: 'Abu Dhabi',
        subtitle: 'Sheikh Zayed Mosque',
        image: '/featured/abu-dhabi.jpg',
        isLive: false,
        category: 'Cultural Heritage',
    },
    {
        id: 'istanbul',
        name: 'Istanbul',
        subtitle: 'Blue Mosque',
        image: '/featured/istanbul.png',
        isLive: false,
        category: 'Cultural Heritage',
    },
];

// ============================================
// FEATURED LOCATION CARD
// ============================================
export function FeaturedLocationCard({ location, index }: { location: typeof FEATURED_LOCATIONS[0]; index: number }) {
    return (
        <motion.div
            className="relative group cursor-pointer w-full"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4, scale: 1.02 }}
        >
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 group-hover:border-[#7C8FFF]/40 transition-colors">
                {/* Image */}
                <Image
                    src={location.image}
                    alt={location.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                {/* Live indicator */}
                {location.isLive && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/90 backdrop-blur-sm">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-white text-xs font-semibold">LIVE</span>
                    </div>
                )}

                {/* Category badge */}
                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
                    <span className="text-white/90 text-xs font-medium">{location.category}</span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="text-[#7C8FFF] text-xs font-medium mb-1">{location.category}</div>
                    <h3 className="text-xl font-bold text-white mb-1">{location.name}</h3>
                    <p className="text-white/60 text-sm">{location.subtitle}</p>
                </div>

                {/* Watch button on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-6 py-3 rounded-xl bg-[#7C8FFF] text-white font-semibold text-sm shadow-lg shadow-[#7C8FFF]/30">
                        Watch Now
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
