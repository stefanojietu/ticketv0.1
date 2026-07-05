export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'user' | 'organizer' | 'bouncer';
  createdAt: number;
}

export interface TicketTier {
  name: string;
  price: number;
  limit: number;
  sold: number;
  description?: string;
}

export interface EventDetails {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  locationId: string;
  locationName: string;
  image: string;
  hostId: string;
  hostName: string;
  tiers: TicketTier[];
  capacity: number;
  soldCount: number;
  status: 'upcoming' | 'running' | 'past';
  bouncers: string[]; // List of user UIDs authorized to scan for this event
  scrambledWordPool: string[]; // Pool of words for generating codes
  createdAt: number;
}

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventImage: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  tier: string;
  price: number;
  peopleCount: number; // Number of people expected / allowed on this ticket
  securityCode: string; // Scrambled security words (e.g., "BEAT-TEMPO-RESONATE-719")
  qrCodeData: string; // Serialized ticket details for validation
  status: 'active' | 'used' | 'cancelled';
  scannedAt?: number;
  scannedBy?: string;
  scannedByName?: string;
  createdAt: number;
}

export interface EventLocation {
  id: string;
  name: string;
  description: string;
  image: string;
  capacity: number;
  address: string;
  rating: number;
  upcomingEventsCount: number;
}

export interface BouncerInvitation {
  id: string; // Invite token / code
  eventId: string;
  eventTitle: string;
  hostName: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: number;
}
