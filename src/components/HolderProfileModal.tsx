import { X, Award, CheckCircle2, Calendar, MapPin, Ticket } from 'lucide-react';
import { motion } from 'motion/react';
import { EventDetails } from '../types';

interface HolderProfileModalProps {
  holderName: string;
  allEvents: EventDetails[];
  onClose: () => void;
  onSelectEvent: (event: EventDetails) => void;
}

export default function HolderProfileModal({ 
  holderName, 
  allEvents, 
  onClose,
  onSelectEvent
}: HolderProfileModalProps) {
  // Filter events of this holder
  const holderEvents = allEvents.filter(
    e => e.hostName.toLowerCase() === holderName.toLowerCase() || e.hostId.toLowerCase() === holderName.toLowerCase()
  );

  const upcomingEvents = holderEvents.filter(e => e.status === 'upcoming' || e.status === 'running');
  const pastEvents = holderEvents.filter(e => e.status === 'past');

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

        {/* Profile Header (Spotify Style) */}
        <div className="p-8 bg-gradient-to-b from-[#183a1a] to-[#181818] border-b border-[#282828] relative">
          <div className="flex items-center gap-2 text-[#1DB954] text-xs font-bold tracking-wider mb-2">
            <Award className="w-4 h-4" />
            <span>VERIFIED EVENT CREATOR</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#1DB954] to-[#282828] flex items-center justify-center border-2 border-[#1DB954]/40 shadow-xl overflow-hidden">
              <span className="text-3xl font-black text-[#1DB954] uppercase">{holderName.charAt(0)}</span>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">{holderName}</h2>
                <CheckCircle2 className="w-6 h-6 text-[#1DB954] fill-black" />
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Curating immersive electronic music concepts since 2018. Focused on state-of-the-art audiovisual setups.
              </p>
              
              <div className="flex gap-4 mt-4 text-xs font-mono text-gray-400">
                <div><span className="text-white font-bold">{upcomingEvents.length}</span> upcoming shows</div>
                <div>•</div>
                <div><span className="text-white font-bold">{pastEvents.length}</span> past concepts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Events list content */}
        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-6">
          
          {/* UPCOMING EVENTS */}
          <div>
            <h3 className="text-xs font-black tracking-widest text-gray-400 uppercase mb-3">UPCOMING CONCEPTS</h3>
            {upcomingEvents.length === 0 ? (
              <div className="bg-[#121212] p-4 text-center rounded text-gray-500 text-xs">
                No currently scheduled upcoming shows. Check back later!
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
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
                          <MapPin className="w-3.5 h-3.5 text-red-500" />
                          <span>{evt.locationName}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-[#1DB954]" />
                          {evt.date} @ {evt.time}
                        </span>
                        <span className="text-[#1DB954] font-bold">Get Tickets</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PREVIOUS EVENTS (Styled with Grayscale) */}
          <div>
            <h3 className="text-xs font-black tracking-widest text-gray-400 uppercase mb-3">HISTORIC PORTFOLIO</h3>
            {pastEvents.length === 0 ? (
              <div className="space-y-3">
                {/* Standard Past Seed Events if they didn't buy anything past */}
                <div className="flex gap-4 p-3 bg-[#202020]/40 rounded-md border border-[#2b2b2b]/30 grayscale opacity-60">
                  <img 
                    src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=100" 
                    alt="Past Show" 
                    className="w-16 h-16 rounded object-cover" 
                  />
                  <div className="flex-1 flex flex-col justify-between text-gray-400">
                    <div>
                      <h4 className="font-bold text-sm">Afterlife Brooklyn: Solomun</h4>
                      <p className="text-[10px] mt-1">Brooklyn Mirage | Past Show</p>
                    </div>
                    <div className="text-[10px] uppercase mt-1">Completed Sept 2025</div>
                  </div>
                </div>

                <div className="flex gap-4 p-3 bg-[#202020]/40 rounded-md border border-[#2b2b2b]/30 grayscale opacity-60">
                  <img 
                    src="https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=100" 
                    alt="Past Show" 
                    className="w-16 h-16 rounded object-cover" 
                  />
                  <div className="flex-1 flex flex-col justify-between text-gray-400">
                    <div>
                      <h4 className="font-bold text-sm">SonneMondSterne Festival</h4>
                      <p className="text-[10px] mt-1">Red Rocks Amphitheatre | Past Show</p>
                    </div>
                    <div className="text-[10px] uppercase mt-1">Completed June 2025</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {pastEvents.map((evt) => (
                  <div 
                    key={evt.id}
                    className="flex gap-4 p-3 bg-[#202020]/40 rounded-md border border-[#2b2b2b]/30 grayscale opacity-60"
                  >
                    <img 
                      src={evt.image} 
                      alt={evt.title} 
                      className="w-16 h-16 rounded object-cover" 
                    />
                    <div className="flex-1 flex flex-col justify-between text-gray-400">
                      <div>
                        <h4 className="font-bold text-sm">{evt.title}</h4>
                        <p className="text-[10px] mt-1">{evt.locationName}</p>
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
