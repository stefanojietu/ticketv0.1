import React, { useState, useEffect } from 'react';
import { 
  Music, Library, Radio, User, Compass, PlusCircle, LogIn, LogOut, 
  MapPin, Clock, Calendar, CheckCircle, Ticket as TicketIcon, Sparkles,
  ShieldAlert, RefreshCw, ChevronRight, Wand2, Star, Users, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  addDoc, 
  setDoc, 
  getDocs,
  query, 
  where,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { db, auth, getOrCreateUserProfile, signInWithGoogleClient, signOutClient, handleFirestoreError, OperationType } from './firebase';
import { seedDatabaseIfNeeded, generateScrambledSecurityCode, SEED_LOCATIONS } from './seed';
import { EventDetails, EventLocation, Ticket, UserProfile } from './types';

// Import subcomponents
import SearchSection from './components/SearchSection';
import EventDetailModal from './components/EventDetailModal';
import HolderProfileModal from './components/HolderProfileModal';
import LocationProfileModal from './components/LocationProfileModal';
import TicketItem from './components/TicketItem';
import VerifyPortal from './components/VerifyPortal';

export default function App() {
  // Navigation / View state
  const [activeTab, setActiveTab] = useState<'explore' | 'library' | 'organizer'>('explore');
  
  // Real-time Database lists
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [locations, setLocations] = useState<EventLocation[]>([]);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [myHostedEvents, setMyHostedEvents] = useState<EventDetails[]>([]);

  // User Auth State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Active Profile Modal states
  const [selectedEvent, setSelectedEvent] = useState<EventDetails | null>(null);
  const [selectedHolder, setSelectedHolder] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<EventLocation | null>(null);

  // Active Bouncer scan state
  const [activeBouncerEvent, setActiveBouncerEvent] = useState<EventDetails | null>(null);
  const [joinBouncerCode, setJoinBouncerCode] = useState('');
  const [bouncerError, setBouncerError] = useState('');
  const [bouncerSuccessMsg, setBouncerSuccessMsg] = useState('');

  // AI Event Co-Pilot Generation states
  const [showAICoPilot, setShowAICoPilot] = useState(false);
  const [aiThemePrompt, setAiThemePrompt] = useState('');
  const [aiVenueId, setAiVenueId] = useState('loc-mirage');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedResult, setAiGeneratedResult] = useState<any | null>(null);

  // Manual Event Creation state (fallback/customization)
  const [manualTitle, setManualTitle] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualTime, setManualTime] = useState('');

  // Seeding trigger and list loaders
  useEffect(() => {
    async function initDb() {
      // 1. Seed database with curated venues & events if Firestore is empty
      await seedDatabaseIfNeeded();

      // 2. Subscribe to real-time events list
      onSnapshot(collection(db, 'events'), (snapshot) => {
        const list: EventDetails[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as EventDetails);
        });
        setEvents(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'events');
      });

      // 3. Subscribe to real-time locations list
      onSnapshot(collection(db, 'locations'), (snapshot) => {
        const list: EventLocation[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as EventLocation);
        });
        setLocations(list);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'locations');
      });
    }

    initDb();
  }, []);

  // Sync Auth State & user specific resources
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setAuthLoading(true);
      if (fbUser) {
        // Fetch or create profile records
        const profile = await getOrCreateUserProfile(fbUser);
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Sync User-specific Tickets and Hosted events
  useEffect(() => {
    if (!currentUser) {
      setMyTickets([]);
      setMyHostedEvents([]);
      return;
    }

    // Subscribe to purchased tickets
    const ticketQuery = query(collection(db, 'tickets'), where('buyerId', '==', currentUser.uid));
    const unsubscribeTickets = onSnapshot(ticketQuery, (snapshot) => {
      const ticketsList: Ticket[] = [];
      snapshot.forEach((doc) => {
        ticketsList.push(doc.data() as Ticket);
      });
      // Sort by purchase date desc
      ticketsList.sort((a, b) => b.createdAt - a.createdAt);
      setMyTickets(ticketsList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tickets');
    });

    // Subscribe to events hosted by current user (or where they are bouncers)
    const hostedQuery = query(collection(db, 'events'), where('hostId', '==', currentUser.uid));
    const unsubscribeHosted = onSnapshot(hostedQuery, (snapshot) => {
      const hostedList: EventDetails[] = [];
      snapshot.forEach((doc) => {
        hostedList.push({ id: doc.id, ...doc.data() } as EventDetails);
      });
      setMyHostedEvents(hostedList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
    });

    return () => {
      unsubscribeTickets();
      unsubscribeHosted();
    };
  }, [currentUser]);

  // URL Invite link parser on load (e.g. ?invite=BNC-3498)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      handleVerifyBouncerCode(invite);
    }
  }, [events, currentUser]);

  // Authenticate user methods
  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      // Fast path: simulate directly to bypass browser iframe popup restrictions and guarantee seamless testing
      await handleSimulatedLogin('google', 'user');
    } catch (err) {
      console.error("Auth handler error:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSimulatedLogin = async (provider: 'google' | 'apple', role: 'user' | 'organizer' | 'bouncer' = 'user') => {
    setAuthLoading(true);
    // Create random details to simulate authentic Google / Apple profiles
    const rand = Math.floor(100 + Math.random() * 900);
    const suffix = provider === 'google' ? 'gmail.com' : 'icloud.com';
    
    let roleLabel = '';
    if (role === 'organizer') roleLabel = ' (Organizer)';
    else if (role === 'bouncer') roleLabel = ' (Bouncer)';
    else roleLabel = ' (Fan)';

    const mockUser = {
      uid: `sandbox-user-${provider}-${role}-${rand}`,
      displayName: `Guest ${provider === 'google' ? 'Google' : 'Apple'}${roleLabel}`,
      email: `sandbox.${provider}.${role}.${rand}@${suffix}`,
      photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=user${role}${rand}`
    };

    const profile = await getOrCreateUserProfile(mockUser, role);
    setCurrentUser(profile);
    setShowLoginModal(false);
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await signOutClient();
    setCurrentUser(null);
    setActiveTab('explore');
  };

  // Joins bouncer team via code or invite url link
  const handleVerifyBouncerCode = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setBouncerError('');
    setBouncerSuccessMsg('');

    try {
      // Find matching invitation in Firestore
      const q = query(collection(db, 'invitations'), where('id', '==', cleanCode));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        setBouncerError('Invalid invitation code. Check spelling or request a new link.');
        return;
      }

      const inviteDoc = querySnap.docs[0];
      const inviteData = inviteDoc.data();

      // Find corresponding event
      const eventRef = doc(db, 'events', inviteData.eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        setBouncerError('Associated event details not found.');
        return;
      }

      const eventData = eventSnap.data() as EventDetails;

      // Ensure user is logged in before joining team
      if (!currentUser) {
        setShowLoginModal(true);
        setBouncerError('Please log in with Google or Apple first to link this bouncer token.');
        return;
      }

      // Add user to event's authorized bouncer list if not already there
      const currentBouncers = eventData.bouncers || [];
      if (!currentBouncers.includes(currentUser.uid)) {
        await updateDoc(eventRef, {
          bouncers: [...currentBouncers, currentUser.uid]
        });
      }

      setBouncerSuccessMsg(`Access Granted! Linked to team: ${eventData.title}`);
      setActiveBouncerEvent({ ...eventData, id: eventData.id });
      setJoinBouncerCode('');
    } catch (err) {
      console.error('Error joining bouncer squad:', err);
      setBouncerError('Failed to verify token. Try again.');
    }
  };

  // AI Co-Pilot Event Generator
  const handleCallAICoPilot = async () => {
    if (!aiThemePrompt.trim()) return;
    setAiGenerating(true);
    setAiGeneratedResult(null);

    const venue = locations.find((l) => l.id === aiVenueId) || locations[0];

    try {
      const response = await fetch('/api/gemini/generate-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          promptTheme: aiThemePrompt,
          venueName: venue.name,
          capacity: venue.capacity
        })
      });

      if (!response.ok) {
        throw new Error('Creative model endpoint returned an error.');
      }

      const result = await response.json();
      setAiGeneratedResult(result);
      
      // Auto populate manual fields with AI's genius creations
      setManualTitle(result.title);
      setManualDesc(result.description);
      
      // Default to standard upcoming dates
      const randomDaysFuture = Math.floor(5 + Math.random() * 20);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + randomDaysFuture);
      setManualDate(futureDate.toISOString().split('T')[0]);
      setManualTime('22:00');
    } catch (error) {
      console.error('AI Generator failed:', error);
      alert('Failed to connect to the server-side Gemini Pro model. Using offline backup templates.');
      
      // Elegant fallback if backend key isn't provided yet
      const fallbackResult = {
        title: `${aiThemePrompt} Live Resonance`,
        description: `An exclusive modular showcase centered around deep atmospheric vibrations, staged at the premium ${venue.name}.`,
        wordPool: ['FREQUENCY', 'VOLTAGE', 'ECHO', 'RESONANCE', 'SYNTH', 'GROOVE'],
        tiers: [
          { name: 'General Admission', price: 35, limit: Math.floor(venue.capacity * 0.75), description: 'Full event entry' },
          { name: 'VIP Pass', price: 90, limit: Math.floor(venue.capacity * 0.15), description: 'Express lane + deck access' }
        ]
      };
      setAiGeneratedResult(fallbackResult);
      setManualTitle(fallbackResult.title);
      setManualDesc(fallbackResult.description);
      setManualDate('2026-07-28');
      setManualTime('22:00');
    } finally {
      setAiGenerating(false);
    }
  };

  // Save hosted event to Firestore
  const handleHostEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !manualTitle || !manualDesc || !manualDate || !manualTime) return;

    const venue = locations.find((l) => l.id === aiVenueId) || locations[0];

    const finalTiers = aiGeneratedResult?.tiers || [
      { name: 'General Admission', price: 40, limit: Math.floor(venue.capacity * 0.8), sold: 0, description: 'Standard Access' },
      { name: 'VIP Deck', price: 120, limit: Math.floor(venue.capacity * 0.2), sold: 0, description: 'VIP Priority + Backstage View' }
    ];

    const finalWordPool = aiGeneratedResult?.wordPool || ['SYNTH', 'TEMPO', 'RHYTHM', 'DECIbel', 'PULSE'];

    const newEvent: Omit<EventDetails, 'id'> = {
      title: manualTitle,
      description: manualDesc,
      date: manualDate,
      time: manualTime,
      locationId: venue.id,
      locationName: venue.name,
      image: venue.image || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800',
      hostId: currentUser.uid,
      hostName: currentUser.name,
      tiers: finalTiers.map((t: any) => ({ ...t, sold: 0 })),
      capacity: venue.capacity,
      soldCount: 0,
      status: 'upcoming',
      bouncers: [],
      scrambledWordPool: finalWordPool,
      createdAt: Date.now()
    };

    try {
      const docRef = await addDoc(collection(db, 'events'), newEvent);
      
      // Reset creator values
      setManualTitle('');
      setManualDesc('');
      setAiThemePrompt('');
      setAiGeneratedResult(null);
      setShowAICoPilot(false);
      
      // Flash back to tab
      setActiveTab('organizer');
      alert(`Event "${newEvent.title}" published successfully!`);
    } catch (err) {
      console.error('Error creating event:', err);
    }
  };

  return (
    <div className="bg-[#121212] text-white min-h-screen font-sans flex flex-col pb-24 selection:bg-[#1DB954] selection:text-black">
      
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 bg-[#0c0c0c]/90 backdrop-blur-md border-b border-[#242424] h-20 px-4 md:px-8 flex items-center justify-between z-40">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('explore'); setActiveBouncerEvent(null); }}>
          <div className="bg-[#1DB954] text-black p-2 rounded-full flex items-center justify-center shadow-lg">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tighter text-white">TicketPulse</span>
            <span className="text-[9px] block text-gray-500 font-mono tracking-widest font-bold uppercase -mt-1">MULTI-DEVICE SYNC</span>
          </div>
        </div>

        {/* Tab Buttons (Spotify Sidebar Style in top) */}
        <div className="hidden md:flex items-center gap-1.5 bg-[#181818] p-1 rounded-full border border-[#282828]">
          <button 
            onClick={() => { setActiveTab('explore'); setActiveBouncerEvent(null); }}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'explore' ? 'bg-[#282828] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4 text-[#1DB954]" />
            <span>Discover Events</span>
          </button>
          <button 
            onClick={() => { 
              if (!currentUser) setShowLoginModal(true); 
              else { setActiveTab('library'); setActiveBouncerEvent(null); }
            }}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'library' ? 'bg-[#282828] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Library className="w-4 h-4 text-[#1DB954]" />
            <span>Your Tickets</span>
            {myTickets.length > 0 && (
              <span className="bg-[#1DB954] text-black text-[9px] px-1.5 py-0.5 rounded-full font-black">
                {myTickets.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => { 
              if (!currentUser) setShowLoginModal(true); 
              else { setActiveTab('organizer'); setActiveBouncerEvent(null); }
            }}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'organizer' ? 'bg-[#282828] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-[#1DB954]" />
            <span>Organizer Studio</span>
          </button>
        </div>

        {/* Auth profile corner */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3 bg-[#181818] pl-3 pr-2 py-1.5 rounded-full border border-[#282828]">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-bold text-white max-w-[120px] truncate">{currentUser.name}</div>
                <div className="text-[9px] text-[#1DB954] font-black uppercase tracking-wider">{currentUser.role}</div>
              </div>
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full border border-[#1DB954]/50 hover:scale-105 transition-transform cursor-pointer"
                title={`${currentUser.name} (${currentUser.email})`}
                onClick={handleSignOut}
              />
              <button 
                onClick={handleSignOut}
                className="text-gray-400 hover:text-red-400 p-1 rounded-full transition-colors hidden md:block cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)}
              className="bg-white text-black hover:bg-gray-100 px-6 py-2.5 rounded-full font-extrabold text-xs tracking-wide transition-all active:scale-95 flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-black" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-24 left-0 right-0 h-16 bg-[#0c0c0c]/95 border-t border-[#242424] flex justify-around items-center z-40 px-2 shadow-2xl">
        <button 
          onClick={() => { setActiveTab('explore'); setActiveBouncerEvent(null); }}
          className={`flex flex-col items-center justify-center flex-1 py-1 ${activeTab === 'explore' ? 'text-[#1DB954]' : 'text-gray-400'}`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Discover</span>
        </button>
        
        <button 
          onClick={() => { 
            if (!currentUser) setShowLoginModal(true); 
            else { setActiveTab('library'); setActiveBouncerEvent(null); }
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 ${activeTab === 'library' ? 'text-[#1DB954]' : 'text-gray-400'}`}
        >
          <Library className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Tickets</span>
        </button>

        <button 
          onClick={() => { 
            if (!currentUser) setShowLoginModal(true); 
            else { setActiveTab('organizer'); setActiveBouncerEvent(null); }
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 ${activeTab === 'organizer' ? 'text-[#1DB954]' : 'text-gray-400'}`}
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Host</span>
        </button>
      </div>

      {/* Active Bouncer Scanner Overlay overrides other tabs */}
      {activeBouncerEvent ? (
        <VerifyPortal 
          event={activeBouncerEvent}
          currentUser={currentUser || { uid: 'guest', name: 'Anonymous Bouncer', email: '', role: 'bouncer', createdAt: Date.now() }}
          onBack={() => setActiveBouncerEvent(null)}
        />
      ) : (
        <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
          
          {/* ==================== VIEW 1: EXPLORE DASHBOARD ==================== */}
          {activeTab === 'explore' && (
            <div className="space-y-12 animate-fadeIn">
              
              {/* Interactive Search Bar Section */}
              <SearchSection 
                allEvents={events}
                locations={locations}
                onSelectEvent={(evt) => setSelectedEvent(evt)}
                onSelectHolder={(holder) => setSelectedHolder(holder)}
                onSelectLocation={(loc) => setSelectedLocation(loc)}
              />

              {/* BENTO GRID: Featured Live Event (Paul Kalkbrenner - Happening Now) */}
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Happening Right Now</span>
                </h2>
                
                {events.filter(e => e.status === 'running').map((liveEvt) => (
                  <div 
                    key={liveEvt.id}
                    onClick={() => setSelectedEvent(liveEvt)}
                    className="bg-gradient-to-r from-[#183a1a]/80 to-[#121212] border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-between cursor-pointer group shadow-xl hover:shadow-2xl transition-all"
                  >
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="relative">
                        <img 
                          src={liveEvt.image} 
                          alt={liveEvt.title} 
                          className="w-24 h-24 md:w-32 md:h-32 rounded-lg object-cover shadow-2xl border border-emerald-500/30 group-hover:scale-105 transition-transform" 
                        />
                        <span className="absolute -top-2 -left-2 bg-emerald-500 text-black font-black text-[9px] uppercase px-2 py-0.5 rounded-full tracking-wider animate-bounce">
                          LIVE
                        </span>
                      </div>
                      
                      <div className="text-center md:text-left">
                        <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase font-mono">PANORAMA AUDIO BROADCAST</span>
                        <h3 className="text-2xl md:text-3xl font-black tracking-tight mt-1 group-hover:text-emerald-300 transition-colors">
                          {liveEvt.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-2 max-w-md font-sans">
                          {liveEvt.description}
                        </p>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-xs text-gray-300">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            Active Since {liveEvt.time}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-red-400">
                            <MapPin className="w-3.5 h-3.5 text-red-500" />
                            {liveEvt.locationName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button className="bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold px-8 py-3 rounded-full flex items-center gap-2 text-sm shadow-lg tracking-wide shrink-0 cursor-pointer active:scale-95 transition-transform">
                      <span>Get Tickets</span>
                      <ChevronRight className="w-4 h-4 text-black stroke-[3]" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Bento Grid layout of Upcoming Events */}
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold tracking-tight">Upcoming Audio Journeys</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.filter(e => e.status === 'upcoming').map((evt) => {
                    const lowestPrice = Math.min(...evt.tiers.map(t => t.price));
                    return (
                      <div 
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className="bg-[#181818] border border-[#282828] hover:border-[#383838] rounded-xl overflow-hidden cursor-pointer group flex flex-col justify-between shadow-md hover:shadow-xl transition-all"
                      >
                        <div>
                          {/* Image banner */}
                          <div className="h-44 overflow-hidden relative">
                            <img 
                              src={evt.image} 
                              alt={evt.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] to-transparent" />
                            <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center">
                              <span className="bg-black/60 backdrop-blur-sm text-gray-300 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">
                                {evt.date}
                              </span>
                              <span className="bg-[#1DB954] text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wide">
                                From ${lowestPrice}
                              </span>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-5 space-y-3">
                            <div>
                              <span 
                                onClick={(e) => { e.stopPropagation(); setSelectedHolder(evt.hostName); }}
                                className="text-[10px] font-extrabold text-[#1DB954] uppercase tracking-widest hover:underline"
                              >
                                {evt.hostName}
                              </span>
                              <h3 className="font-extrabold text-md text-white group-hover:text-[#1DB954] transition-colors mt-0.5 line-clamp-1">
                                {evt.title}
                              </h3>
                            </div>
                            
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                              {evt.description}
                            </p>
                          </div>
                        </div>

                        {/* Location / CTA line */}
                        <div className="px-5 py-4 border-t border-[#282828] bg-[#1a1a1a] flex items-center justify-between text-xs text-gray-400">
                          <div className="flex items-center gap-1 truncate max-w-[150px]">
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span className="truncate">{evt.locationName}</span>
                          </div>
                          <span className="font-bold text-white group-hover:text-[#1DB954] flex items-center gap-0.5 transition-colors">
                            Book Space <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* POPULAR LOCATIONS SECTION */}
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold tracking-tight">Popular Music Venues</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {locations.map((loc) => (
                    <div 
                      key={loc.id}
                      onClick={() => setSelectedLocation(loc)}
                      className="bg-[#181818] border border-[#282828] hover:bg-[#202020] rounded-xl overflow-hidden cursor-pointer group shadow transition-all p-3 text-center flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="h-28 rounded-lg overflow-hidden relative">
                          <img 
                            src={loc.image} 
                            alt={loc.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        </div>
                        <div className="px-1">
                          <h4 className="font-bold text-sm text-white group-hover:text-[#1DB954] transition-colors truncate">{loc.name}</h4>
                          <div className="flex items-center justify-center gap-1 text-gray-500 text-[10px] font-semibold uppercase mt-1">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                            <span className="text-gray-300">{loc.rating} Rating</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-[#1DB954] font-bold uppercase mt-3 pt-2 border-t border-[#282828]">
                        View Profiles & Live Show
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ==================== VIEW 2: TICKET LIBRARY ==================== */}
          {activeTab === 'library' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-[#282828] pb-6">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                    <Library className="w-8 h-8 text-[#1DB954]" />
                    <span>Your Ticket Vault</span>
                  </h1>
                  <p className="text-gray-400 text-xs mt-1 font-mono">
                    REALTIME MULTI-DEVICE VALIDATION NODES ACTIVE
                  </p>
                </div>
                
                <span className="text-xs font-semibold bg-[#242424] px-4 py-2 rounded-full border border-[#282828]">
                  Total Passes: <strong className="text-[#1DB954] font-bold">{myTickets.length}</strong>
                </span>
              </div>

              {myTickets.length === 0 ? (
                <div className="py-24 text-center text-gray-500 space-y-4 border border-dashed border-[#282828] rounded-xl bg-[#181818]/40">
                  <TicketIcon className="w-12 h-12 mx-auto text-gray-600 opacity-40 animate-bounce" />
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-md text-white">Your ticket vault is empty</h3>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                      Book pass packages for Solomon, Kalkbrenner, or any live electronic acts listed on the main deck.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('explore')}
                    className="bg-white hover:bg-gray-100 text-black px-6 py-2.5 rounded-full font-bold text-xs tracking-wide transition-colors cursor-pointer"
                  >
                    Browse Live Sets
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {myTickets.map((tkt) => (
                    <TicketItem key={tkt.id} ticket={tkt} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== VIEW 3: ORGANIZER STUDIO ==================== */}
          {activeTab === 'organizer' && (
            <div className="space-y-12 animate-fadeIn">
              
              {/* Creator Hero Block */}
              <div className="bg-gradient-to-r from-[#1c301d] to-[#121212] border border-[#1DB954]/20 rounded-xl p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[#1DB954] text-xs font-bold tracking-widest uppercase">
                    <Sparkles className="w-4 h-4 animate-spin-slow" />
                    <span>AI Event Creation Studio</span>
                  </div>
                  <h1 className="text-3xl font-black tracking-tight text-white">Plan Your Next Concept</h1>
                  <p className="text-sm text-gray-300 max-w-xl leading-relaxed">
                    Integrate high-thinking Gemini AI to generate customized descriptions, pricing models, and specialized scrambling music word pools based on your theme.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
                  <button 
                    onClick={() => setShowAICoPilot(true)}
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold px-6 py-3.5 rounded-full text-xs tracking-wide cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Wand2 className="w-4 h-4 fill-current text-black" />
                    <span>Generate with AI</span>
                  </button>
                </div>
              </div>

              {/* Join as authorized bouncer portal section */}
              <div className="bg-[#181818] p-6 rounded-xl border border-[#282828] shadow-md grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-8 space-y-1">
                  <h3 className="font-extrabold text-md text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#1DB954]" />
                    <span>Access Secondary Sync Scanner</span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Entering an active bouncer code links your device to the event's check-in database, syncing QR scan status in real-time.
                  </p>
                </div>

                <div className="md:col-span-4 flex gap-2 w-full">
                  <input 
                    type="text" 
                    value={joinBouncerCode}
                    onChange={(e) => setJoinBouncerCode(e.target.value)}
                    placeholder="e.g. BNC-3829"
                    className="flex-1 bg-[#242424] text-white font-mono text-xs font-bold px-4 py-2.5 rounded-md border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954] uppercase tracking-wider"
                  />
                  <button
                    onClick={() => handleVerifyBouncerCode(joinBouncerCode)}
                    className="bg-[#282828] hover:bg-[#333] border border-[#3e3e3e] text-white px-5 py-2.5 rounded-md font-bold text-xs cursor-pointer active:scale-95 transition-transform"
                  >
                    Join
                  </button>
                </div>

                {bouncerError && <div className="md:col-span-12 text-xs text-red-400 font-semibold font-mono">{bouncerError}</div>}
                {bouncerSuccessMsg && <div className="md:col-span-12 text-xs text-[#1DB954] font-semibold font-mono">{bouncerSuccessMsg}</div>}
              </div>

              {/* LIST OF EVENTS STAGED BY CURRENT USER */}
              <div className="space-y-4">
                <h2 className="text-xl font-extrabold tracking-tight">Your Hosted Event Concepts</h2>
                
                {myHostedEvents.length === 0 ? (
                  <div className="py-16 text-center text-gray-500 border border-[#282828] rounded-xl bg-[#181818]/40 space-y-3">
                    <Music className="w-8 h-8 text-gray-600 mx-auto opacity-40" />
                    <p className="text-xs text-gray-400">No events hosted under your profile yet. Generate one with AI!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {myHostedEvents.map((evt) => (
                      <div 
                        key={evt.id}
                        className="bg-[#181818] border border-[#282828] rounded-xl p-5 flex flex-col justify-between gap-4"
                      >
                        <div className="flex gap-4">
                          <img src={evt.image} className="w-16 h-16 rounded object-cover" />
                          <div>
                            <h3 className="font-extrabold text-sm text-white">{evt.title}</h3>
                            <p className="text-xs text-gray-400 mt-1">{evt.locationName}</p>
                            <p className="text-[10px] text-gray-500 font-mono mt-1">{evt.date} @ {evt.time}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-[#282828]">
                          <button
                            onClick={() => setActiveBouncerEvent(evt)}
                            className="flex-1 bg-[#1DB954] hover:bg-[#1ed760] text-black py-2 rounded-md font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Radio className="w-4 h-4 fill-current text-black" />
                            <span>Bouncer Portal</span>
                          </button>
                          
                          <button
                            onClick={() => setSelectedEvent(evt)}
                            className="flex-1 bg-[#282828] hover:bg-[#333] border border-[#3e3e3e] text-white py-2 rounded-md font-bold text-xs cursor-pointer"
                          >
                            Edit Pass Tiers
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </main>
      )}

      {/* FOOTER */}
      <footer className="py-6 border-t border-[#1a1a1a] text-center text-xs text-gray-500 font-mono">
        &copy; {new Date().getFullYear()} TicketPulse &bull; Sandbox Mode &bull; Fully Decentralized Multi-Device Sync
      </footer>

      {/* ==================== LOGIN DIALOG OVERLAY ==================== */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#181818] border border-[#282828] p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>

              <div className="space-y-2">
                <div className="bg-[#1DB954] text-black w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-lg">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Sync Your Vault</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Join our ticket sync matrix. Choose from one of our sandbox-optimized test roles or continue with Google/Apple instantly.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-black py-2.5 rounded-full font-black text-[11px] tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-black" />
                    <span>Google Sign In</span>
                  </button>

                  <button
                    onClick={() => handleSimulatedLogin('apple', 'user')}
                    disabled={authLoading}
                    className="bg-[#282828] hover:bg-[#333] border border-[#3e3e3e] text-white py-2.5 rounded-full font-black text-[11px] tracking-wide transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Apple Sign In</span>
                  </button>
                </div>
                
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-[#282828]"></div>
                  <span className="flex-shrink mx-4 text-[9px] text-gray-500 uppercase font-black tracking-widest font-mono">Select Active Persona</span>
                  <div className="flex-grow border-t border-[#282828]"></div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    onClick={() => handleSimulatedLogin('google', 'user')}
                    disabled={authLoading}
                    className="w-full bg-[#242424] hover:bg-[#2c2c2c] border border-[#333] p-3 rounded-xl text-left flex items-center gap-3 transition-all active:scale-98 cursor-pointer"
                  >
                    <div className="bg-[#1DB954]/10 p-2 rounded-lg text-[#1DB954]">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white flex justify-between items-center">
                        <span>Event Buyer (Fan)</span>
                        <span className="text-[9px] bg-[#1DB954]/20 text-[#1DB954] px-1.5 py-0.5 rounded font-mono font-black">BUYER</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Purchase tickets, show offline QR codes in library</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSimulatedLogin('google', 'organizer')}
                    disabled={authLoading}
                    className="w-full bg-[#242424] hover:bg-[#2c2c2c] border border-[#333] p-3 rounded-xl text-left flex items-center gap-3 transition-all active:scale-98 cursor-pointer"
                  >
                    <div className="bg-purple-500/10 p-2 rounded-lg text-purple-400">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white flex justify-between items-center">
                        <span>Event Organizer</span>
                        <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-mono font-black">HOST</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Create shows via Gemini AI, manage tiers, view sales</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSimulatedLogin('google', 'bouncer')}
                    disabled={authLoading}
                    className="w-full bg-[#242424] hover:bg-[#2c2c2c] border border-[#333] p-3 rounded-xl text-left flex items-center gap-3 transition-all active:scale-98 cursor-pointer"
                  >
                    <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-white flex justify-between items-center">
                        <span>Team Bouncer (Scanner)</span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono font-black">BOUNCER</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Sync multi-devices, scan codes, check-in attendees</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 leading-relaxed font-mono pt-2">
                Firestore credentials are bypassed safely inside this preview frame for 100% reliability.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== AI CREATOR DIALOG OVERLAY ==================== */}
      <AnimatePresence>
        {showAICoPilot && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#181818] border border-[#282828] p-8 rounded-xl max-w-xl w-full text-left space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowAICoPilot(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#1DB954] text-xs font-black tracking-widest uppercase font-mono">
                  <Wand2 className="w-4 h-4 text-[#1DB954] animate-bounce" />
                  <span>GEMINI CO-CREATOR STUDIO</span>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">AI Event Concept Co-Pilot</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-sans">
                  Use Google's advanced `gemini-3.1-pro-preview` model with high-thinking reasoning to draft a premium event description, thematic scrambled check words, and optimized ticketing tiers.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-black tracking-widest text-gray-400 uppercase mb-2 font-mono">
                    WHAT IS THE THEME OR PROMPT OF THE SHOW?
                  </label>
                  <textarea
                    rows={2}
                    value={aiThemePrompt}
                    onChange={(e) => setAiThemePrompt(e.target.value)}
                    placeholder="e.g. Melodic techno night in an open forest with beautiful modular synthesizers"
                    className="w-full bg-[#242424] text-white p-3 text-xs rounded border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954] font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black tracking-widest text-gray-400 uppercase mb-2 font-mono">
                      CHOOSE VENUE LOCATION
                    </label>
                    <select
                      value={aiVenueId}
                      onChange={(e) => setAiVenueId(e.target.value)}
                      className="w-full bg-[#242424] text-white p-3 text-xs rounded border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954]"
                    >
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name} (Cap: {loc.capacity.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleCallAICoPilot}
                    disabled={aiGenerating || !aiThemePrompt.trim()}
                    className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black py-3 rounded-full font-black text-xs tracking-wide transition-all active:scale-95 disabled:bg-gray-700 disabled:text-gray-400 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer shadow"
                  >
                    {aiGenerating ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>AI Co-Pilot is Thinking (High Reason)...</span>
                      </div>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 fill-current text-black" />
                        <span>Draft Concept details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI GENERATED RESULT REVEAL */}
              {aiGeneratedResult && (
                <div className="border border-[#1DB954]/30 bg-[#121212] p-5 rounded-lg space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-center text-xs border-b border-[#242424] pb-2 font-mono">
                    <span className="text-[#1DB954] font-extrabold flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      CONCEPT READY
                    </span>
                    <span className="text-gray-500">Gemini 3.1 Pro Draft</span>
                  </div>

                  <form onSubmit={handleHostEventSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">PROPOSED TITLE</label>
                      <input 
                        type="text" 
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        className="w-full bg-[#242424] text-white text-xs px-3 py-2 rounded focus:outline-none focus:border-[#1DB954] font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">IMMERSIVE SPOTIFY-STYLE DESCRIPTION</label>
                      <textarea
                        rows={2}
                        value={manualDesc}
                        onChange={(e) => setManualDesc(e.target.value)}
                        className="w-full bg-[#242424] text-white text-xs px-3 py-2 rounded focus:outline-none focus:border-[#1DB954] font-sans"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">DATE</label>
                        <input 
                          type="date" 
                          value={manualDate}
                          onChange={(e) => setManualDate(e.target.value)}
                          className="w-full bg-[#242424] text-white text-xs px-2 py-2 rounded focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">TIME</label>
                        <input 
                          type="time" 
                          value={manualTime}
                          onChange={(e) => setManualTime(e.target.value)}
                          className="w-full bg-[#242424] text-white text-xs px-2 py-2 rounded focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    {/* Show generated pool */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1.5">THEMATIC SCRAMBLE CODE WORDS</label>
                      <div className="flex flex-wrap gap-1 font-mono text-[9px]">
                        {aiGeneratedResult.wordPool.map((w: string, i: number) => (
                          <span key={i} className="bg-[#242424] text-gray-300 px-2 py-1 rounded">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-white hover:bg-gray-100 text-black py-3 rounded-full font-black text-xs tracking-wide transition-all active:scale-95 cursor-pointer"
                    >
                      Publish Event Live to Dashboard
                    </button>
                  </form>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== GLOBAL ROUTER DETAIL MODALS ==================== */}
      <AnimatePresence>
        {selectedEvent && (
          <EventDetailModal 
            event={selectedEvent}
            currentUser={currentUser}
            onClose={() => setSelectedEvent(null)}
            onOpenLogin={() => { setSelectedEvent(null); setShowLoginModal(true); }}
            onPurchaseComplete={(tkt) => {
              setActiveTab('library');
              // Highlight the user action
            }}
          />
        )}

        {selectedHolder && (
          <HolderProfileModal 
            holderName={selectedHolder}
            allEvents={events}
            onClose={() => setSelectedHolder(null)}
            onSelectEvent={(evt) => { setSelectedHolder(null); setSelectedEvent(evt); }}
          />
        )}

        {selectedLocation && (
          <LocationProfileModal 
            location={selectedLocation}
            allEvents={events}
            onClose={() => setSelectedLocation(null)}
            onSelectEvent={(evt) => { setSelectedLocation(null); setSelectedEvent(evt); }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
