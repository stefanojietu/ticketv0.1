import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { EventDetails, EventLocation } from './types';

// Music-themed word pool for generating the requested "scrambled words" security codes
export const MUSIC_WORDS = [
  'TEMPO', 'RHYTHM', 'SYNTH', 'GROOVE', 'RESONANCE', 'ECHO', 'CHORD', 'MELODY',
  'REVERB', 'BEAT', 'OCTAVE', 'FREQUENCY', 'PULSE', 'LYRIC', 'ACOUSTIC', 'VOLTAGE',
  'TREBLE', 'DECIbel', 'DYNAMIC', 'HARMONY', 'FADER', 'MIXER', 'NEON', 'CROWD'
];

// Shuffles the letters of a word to create a scrambled version
export function scrambleWord(word: string): string {
  const letters = word.toUpperCase().split('');
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters.join('');
}

// Generates a unique security check code of scrambled words
export function generateScrambledSecurityCode(): string {
  const chosenWords: string[] = [];
  const tempPool = [...MUSIC_WORDS];
  
  // Pick 3 random words
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * tempPool.length);
    chosenWords.push(tempPool.splice(idx, 1)[0]);
  }
  
  // Scramble each word and combine
  const scrambledParts = chosenWords.map(w => scrambleWord(w));
  const pin = Math.floor(100 + Math.random() * 900); // 3-digit pin for extra entropy
  
  return `${scrambledParts.join('-')}-${pin}`;
}

export const SEED_LOCATIONS: EventLocation[] = [
  {
    id: 'loc-mirage',
    name: 'The Brooklyn Mirage',
    description: 'An open-air sanctuary in the heart of Brooklyn, featuring a massive high-definition LED video wall and state-of-the-art KV2 audio.',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800',
    capacity: 6000,
    address: '140 Stewart Ave, Brooklyn, NY 11237',
    rating: 4.8,
    upcomingEventsCount: 3
  },
  {
    id: 'loc-redrocks',
    name: 'Red Rocks Amphitheatre',
    description: 'A geological masterpiece—a naturally-formed, world-famous outdoor venue carved into red sandstone rocks outside Denver.',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800',
    capacity: 9545,
    address: '18300 W Alameda Pkwy, Morrison, CO 80465',
    rating: 4.9,
    upcomingEventsCount: 2
  },
  {
    id: 'loc-fabric',
    name: 'Fabric London',
    description: 'The legendary underground hub of underground house, techno, drum & bass. Home of the famous bass-vibrating bodysonic dancefloor.',
    image: 'https://images.unsplash.com/photo-1574169208507-84376144848b?auto=format&fit=crop&q=80&w=800',
    capacity: 1600,
    address: '77A Charterhouse St, London EC1M 6HJ, UK',
    rating: 4.7,
    upcomingEventsCount: 1
  },
  {
    id: 'loc-berghain',
    name: 'Berghain Panorama Bar',
    description: 'Widely considered the world capital of techno, housed in an industrial former heating plant renowned for its sound and strict entry policy.',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800',
    capacity: 1500,
    address: 'Am Wriezener Bahnhof, 10243 Berlin, Germany',
    rating: 4.6,
    upcomingEventsCount: 2
  }
];

