import { useState } from 'react';
import { Search, MapPin, Music, User, Flame, Sparkles } from 'lucide-react';
import { EventDetails, EventLocation } from '../types';

interface SearchSectionProps {
  allEvents: EventDetails[];
  locations: EventLocation[];
  onSelectEvent: (evt: EventDetails) => void;
  onSelectHolder: (holderName: string) => void;
  onSelectLocation: (loc: EventLocation) => void;
}

export default function SearchSection({
  allEvents,
  locations,
  onSelectEvent,
  onSelectHolder,
  onSelectLocation
}: SearchSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique hosts/producers
  const uniqueHosts = Array.from(new Set(allEvents.map((e) => e.hostName)));

  // Perform multi-dimensional search
  const cleanQuery = searchQuery.trim().toLowerCase();

  const matchingEvents = cleanQuery 
    ? allEvents.filter(
        e => e.title.toLowerCase().includes(cleanQuery) || 
             e.description.toLowerCase().includes(cleanQuery)
      )
    : [];

  const matchingHolders = cleanQuery
    ? uniqueHosts.filter(host => host.toLowerCase().includes(cleanQuery))
    : [];

  const matchingLocations = cleanQuery
    ? locations.filter(
        loc => loc.name.toLowerCase().includes(cleanQuery) || 
               loc.description.toLowerCase().includes(cleanQuery)
      )
    : [];

  const popularSearches = [
    { label: 'Brooklyn Mirage', type: 'location', data: locations.find(l => l.id === 'loc-mirage') },
    { label: 'Red Rocks', type: 'location', data: locations.find(l => l.id === 'loc-redrocks') },
    { label: 'Solomun', type: 'holder', data: 'Diynamic Events Inc.' },
    { label: 'RÜFÜS DU SOL', type: 'holder', data: 'Rose Avenue Records' },
    { label: 'Modular Techno', type: 'query', data: 'techno' }
  ];

  const handlePopularClick = (item: any) => {
    if (item.type === 'location' && item.data) {
      onSelectLocation(item.data);
    } else if (item.type === 'holder' && item.data) {
      onSelectHolder(item.data);
    } else {
      setSearchQuery(item.data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar Input */}
      <div className="relative max-w-xl">
        <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="What do you want to experience? (Events, Holders, Venues)"
          className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#2a2a2a] text-white pl-12 pr-4 py-3.5 rounded-full text-sm font-semibold border border-transparent focus:border-[#1DB954] focus:outline-none transition-all placeholder-gray-500 shadow-md"
        />
      </div>

      {/* Popular Quick-Search Suggestions */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-gray-500 font-bold mr-1 flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          POPULAR SELECTION:
        </span>
        {popularSearches.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handlePopularClick(item)}
            className="bg-[#242424] hover:bg-[#2a2a2a] border border-[#2b2b2b] hover:border-gray-600 text-gray-300 hover:text-white px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Multi-Dimensional Search Results Section */}
      {cleanQuery && (
        <div className="bg-[#181818] p-6 rounded-xl border border-[#282828] space-y-6 animate-fadeIn">
          <h2 className="text-lg font-black text-white flex justify-between items-center border-b border-[#282828] pb-3">
            <span>Search Results for "{searchQuery}"</span>
            <span className="text-[10px] text-gray-500 font-mono">Fuzzy Sync Activated</span>
          </h2>

          {matchingEvents.length === 0 && matchingHolders.length === 0 && matchingLocations.length === 0 ? (
            <div className="py-12 text-center text-gray-500 space-y-2">
              <Sparkles className="w-8 h-8 text-gray-600 mx-auto" />
              <div className="text-sm">No exact matches found in our directory.</div>
              <div className="text-xs text-gray-600">Try searching for keywords like "Solomun", "Mirage", or "Techno"</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* SECTION 1: MATCHING EVENTS */}
              <div className="space-y-3">
                <h3 className="text-xs font-black tracking-widest text-[#1DB954] uppercase flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  <span>Events ({matchingEvents.length})</span>
                </h3>
                {matchingEvents.length === 0 ? (
                  <div className="text-xs text-gray-500 py-4">No matching live shows</div>
                ) : (
                  <div className="space-y-2">
                    {matchingEvents.map((evt) => (
                      <div 
                        key={evt.id}
                        onClick={() => onSelectEvent(evt)}
                        className="p-3 bg-[#202020] hover:bg-[#282828] rounded-md border border-[#2b2b2b] transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <img src={evt.image} className="w-12 h-12 rounded object-cover" />
                        <div className="truncate flex-1">
                          <div className="text-xs font-bold text-white group-hover:text-[#1DB954] transition-colors truncate">{evt.title}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 truncate">{evt.locationName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: MATCHING HOLDERS */}
              <div className="space-y-3">
                <h3 className="text-xs font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Holders ({matchingHolders.length})</span>
                </h3>
                {matchingHolders.length === 0 ? (
                  <div className="text-xs text-gray-500 py-4">No matching producers</div>
                ) : (
                  <div className="space-y-2">
                    {matchingHolders.map((holder) => (
                      <div 
                        key={holder}
                        onClick={() => onSelectHolder(holder)}
                        className="p-3 bg-[#202020] hover:bg-[#282828] rounded-md border border-[#2b2b2b] transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#1db954]/10 border border-[#1db954]/30 flex items-center justify-center font-bold text-[#1db954] text-sm uppercase">
                          {holder.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-[#1DB954] transition-colors">{holder}</div>
                          <div className="text-[9px] text-emerald-400 font-bold uppercase mt-0.5">Verified Profile</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3: MATCHING LOCATIONS */}
              <div className="space-y-3">
                <h3 className="text-xs font-black tracking-widest text-red-400 uppercase flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Locations ({matchingLocations.length})</span>
                </h3>
                {matchingLocations.length === 0 ? (
                  <div className="text-xs text-gray-500 py-4">No matching music venues</div>
                ) : (
                  <div className="space-y-2">
                    {matchingLocations.map((loc) => (
                      <div 
                        key={loc.id}
                        onClick={() => onSelectLocation(loc)}
                        className="p-3 bg-[#202020] hover:bg-[#282828] rounded-md border border-[#2b2b2b] transition-all flex items-center gap-3 cursor-pointer group"
                      >
                        <img src={loc.image} className="w-12 h-12 rounded object-cover" />
                        <div className="truncate flex-1">
                          <div className="text-xs font-bold text-white group-hover:text-[#1DB954] transition-colors truncate">{loc.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5 truncate">{loc.address.split(',')[1] || loc.address}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
