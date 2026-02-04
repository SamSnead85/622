'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SearchIcon, CloseIcon } from '@/components/icons';

// ============================================
// TYPES
// ============================================

export interface Location {
    lat: number;
    lng: number;
    name?: string;
    address?: string;
    city?: string;
    country?: string;
}

export interface NearbyPlace {
    id: string;
    name: string;
    type: 'business' | 'group' | 'event' | 'user';
    location: Location;
    distance: number; // in meters
    imageUrl?: string;
    rating?: number;
    isOpen?: boolean;
}

// ============================================
// LOCATION PICKER
// ============================================

interface LocationPickerProps {
    value: Location | null;
    onChange: (location: Location | null) => void;
    placeholder?: string;
}

export function LocationPicker({ value, onChange, placeholder = 'Add location...' }: LocationPickerProps) {
    const [search, setSearch] = useState('');
    const [suggestions, setSuggestions] = useState<Location[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Simulated search - in production would call geocoding API
    useEffect(() => {
        if (!search.trim()) { setSuggestions([]); return; }
        setIsSearching(true);
        const timer = setTimeout(() => {
            setSuggestions([
                { lat: 40.7128, lng: -74.006, name: search, address: '123 Main St', city: 'New York', country: 'USA' },
                { lat: 34.0522, lng: -118.2437, name: `${search} Area`, address: '456 Oak Ave', city: 'Los Angeles', country: 'USA' },
            ]);
            setIsSearching(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const handleSelect = (loc: Location) => {
        onChange(loc);
        setSearch('');
        setShowDropdown(false);
    };

    const handleCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'Current Location' }),
                () => { }
            );
        }
    };

    return (
        <div className="relative">
            {value ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-lg">📍</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{value.name || value.address}</p>
                        {value.city && <p className="text-xs text-white/40">{value.city}, {value.country}</p>}
                    </div>
                    <button onClick={() => onChange(null)} className="p-1 text-white/40 hover:text-white"><CloseIcon size={16} /></button>
                </div>
            ) : (
                <>
                    <div className="relative">
                        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                            onFocus={() => setShowDropdown(true)} placeholder={placeholder}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40" />
                    </div>
                    {showDropdown && (
                        <div className="absolute top-full mt-2 left-0 right-0 bg-[#1A1A1F] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                            <button onClick={handleCurrentLocation}
                                className="w-full flex items-center gap-3 p-3 hover:bg-white/10 text-left border-b border-white/5">
                                <span className="text-lg">📍</span>
                                <span className="text-cyan-400">Use current location</span>
                            </button>
                            {isSearching ? (
                                <div className="p-4 text-center text-white/40">Searching...</div>
                            ) : suggestions.length > 0 ? (
                                suggestions.map((loc, i) => (
                                    <button key={i} onClick={() => handleSelect(loc)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-white/10 text-left">
                                        <span className="text-lg">🏠</span>
                                        <div>
                                            <p className="text-white">{loc.name}</p>
                                            <p className="text-xs text-white/40">{loc.city}, {loc.country}</p>
                                        </div>
                                    </button>
                                ))
                            ) : search && (
                                <div className="p-4 text-center text-white/40">No results found</div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ============================================
// NEARBY DISCOVERY
// ============================================

interface NearbyDiscoveryProps {
    places: NearbyPlace[];
    userLocation: Location | null;
    onPlaceClick: (id: string, type: NearbyPlace['type']) => void;
    onRequestLocation: () => void;
}

export function NearbyDiscovery({ places, userLocation, onPlaceClick, onRequestLocation }: NearbyDiscoveryProps) {
    const [filter, setFilter] = useState<NearbyPlace['type'] | 'all'>('all');

    const formatDistance = (meters: number) => {
        if (meters < 1000) return `${meters}m`;
        return `${(meters / 1000).toFixed(1)}km`;
    };

    const filtered = filter === 'all' ? places : places.filter(p => p.type === filter);

    if (!userLocation) {
        return (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/10 flex items-center justify-center text-3xl">📍</div>
                <h3 className="font-semibold text-white mb-2">Enable Location</h3>
                <p className="text-white/50 mb-4">Share your location to discover nearby content</p>
                <button onClick={onRequestLocation}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium">Allow Location</button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
                {(['all', 'business', 'group', 'event', 'user'] as const).map(type => (
                    <button key={type} onClick={() => setFilter(type)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm capitalize ${filter === type ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/60'}`}>
                        {type === 'all' ? 'All' : type === 'business' ? '🏪 Businesses' : type === 'group' ? '👥 Groups' : type === 'event' ? '📅 Events' : '👤 People'}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="py-12 text-center text-white/40">No nearby {filter === 'all' ? 'places' : filter + 's'} found</div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(place => (
                        <motion.button key={place.id} whileHover={{ x: 4 }} onClick={() => onPlaceClick(place.id, place.type)}
                            className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 text-left">
                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
                                {place.imageUrl ? <img src={place.imageUrl} alt="" className="w-full h-full object-cover" /> : (
                                    <span className="text-xl">{place.type === 'business' ? '🏪' : place.type === 'group' ? '👥' : place.type === 'event' ? '📅' : '👤'}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate">{place.name}</p>
                                <p className="text-xs text-white/40">{place.location.address}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-cyan-400">{formatDistance(place.distance)}</p>
                                {place.rating && <p className="text-xs text-white/40">⭐ {place.rating}</p>}
                            </div>
                        </motion.button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default LocationPicker;