export const SEED_EVENTS: EventDetails[] = [
  {
    id: 'evt-solomun',
    title: 'Solomun Open Air [Mirage Extended]',
    description: 'The Diynamic music label boss returns for an all-night 5-hour journey through melodic house and deep techno, accompanied by custom visual architecture.',
    date: '2026-07-25',
    time: '22:00',
    locationId: 'loc-mirage',
    locationName: 'The Brooklyn Mirage',
    image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800',
    hostId: 'host-diynamic',
    hostName: 'Diynamic Events Inc.',
    tiers: [
      { name: 'Early Bird', price: 45, limit: 100, sold: 100, description: 'Entry before 11 PM' },
      { name: 'General Admission', price: 65, limit: 300, sold: 180, description: 'Standard Entry Tier' },
      { name: 'VIP Deck', price: 150, limit: 50, sold: 15, description: 'Elevated view, private bars, VIP express entrance' }
    ],
    capacity: 450,
    soldCount: 295,
    status: 'upcoming',
    bouncers: [],
    scrambledWordPool: MUSIC_WORDS,
    createdAt: Date.now() - 500000
  },
  {
    id: 'evt-rufus',
    title: 'RÜFÜS DU SOL: Live at Red Rocks',
    description: 'Experience an emotional live performance of their greatest hits, framed by natural red rocks and starry night skies.',
    date: '2026-08-02',
    time: '19:30',
    locationId: 'loc-redrocks',
    locationName: 'Red Rocks Amphitheatre',
    image: 'https://images.unsplash.com/photo-1489641499690-9a6ce0f6591d?auto=format&fit=crop&q=80&w=800',
    hostId: 'host-roseavenue',
    hostName: 'Rose Avenue Records',
    tiers: [
      { name: 'GA Standing', price: 85, limit: 500, sold: 500, description: 'First come first served seating/standing' },
      { name: 'VIP Reserved', price: 220, limit: 100, sold: 95, description: 'Rows 1-7 reserved seating + premium booklet' }
    ],
    capacity: 600,
    soldCount: 595,
    status: 'upcoming',
    bouncers: [],
    scrambledWordPool: MUSIC_WORDS,
    createdAt: Date.now() - 400000
  },
  {
    id: 'evt-drumcode',
    title: 'Drumcode Label Showcase',
    description: 'Adam Beyer hosts an uncompromising roster of techno heavyweights at the historic fabric. Expect heavy, driving, subterranean bass.',
    date: '2026-07-12',
    time: '23:00',
    locationId: 'loc-fabric',
    locationName: 'Fabric London',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800',
    hostId: 'host-drumcode',
    hostName: 'Drumcode Records Ltd.',
    tiers: [
      { name: 'Standard Ticket', price: 25, limit: 200, sold: 140, description: 'General club access' },
      { name: 'VIP Priority', price: 50, limit: 40, sold: 22, description: 'Queue jump + free cloakroom' }
    ],
    capacity: 240,
    soldCount: 162,
    status: 'upcoming',
    bouncers: [],
    scrambledWordPool: MUSIC_WORDS,
    createdAt: Date.now() - 300000
  },
  {
    id: 'evt-kalkbrenner',
    title: 'Paul Kalkbrenner [Live Set]',
    description: 'The Berlin legend plays a unique live set using his custom-built hardware setup, showcasing his iconic modular synthesizer soundscapes.',
    date: '2026-07-05',
    time: '18:00',
    locationId: 'loc-berghain',
    locationName: 'Berghain Panorama Bar',
    image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=800',
    hostId: 'host-bpitch',
    hostName: 'BPitch Control Berlin',
    tiers: [
      { name: 'Guestlist Admission', price: 20, limit: 150, sold: 150, description: 'Door selection rules apply' }
    ],
    capacity: 150,
    soldCount: 150,
    status: 'running', // Currently happening!
    bouncers: [],
    scrambledWordPool: MUSIC_WORDS,
    createdAt: Date.now() - 200000
  }
];

// Checks if database has locations and seeds them if empty
export async function seedDatabaseIfNeeded() {
  let locSnap;
  try {
    locSnap = await getDocs(collection(db, 'locations'));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'locations');
    throw err;
  }

  if (locSnap.empty) {
    console.log('Seeding initial music venues (locations) to Firestore...');
    const batch = writeBatch(db);
    
    SEED_LOCATIONS.forEach((loc) => {
      const docRef = doc(db, 'locations', loc.id);
      batch.set(docRef, loc);
    });
    
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'locations');
      throw err;
    }
  }

  let evtSnap;
  try {
    evtSnap = await getDocs(collection(db, 'events'));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'events');
    throw err;
  }

  if (evtSnap.empty) {
    console.log('Seeding curated upcoming/running events to Firestore...');
    const batch = writeBatch(db);
    
    SEED_EVENTS.forEach((evt) => {
      const docRef = doc(db, 'events', evt.id);
      batch.set(docRef, evt);
    });
    
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'events');
      throw err;
    }
  }
}
