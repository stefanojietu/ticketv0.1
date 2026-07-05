import { X, MapPin, Sparkles, Star, Calendar, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { EventDetails, EventLocation } from '../types';

interface LocationProfileModalProps {
  location: EventLocation;
  allEvents: EventDetails[];
  onClose: () => void;
  onSelectEvent: (event: EventDetails) => void;
}

export default function LocationProfileModal({ 
  location, 
  allEvents, 
  onClose,
  onSelectEvent
}: LocationProfileModalProps) {
  // Filter events scheduled at this location
  const locationEvents = allEvents.filter(
    e => e.locationId === location.id || e.locationName.toLowerCase() === location.name.toLowerCase()
  );

  const currentlyRunning = locationEvents.filter(e => e.status === 'running');
  const upcomingEvents = locationEvents.filter(e => e.status === 'upcoming');
  const pastEvents = locationEvents.filter(e => e.status === 'past');

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-[#181818] border border-[#282828] rounded-xl overflow-hidden max-w-2xl w-full text-white shadow-2xl relative"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-gray-300 hover:text-white z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Header */}
        <div className="h-52 relative overflow-hidden">
          <img 
            src={location.image} 
            alt={location.name} 
            className="w-full h-full object-cover brightness-75" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent" />
          <div className="absolute bottom-6 left-6 pr-12">
            <div className="flex items-center gap-1.5 text-[#1DB954] text-xs font-bold tracking-wider mb-1 uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>POPULAR DESTINATION</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight">{location.name}</h2>
          </div>
        </div>

        {/* Venue Stats Row */}
        <div className="px-6 py-4 bg-[#202020] border-b border-[#282828] flex justify-between items-center text-xs text-gray-400 font-semibold uppercase">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-400 fill-current" />
            <span className="text-white">{location.rating} Rating</span>
          </div>
          <div>Capacity: <span className="text-white font-bold">{location.capacity.toLocaleString()}</span></div>
          <div className="flex items-center gap-1 font-mono text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-[#1DB954]" />
            <span className="max-w-[150px] md:max-w-xs truncate">{location.address.split(',')[1] || location.address}</span>
          </div>
        </div>

        {/* Location Content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-6">
          
          {/* Venue Description */}
          <div>
            <h3 className="text-xs font-black tracking-widest text-gray-500 uppercase mb-2">VENUE INSIGHTS</h3>
            <p className="text-sm text-gray-300 leading-relaxed font-sans">{location.description}</p>
          </div>

          {/* CURRENTLY RUNNING EVENTS */}
          <div>
            <h3 className="text-xs font-black tracking-widest text-emerald-400 uppercase mb-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
              <span>LIVE RIGHT NOW</span>
            </h3>
            {currentlyRunning.length === 0 ? (
              <div className="bg-[#121212]/40 p-4 text-center rounded text-gray-500 text-xs border border-[#2b2b2b]/30">
                No events currently running right now at this location.
              </div>
            ) : (
              <div className="space-y-3">
                {currentlyRunning.map((evt) => (
                  <div 
                    key={evt.id}
                    onClick={() => onSelectEvent(evt)}
                    className="flex gap-4 p-4 bg-gradient-to-r from-[#143219] to-[#121212] hover:to-[#222] rounded-md border border-emerald-500/20 transition-all group cursor-pointer shadow-lg animate-pulse"
                  >
                    <img 
                      src={evt.image} 
                      alt={evt.title} 
                      className="w-16 h-16 rounded object-cover shadow border border-emerald-500/30" 
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] text-emerald-400 font-extrabold tracking-wider uppercase mb-0.5">ACTIVE EVENT</div>
                        <h4 className="font-bold text-sm group-hover:text-emerald-300 transition-colors">{evt.title}</h4>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold uppercase mt-2">
                        <span className="flex items-center gap-1 text-emerald-300">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          Started {evt.time}
                        </span>
                        <span className="text-emerald-400 font-bold tracking-wide">Enter Lobby</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* UPCOMING EVENTS */}
          <div>
            <h3 className="text-xs font-black tracking-widest text-gray-400 uppercase mb-3">UPCOMING SCHEDULE</h3>
            {upcomingEvents.length === 0 ? (
              <div className="bg-[#121212] p-4 text-center rounded text-gray-500 text-xs">
                No upcoming events scheduled at this time.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((evt) => (
                  <div 
                    key={evt.id}
                    onClick={() => onSelectEvent(evt)}
                    className="flex gap-4 p-3 bg-[#202020] hover:bg-[#282828] rounded-md border border-[#2b2b2b] transition-all group cursor-pointer"
                  >
                    <img 
                      src={evt.image} 
                      alt={evt.title} 
                      className="w-16 h-16 rounded object-cover shadow border border-[#333]" 
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm group-hover:text-[#1DB954] transition-colors">{evt.title}</h4>
                        <p className="text-[10px] text-gray-400 mt-1">Staged by {evt.hostName}</p>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#1DB954]" />
                          {evt.date} @ {evt.time}
                        </span>
                        <span className="text-[#1DB954] font-bold">Buy Tickets</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PREVIOUS EVENTS */}
          <div>
            <h3 className="text-xs font-black tracking-widest text-gray-400 uppercase mb-3">COMPLETED HISTORIC EVENTS</h3>
            {pastEvents.length === 0 ? (
              <div className="space-y-3">
                {/* Standard Past Seed Events if they didn't buy anything past */}
                <div className="flex gap-4 p-3 bg-[#202020]/40 rounded-md border border-[#2b2b2b]/30 grayscale opacity-65">
                  <img 
                    src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=100" 
                    alt="Past Show" 
                    className="w-16 h-16 rounded object-cover" 
                  />
                  <div className="flex-1 flex flex-col justify-between text-gray-400">
                    <div>
                      <h4 className="font-bold text-sm">Afterlife Mirage Opening 2025</h4>
                      <p className="text-[10px] mt-1">Staged by Rose Avenue Records</p>
                    </div>
                    <div className="text-[10px] uppercase mt-1">Completed Aug 2025</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {pastEvents.map((evt) => (
                  <div 
                    key={evt.id}
                    className="flex gap-4 p-3 bg-[#202020]/40 rounded-md border border-[#2b2b2b]/30 grayscale opacity-65"
                  >
                    <img 
                      src={evt.image} 
                      alt={evt.title} 
                      className="w-16 h-16 rounded object-cover" 
                    />
                    <div className="flex-1 flex flex-col justify-between text-gray-400">
                      <div>
                        <h4 className="font-bold text-sm">{evt.title}</h4>
                        <p className="text-[10px] mt-1">Staged by {evt.hostName}</p>
                      </div>
                      <div className="text-[10px] uppercase mt-1">Completed {evt.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}
