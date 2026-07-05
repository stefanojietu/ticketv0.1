import { useState, useEffect } from 'react';
import { 
  QrCode, Scan, ShieldCheck, AlertTriangle, CheckCircle, 
  UserPlus, Copy, Check, Users, ArrowLeft, RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  addDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Ticket, EventDetails, UserProfile } from '../types';

interface VerifyPortalProps {
  event: EventDetails;
  currentUser: UserProfile;
  onBack: () => void;
}

export default function VerifyPortal({ event, currentUser, onBack }: VerifyPortalProps) {
  const [ticketCodeInput, setTicketCodeInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'duplicate' | 'invalid' | 'idle';
    ticket?: Ticket;
    message?: string;
  }>({ status: 'idle' });

  const [inviteCode, setInviteCode] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [activeBouncersCount, setActiveBouncersCount] = useState(1);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [scannedHistory, setScannedHistory] = useState<Ticket[]>([]);

  // 1. Subscribe to all tickets for this event in real-time to track status changes across bouncers
  useEffect(() => {
    const q = query(collection(db, 'tickets'), where('eventId', '==', event.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsList: Ticket[] = [];
      snapshot.forEach((doc) => {
        ticketsList.push(doc.data() as Ticket);
      });
      setAllTickets(ticketsList);
      
      // Filter scanned history (sorted by scannedAt desc)
      const scanned = ticketsList
        .filter(t => t.status === 'used' && t.scannedAt)
        .sort((a, b) => (b.scannedAt || 0) - (a.scannedAt || 0));
      setScannedHistory(scanned);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tickets');
    });

    return () => unsubscribe();
  }, [event.id]);

  // 2. Real-time active bouncer/helper sync counts
  useEffect(() => {
    // We can simulate active bouncers or query uids on event bouncer list
    setActiveBouncersCount(1 + (event.bouncers?.length || 0));
  }, [event]);

  // 3. Handle invitation generation
  const handleGenerateInvite = async () => {
    if (inviteCode) return;
    const shortCode = `BNC-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await addDoc(collection(db, 'invitations'), {
        id: shortCode,
        eventId: event.id,
        eventTitle: event.title,
        hostName: event.hostName || currentUser.name,
        status: 'pending',
        createdAt: Date.now()
      });
      setInviteCode(shortCode);
    } catch (err) {
      console.error('Error creating bouncer invite: ', err);
      setInviteCode(shortCode); // fallback set
    }
  };

  const copyToClipboard = () => {
    const inviteUrl = `${window.location.origin}?invite=${inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  // 4. Ticket Verification Logic
  const handleVerifyTicket = async (codeOrId: string) => {
    const cleanCode = codeOrId.trim();
    if (!cleanCode) return;

    setScanResult({ status: 'idle' });

    // Find ticket by direct ID or security scrambled check code
    const foundTicket = allTickets.find(
      t => t.id === cleanCode || t.securityCode.toUpperCase() === cleanCode.toUpperCase()
    );

    if (!foundTicket) {
      setScanResult({
        status: 'invalid',
        message: `Ticket code "${cleanCode}" not found. Verify spelling or check date.`
      });
      return;
    }

    if (foundTicket.status === 'used') {
      setScanResult({
        status: 'duplicate',
        ticket: foundTicket,
        message: `ALREADY SCANNED at ${new Date(foundTicket.scannedAt || 0).toLocaleTimeString()} by ${foundTicket.scannedByName || 'another bouncer'}`
      });
      return;
    }

    // Success check-in: Update ticket status in Firestore
    try {
      const ticketRef = doc(db, 'tickets', foundTicket.id);
      const updateData = {
        status: 'used',
        scannedAt: Date.now(),
        scannedBy: currentUser.uid,
        scannedByName: currentUser.name
      };
      
      await updateDoc(ticketRef, updateData);

      setScanResult({
        status: 'success',
        ticket: { ...foundTicket, ...updateData },
        message: `Access GRANTED for ${foundTicket.peopleCount} ${foundTicket.peopleCount === 1 ? 'Guest' : 'Guests'}.`
      });
      
      setTicketCodeInput('');
    } catch (err: any) {
      console.error('Error during ticket checkin:', err);
      setScanResult({
        status: 'invalid',
        message: 'Database sync failure. Try scanning again.'
      });
    }
  };

  // Quick helper to simulate camera file drop scanning
  const handleSimulateFileScan = (ticket: Ticket) => {
    handleVerifyTicket(ticket.securityCode);
  };

  return (
    <div className="bg-[#121212] min-h-screen text-white pb-32">
      {/* Top Banner */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Organizer Space</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#181818] p-6 rounded-lg border border-[#282828] mb-8 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-[#1DB954] text-xs font-bold tracking-wider uppercase mb-1">
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
              <span>LIVE CHECKER TERMINAL</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{event.title}</h1>
            <p className="text-gray-400 text-sm mt-1">{event.locationName} | {event.date} @ {event.time}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#282828] px-4 py-2 rounded-full flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1DB954]" />
              <span className="text-xs font-medium text-gray-300">
                {activeBouncersCount} Sync Devices
              </span>
            </div>
            <div className="bg-[#282828] px-4 py-2 rounded-full flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-gray-300">
                {scannedHistory.length} / {allTickets.length} Checked
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Verification Input and Camera Simulator */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            {/* Ticket Scanning Input Card */}
            <div className="bg-[#181818] p-6 rounded-lg border border-[#282828] shadow-md">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#1DB954]" />
                <span>Verify Ticket</span>
              </h2>

              <p className="text-xs text-gray-400 mb-4">
                Type the scrambled words check code, paste the full string, or choose a ticket from the sandbox quick-simulation list below.
              </p>

              <div className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  value={ticketCodeInput}
                  onChange={(e) => setTicketCodeInput(e.target.value)}
                  placeholder="e.g. OMPET-EBIV-CHEO-482"
                  className="flex-1 bg-[#282828] text-white px-4 py-3 rounded-md border border-[#3e3e3e] focus:outline-none focus:border-[#1DB954] font-mono text-sm uppercase tracking-wider"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyTicket(ticketCodeInput)}
                />
                <button 
                  onClick={() => handleVerifyTicket(ticketCodeInput)}
                  className="bg-[#1DB954] text-black px-6 py-3 rounded-md font-bold hover:bg-[#1ed760] transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Scan className="w-4 h-4" />
                  <span>Scan</span>
                </button>
              </div>

              {/* Real-time Verification Outcome Animations */}
              <AnimatePresence mode="wait">
                {scanResult.status !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-5 rounded-lg border flex gap-4 ${
                      scanResult.status === 'success' 
                        ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100' 
                        : scanResult.status === 'duplicate'
                        ? 'bg-amber-950/40 border-amber-500/30 text-amber-100'
                        : 'bg-red-950/40 border-red-500/30 text-red-100'
                    }`}
                  >
                    <div className="mt-1">
                      {scanResult.status === 'success' && <CheckCircle className="w-8 h-8 text-emerald-400" />}
                      {scanResult.status === 'duplicate' && <AlertTriangle className="w-8 h-8 text-amber-400" />}
                      {scanResult.status === 'invalid' && <AlertTriangle className="w-8 h-8 text-red-500" />}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="font-extrabold text-lg tracking-wide uppercase">
                        {scanResult.status === 'success' && 'ACCESS GRANTED'}
                        {scanResult.status === 'duplicate' && 'DUPLICATE TICKET WARNING'}
                        {scanResult.status === 'invalid' && 'INVALID TICKET'}
                      </h3>
                      <p className="text-sm mt-1">{scanResult.message}</p>

                      {scanResult.ticket && (
                        <div className="mt-4 bg-[#121212]/80 p-3 rounded border border-[#282828] font-mono text-xs text-gray-300">
                          <div className="grid grid-cols-2 gap-y-1">
                            <div>Attendee:</div> <div className="text-white font-semibold">{scanResult.ticket.buyerName}</div>
                            <div>Tier:</div> <div className="text-[#1DB954] font-bold">{scanResult.ticket.tier}</div>
                            <div>Capacity/Admit:</div> <div className="text-white font-semibold">ADMIT {scanResult.ticket.peopleCount} GUEST(S)</div>
                            <div>Check Code:</div> <div className="text-white truncate">{scanResult.ticket.securityCode}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick-test Bouncer Simulator Selector */}
            <div className="bg-[#181818] p-6 rounded-lg border border-[#282828]">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-bold text-gray-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#1DB954]" />
                  <span>Sandbox Quick-Test Sim (Auto-scans)</span>
                </h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Click any purchased ticket below to simulate scanning its QR code on a second device. Instantly updates the list across all synced portals.
              </p>

              {allTickets.length === 0 ? (
                <div className="bg-[#121212] p-4 text-center rounded text-gray-500 text-xs">
                  No tickets have been purchased for this event yet. Buy a ticket first to simulate check-ins!
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
                  {allTickets.map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => handleSimulateFileScan(t)}
                      className={`flex justify-between items-center p-3 rounded-md text-xs font-mono border cursor-pointer hover:bg-white/5 transition-colors ${
                        t.status === 'used' 
                          ? 'bg-red-950/10 border-red-500/20 text-red-300 line-through' 
                          : 'bg-[#282828] border-transparent text-gray-200'
                      }`}
                    >
                      <div className="truncate pr-4">
                        <span className="font-bold text-[#1DB954] mr-2">[{t.tier}]</span>
                        {t.buyerName} ({t.peopleCount} {t.peopleCount === 1 ? 'guest' : 'guests'})
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 uppercase">{t.securityCode.split('-')[0]}...</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          t.status === 'used' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                        }`}>
                          {t.status === 'used' ? 'USED' : 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Active Scans Log & Invite Section */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            {/* Bouncer Invitation Board */}
            <div className="bg-[#181818] p-6 rounded-lg border border-[#282828]">
              <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#1DB954]" />
                <span>Invite a Bouncer</span>
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                Generate a secure access link to authorize sub-bouncers. Opening this link automatically unlocks ticket scanner capabilities on their device.
              </p>

              {!inviteCode ? (
                <button
                  onClick={handleGenerateInvite}
                  className="w-full bg-[#282828] hover:bg-[#333] border border-[#3e3e3e] text-white py-3 rounded-md font-bold transition-colors cursor-pointer text-sm"
                >
                  Generate Invitation Code
                </button>
              ) : (
                <div className="bg-[#121212] p-4 rounded border border-[#282828]">
                  <div className="text-xs text-gray-500 mb-1 font-semibold uppercase">ACTIVE CO-BOUNCER CODE</div>
                  <div className="text-xl font-mono text-[#1DB954] tracking-widest font-extrabold mb-3 select-all">
                    {inviteCode}
                  </div>
                  <div className="text-[10px] text-gray-400 mb-3">
                    Copy the link below and send to any team member's browser:
                  </div>
                  <div className="flex gap-1">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}?invite=${inviteCode}`}
                      className="flex-1 bg-[#282828] text-gray-300 text-xs px-2 py-2 rounded-l border border-[#3e3e3e] overflow-hidden focus:outline-none"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="bg-[#282828] hover:bg-[#383838] border-y border-r border-[#3e3e3e] px-3 rounded-r text-gray-300"
                    >
                      {copiedInvite ? <Check className="w-4 h-4 text-[#1DB954]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sync History Logs */}
            <div className="bg-[#181818] p-6 rounded-lg border border-[#282828] flex-1 min-h-[300px] flex flex-col">
              <h2 className="text-lg font-bold mb-4 flex justify-between items-center">
                <span>Recent Sync Scans</span>
                <span className="text-[10px] text-[#1DB954] font-mono tracking-wider animate-pulse uppercase">● ONLINE</span>
              </h2>

              {scannedHistory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500">
                  <QrCode className="w-8 h-8 mb-2 opacity-35" />
                  <span className="text-xs">No entries validated yet during this session. Ready for scanning.</span>
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2">
                  {scannedHistory.map((hTicket) => (
                    <div 
                      key={hTicket.id}
                      className="p-3 bg-[#121212] rounded border border-[#232323] text-xs flex justify-between items-center font-mono"
                    >
                      <div>
                        <div className="text-white font-bold">{hTicket.buyerName}</div>
                        <div className="text-gray-400 mt-0.5">Admit {hTicket.peopleCount} G | Tier: {hTicket.tier}</div>
                        <div className="text-gray-500 text-[10px] mt-1 flex items-center gap-1">
                          <span>By: {hTicket.scannedByName || 'Owner'}</span>
                          <span>•</span>
                          <span>{new Date(hTicket.scannedAt || Date.now()).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      
                      <div className="text-emerald-400 flex items-center gap-1 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full text-[10px]">
                        <CheckCircle className="w-3 h-3" />
                        <span>IN</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
