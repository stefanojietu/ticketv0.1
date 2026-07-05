# TicketPulse: Spotify-Styled Event and Ticket Sync System

Welcome to **TicketPulse**, a full-stack, real-time ticket manager and sync portal designed entirely around **Spotify’s visual language** (sleek dark cards, neon-green accents, and elegant bento layouts). It is optimized for both event-goers and producers, featuring a seamless bouncer check-in team.

This document describes the architectural design and implementation details of the application, including the unique letters-scrambling ticket mechanic, real-time multi-device synchronization, and full-stack Gemini AI co-pilot.

---

## 🛠️ System Architecture & Mechanics

### 1. The Ticket Scrambling Mechanic
The user requested a secure ticket generation flow where tickets represent scrambled-letters security check codes placed in a QR Code.
- **Dynamic Scrambler (`/src/seed.ts`)**: We curate pools of thematic music/production words (e.g., `TEMPO`, `RESONANCE`, `MELODY`, `GROOVE`). When a user books a ticket, the scrambler chooses three random words from the pool, runs a high-entropy Fisher-Yates shuffle on the letters of each word individually, and joins them with hyphens alongside a unique PIN (e.g., `EMPOT-EBIV-VOORGE-742`).
- **QR Code Serialization (`/src/components/TicketItem.tsx`)**: The unique scrambled code is compiled together with the ticket serial ID into a secure token. This token is encoded as a QR code using a high-performance, lightweight vector charts API and rendered inside the ticket graphic.
- **Picture Download Option**: We implemented a complete visual `<canvas>` ticket template drawer. It compiles event banners, dates, times, buyer names, pass tiers, expected guest sizes, the monospaced scrambled security code, and the QR code into a beautiful print-ready PNG image that can be downloaded with a single click.

### 2. Multi-Device Real-Time Sync & De-registration
To solve the critical requirement of syncing checkers across multiple bouncer devices and avoiding ticket duplication:
- **Firestore Event Listeners**: When a bouncer opens the **Live Checker Terminal** for an event, their device subscribes to a real-time Firestore listener query.
- **Instant Deregistration**: When a bouncer scans or types a check code, the system queries the ticket list. If active, the ticket status changes immediately to `used` in Firestore, logging the precise scan timestamp and the specific bouncer's ID/Name.
- **Sync Propagation**: Because of real-time snapshots, *every other logged-in bouncer’s screen* instantly receives the updated database tree. If a duplicate ticket is scanned on another device even seconds later, the terminal flashes a red alarm showing `Already scanned at [Time] by [Bouncer Name]`.

### 3. Passwordless Google & Apple Sign-Ins
The system provides frictionless onboarding matching the user's instructions:
- **No Password Management**: Users sign in securely using Google or Apple with their persistent accounts.
- **Iframe Sandboxed Social Auth**: Because real popups are often blocked by sandboxed browser iframe constraints, we implemented a custom **"Sandbox Quick Auth"** panel. It simulates authentic social logins with Google or Apple, creating persistent database user profiles in Firestore instantly for frictionless, zero-credential testing.
- **Contextual Prompts**: To keep the interface clean, the app never forces sign-ins for general search and directory browsing. It only prompts for sign-in when a user clicks to buy a ticket, join a waitlist, or create an event.

### 4. Full-Stack Gemini AI Creator Co-Pilot (`server.ts`)
We created a custom Express backend `/server.ts` that implements a high-thinking AI co-pilot:
- **Advanced Model Selection**: We integrated Google’s `gemini-3.1-pro-preview` model on the server.
- **Thinking Mode (Reasoning)**: We set the thinking level to `ThinkingLevel.HIGH` to evaluate venue capacities, music themes, and draft custom-themed ticket tiers and specialized vocabulary pools.
- **Strict JSON Schema**: We configured the model to return structured data matching the Firestore schema. When an organizer inputs a quick prompt (e.g., "modular electronic performance in a forest dome"), the AI generates the official title, Spotify-style description, price-optimized tiers, and specialized words to scramble!

---

## 🗄️ Database Schema Design (Firestore)

### `/users` Collection
Tracks registered users, organizers, and sub-bouncers.
```json
{
  "uid": "sandbox-user-google-105",
  "name": "Guest Google Fan",
  "email": "sandbox.google.105@gmail.com",
  "photoURL": "https://api.dicebear.com/7.x/pixel-art/svg?seed=user105",
  "role": "organizer",
  "createdAt": 1783296000000
}
```

### `/events` Collection
Holds live, upcoming, and past event metadata, ticket tiers, and authorized staff.
```json
{
  "id": "evt-solomun",
  "title": "Solomun Open Air [Mirage Extended]",
  "description": "An all-night 5-hour journey through melodic house and deep techno...",
  "date": "2026-07-25",
  "time": "22:00",
  "locationId": "loc-mirage",
  "locationName": "The Brooklyn Mirage",
  "image": "https://images.unsplash.com/...",
  "hostId": "sandbox-user-google-105",
  "hostName": "Guest Google Fan",
  "tiers": [
    { "name": "Early Bird", "price": 45, "limit": 100, "sold": 100, "description": "Entry before 11 PM" },
    { "name": "General Admission", "price": 65, "limit": 300, "sold": 180, "description": "Standard Entry Tier" }
  ],
  "capacity": 450,
  "soldCount": 295,
  "status": "upcoming",
  "bouncers": ["bouncer-uid-123"],
  "scrambledWordPool": ["TEMPO", "SYNTH", "GROOVE", "BEAT"]
}
```

### `/tickets` Collection
The core synchronization documents mapped directly between buyers and bouncers.
```json
{
  "id": "TKT-384910",
  "eventId": "evt-solomun",
  "eventTitle": "Solomun Open Air [Mirage Extended]",
  "eventDate": "2026-07-25",
  "eventLocation": "The Brooklyn Mirage",
  "buyerId": "user-uid-456",
  "buyerName": "Alice Vance",
  "buyerEmail": "alice@sync.fm",
  "tier": "General Admission",
  "price": 65,
  "peopleCount": 4,
  "securityCode": "EMPOT-EBIV-VOORGE-742",
  "qrCodeData": "TICKETPULSE_SECURE_SYNC_TKT-384910_CODE_EMPOT-EBIV-VOORGE-742",
  "status": "active",
  "createdAt": 1783296055000
}
```

### `/invitations` Collection
Hosts bouncer link-invites used to authorize external mobile scanner devices.
```json
{
  "id": "BNC-9428",
  "eventId": "evt-solomun",
  "eventTitle": "Solomun Open Air [Mirage Extended]",
  "hostName": "Guest Google Fan",
  "status": "pending",
  "createdAt": 1783296010000
}
```

---

## ⚡ Quick Start & Verification

1. **Auto-Seeding**: Upon first launch, the app automatically seeds popular music venues (e.g., *Red Rocks*, *Brooklyn Mirage*, *Fabric London*, *Berghain*) and curated shows.
2. **Browsing**: You can instantly browse the Spotify bento grids and perform real-time searches across acting events, holder profiles, or popular bento venue tags.
3. **Simulated Scan / Testing**: 
   - Buy a ticket (from the detail screen, selecting expected group size and tier).
   - In your **Organizer Studio**, select the live event and open the **Bouncer Terminal**.
   - Under **Sandbox Quick-Test Sim**, click on your purchased ticket. The terminal instantly triggers an automatic QR check-in, verifies the scrambled-word key, admits the exact guest count, and flags the ticket as **USED** on all synced tabs!
