import { useState } from 'react';
import { 
  X, Calendar, Clock, MapPin, User, Ticket as TicketIcon, 
  Users, CreditCard, ChevronRight, CheckCircle, Download, ArrowRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc, setDoc, getDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { EventDetails, Ticket, UserProfile } from '../types';
import { generateScrambledSecurityCode } from '../seed';

interface EventDetailModalProps {
  event: EventDetails;
  currentUser: UserProfile | null;
  onClose: () => void;
  onPurchaseComplete: (ticket: Ticket) => void;
  onOpenLogin: () => void;
}

export default function EventDetailModal({ 
  event, 
  currentUser, 
  onClose, 
  onPurchaseComplete,
  onOpenLogin
}: EventDetailModalProps) {
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const [peopleCount, setPeopleCount] = useState(1);
  const [purchaseStep, setPurchaseStep] = useState<'details' | 'payment' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'gpay' | 'apple'>('card');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState<Ticket | null>(null);

  const selectedTier = event.tiers[selectedTierIdx] || event.tiers[0];
  const totalPrice = selectedTier.price * peopleCount;
  const isSoldOut = selectedTier.sold >= selectedTier.limit;

  const handlePurchaseClick = () => {
    if (!currentUser) {
      // Not logged in: only ask to create account when wanting to buy
      onOpenLogin();
    } else {
      setPurchaseStep('payment');
    }
  };

  const handleConfirmPayment = async () => {
    if (!currentUser) return;
    setProcessingPayment(true);

    try {
      // Simulate slight network delay for secure payments processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      const scrambledCode = generateScrambledSecurityCode();
      const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

      const newTicket: Ticket = {
        id: ticketId,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventLocation: event.locationName,
        eventImage: event.image,
        buyerId: currentUser.uid,
        buyerName: currentUser.name,
        buyerEmail: currentUser.email,
        tier: selectedTier.name,
        price: selectedTier.price,
        peopleCount: peopleCount,
        securityCode: scrambledCode,
        qrCodeData: `TICKETPULSE_SECURE_SYNC_${ticketId}_CODE_${scrambledCode}`,
        status: 'active',
        createdAt: Date.now()
      };

      // 1. Save ticket to Firestore
      await setDoc(doc(db, 'tickets', ticketId), newTicket);

      // 2. Increment sold numbers for this event tier in Firestore
      const eventRef = doc(db, 'events', event.id);
      const eventSnap = await getDoc(eventRef);
      if (eventSnap.exists()) {
        const currentEvent = eventSnap.data() as EventDetails;
        const updatedTiers = currentEvent.tiers.map((t) => {
          if (t.name === selectedTier.name) {
            return { ...t, sold: Math.min(t.limit, t.sold + 1) }; // update sold count
          }
          return t;
        });

        await updateDoc(eventRef, {
          tiers: updatedTiers,
          soldCount: currentEvent.soldCount + 1
        });
      }

      setGeneratedTicket(newTicket);
      setPurchaseStep('success');
    } catch (err) {
      console.error('Error generating ticket purchase: ', err);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleDone = () => {
    if (generatedTicket) {
      onPurchaseComplete(generatedTicket);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#181818] border border-[#282828] rounded-xl overflow-hidden max-w-2xl w-full text-white shadow-2xl relative"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-gray-300 hover:text-white z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {purchaseStep === 'details' && (
          <div className="flex flex-col">
            {/* Header / Hero */}
            <div className="h-64 relative overflow-hidden">
              <img 
                src={event.image} 
                alt={event.title} 
                className="w-full h-full object-cover brightness-75" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent" />
              <div className="absolute bottom-6 left-6 pr-12">
                <span className="bg-[#1DB954] text-black font-extrabold text-[10px] uppercase px-2 py-0.5 rounded tracking-wider">
                  {event.status === 'running' ? 'Happening Now' : 'Featured Event'}
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">{event.title}</h2>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[60vh] overflow-y-auto">
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1">Host Organizer</h3>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold">{event.hostName}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-2">Schedule & Location</h3>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#1DB954]" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-400" />
                      <span>{event.locationName}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-1">About the Event</h3>
                  <p className="text-sm text-gray-300 leading-relaxed font-sans">{event.description}</p>
                </div>
              </div>

              {/* Purchase / Tier Selector (Right Side) */}
              <div className="md:col-span-5 bg-[#202020] p-4 rounded-lg border border-[#2b2b2b] flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-3">Chose Ticket Tier</h3>
                  <div className="space-y-2 mb-4">
                    {event.tiers.map((tier, idx) => (
                      <div 
                        key={tier.name}
                        onClick={() => setSelectedTierIdx(idx)}
                        className={`p-3 rounded border text-left cursor-pointer transition-all ${
                          selectedTierIdx === idx 
                            ? 'bg-[#282828] border-[#1DB954]' 
                            : 'bg-[#181818] border-transparent hover:bg-[#282828]/50'
                        }`}
                      >
                        <div className="flex justify-between font-bold text-sm">
                          <span>{tier.name}</span>
                          <span className="text-[#1DB954]">${tier.price}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                          <span>{tier.description || 'Standard entry benefits'}</span>
                          <span>{tier.limit - tier.sold} Left</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Choose Number of People Expected */}
                  <div className="mb-4">
                    <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase mb-2 flex justify-between">
                      <span>Expected Group Size</span>
                      <span className="text-[#1DB954] font-mono">{peopleCount} {peopleCount === 1 ? 'Guest' : 'Guests'}</span>
                    </h3>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setPeopleCount(prev => Math.max(1, prev - 1))}
                        className="bg-[#282828] text-white w-8 h-8 rounded hover:bg-[#333] font-bold text-sm"
                      >
                        -
                      </button>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={peopleCount}
                        onChange={(e) => setPeopleCount(parseInt(e.target.value))}
                        className="flex-1 accent-[#1DB954] h-1 bg-[#404040] rounded-lg cursor-pointer"
                      />
                      <button 
                        onClick={() => setPeopleCount(prev => Math.min(10, prev + 1))}
                        className="bg-[#282828] text-white w-8 h-8 rounded hover:bg-[#333] font-bold text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#2b2b2b] pt-3 mt-2">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-400">Total Price:</span>
                    <span className="font-bold text-xl text-white">${totalPrice}</span>
                  </div>

                  <button
                    disabled={isSoldOut}
                    onClick={handlePurchaseClick}
                    className="w-full bg-[#1DB954] text-black hover:bg-[#1ed760] font-extrabold py-3 rounded-full transition-transform active:scale-95 disabled:bg-gray-700 disabled:text-gray-400 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <TicketIcon className="w-5 h-5 fill-current" />
                    <span>{isSoldOut ? 'Sold Out' : 'Get Tickets'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {purchaseStep === 'payment' && (
          <div className="p-8">
            <h2 className="text-2xl font-black mb-1">Payment Procedures</h2>
            <p className="text-sm text-gray-400 mb-6">Complete simulated payment authorization via our secure ticketing gateway.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Cost breakdown */}
              <div className="bg-[#202020] p-5 rounded-lg border border-[#2b2b2b] space-y-4">
                <h3 className="font-bold text-sm tracking-widest text-gray-400 uppercase">Cart Review</h3>
                <div>
                  <div className="text-lg font-bold">{event.title}</div>
                  <div className="text-xs text-gray-400">{event.locationName} | {event.date}</div>
                </div>
                
                <div className="border-t border-[#2b2b2b] pt-3 space-y-2 text-sm text-gray-300">
                  <div className="flex justify-between">
                    <span>{selectedTier.name} ({peopleCount}x)</span>
                    <span>${selectedTier.price * peopleCount}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Service Sync Fee</span>
                    <span>$0.00</span>
                  </div>
                  <div className="flex justify-between border-t border-[#2b2b2b] pt-2 font-bold text-white text-lg">
                    <span>Total Due</span>
                    <span className="text-[#1DB954]">${totalPrice}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Simulated Payment options */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm tracking-widest text-gray-400 uppercase">Select Payment Method</h3>
                
                <div className="space-y-2">
                  <label className={`flex items-center justify-between p-4 rounded border cursor-pointer transition-colors ${
                    paymentMethod === 'card' ? 'bg-[#282828] border-[#1DB954]' : 'bg-[#202020] border-transparent hover:bg-[#282828]/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-gray-300" />
                      <span className="text-sm font-semibold">Credit/Debit Card</span>
                    </div>
                    <input 
                      type="radio" 
                      name="payment" 
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="accent-[#1DB954]"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-4 rounded border cursor-pointer transition-colors ${
                    paymentMethod === 'gpay' ? 'bg-[#282828] border-[#1DB954]' : 'bg-[#202020] border-transparent hover:bg-[#282828]/50'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="font-bold tracking-tight text-white">Google Pay</span>
                    </div>
                    <input 
                      type="radio" 
                      name="payment" 
                      checked={paymentMethod === 'gpay'}
                      onChange={() => setPaymentMethod('gpay')}
                      className="accent-[#1DB954]"
                    />
                  </label>
                </div>

                <div className="pt-6">
                  <button
                    onClick={handleConfirmPayment}
                    disabled={processingPayment}
                    className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-extrabold py-3.5 rounded-full tracking-wide transition-all active:scale-95 disabled:bg-gray-700 disabled:text-gray-400 disabled:scale-100 flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {processingPayment ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Verifying Security Sync...</span>
                      </div>
                    ) : (
                      <>
                        <span>Authorize & Confirm Payment</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setPurchaseStep('details')}
                    className="w-full text-center text-xs text-gray-400 hover:text-white mt-3 hover:underline cursor-pointer"
                  >
                    Back to Selection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {purchaseStep === 'success' && generatedTicket && (
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
            </div>
            
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">Order Confirmed!</h2>
            <p className="text-gray-400 text-sm max-w-md mb-6 leading-relaxed">
              Ticket sync successful! Your admission passes have been securely registered to the decentralised checker nodes using scrambled check keys.
            </p>

            <div className="bg-[#202020] p-6 rounded-lg border border-[#2b2b2b] max-w-sm w-full mb-6 text-left space-y-3 font-mono text-xs text-gray-300">
              <div className="flex justify-between border-b border-[#282828] pb-2 text-white font-bold text-sm">
                <span>ORDER SERIAL</span>
                <span className="text-[#1DB954]">{generatedTicket.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Pass Type:</span>
                <span className="text-white font-semibold">{generatedTicket.tier.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Expected:</span>
                <span className="text-white font-semibold">ADMIT {generatedTicket.peopleCount} GUEST(S)</span>
              </div>
              <div className="flex justify-between">
                <span>Scrambled Key:</span>
                <span className="text-white font-semibold">{generatedTicket.securityCode.split('-')[0]}...</span>
              </div>
            </div>

            <button
              onClick={handleDone}
              className="bg-white hover:bg-gray-100 text-black font-extrabold px-8 py-3 rounded-full cursor-pointer transition-transform hover:scale-105"
            >
              Go to Your Library
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
