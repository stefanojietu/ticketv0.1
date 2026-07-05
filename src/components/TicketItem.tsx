import React, { useRef, useState } from 'react';
import { 
  Download, QrCode, Calendar, MapPin, CheckCircle, 
  AlertTriangle, Users, Sparkles, RefreshCw, Eye 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket } from '../types';
import { drawTicketToCanvas } from '../utils/ticketCanvas';

interface TicketItemProps {
  ticket: Ticket;
  key?: string | number;
}

export default function TicketItem({ ticket }: TicketItemProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const handleDownload = () => {
    if (!canvasRef.current || downloading) return;
    setDownloading(true);

    // Call our high-fidelity canvas utility to draw the complete printable ticket
    drawTicketToCanvas(canvasRef.current, ticket, (dataUrl) => {
      const link = document.createElement('a');
      link.download = `TicketPulse-${ticket.id}-${ticket.eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
      setDownloading(false);
    });
  };

  return (
    <div className="bg-[#181818] border border-[#282828] hover:border-[#383838] transition-colors rounded-xl overflow-hidden shadow-lg flex flex-col md:flex-row relative">
      
      {/* Hidden canvas for drawing print-ready PNG downloads */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Left: Event Banner & Quick Data */}
      <div className="md:w-1/3 h-48 md:h-auto relative min-h-[160px]">
        <img 
          src={ticket.eventImage || 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&q=80&w=400'} 
          alt={ticket.eventTitle} 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black via-black/40 to-transparent" />
        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-full text-[10px] font-black uppercase text-[#1DB954] flex items-center gap-1">
          <Sparkles className="w-3 h-3 animate-pulse" />
          <span>Sync Pass</span>
        </div>
      </div>

      {/* Right: Ticket Info, Security Words and QR */}
      <div className="p-6 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex justify-between items-start gap-2 mb-1">
            <span className="text-[#1DB954] font-bold text-xs uppercase tracking-wide">
              {ticket.tier} Entry Pass
            </span>
            <div className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              ticket.status === 'used' 
                ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse'
            }`}>
              {ticket.status === 'used' ? '● USED / CHECKED' : '● ACTIVE'}
            </div>
          </div>
          
          <h3 className="text-xl font-extrabold tracking-tight text-white mb-2">{ticket.eventTitle}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1.5 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#1DB954]" />
              <span>{ticket.eventDate} @ {ticket.eventTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-red-400" />
              <span className="truncate max-w-[200px]">{ticket.eventLocation}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-400" />
              <span>Admit Count: <strong className="text-white">{ticket.peopleCount} {ticket.peopleCount === 1 ? 'Guest' : 'Guests'}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px]">
              <span className="text-gray-500">SERIAL ID:</span>
              <span className="text-gray-300">{ticket.id}</span>
            </div>
          </div>
        </div>

        {/* Security Scrambled Words Display */}
        <div className="bg-[#121212] px-4 py-3 rounded-lg border border-[#232323] flex flex-col justify-center">
          <div className="text-[9px] text-gray-500 font-bold tracking-widest uppercase mb-1 font-mono">
            SECURITY CHECK CODE (SCRAMBLED WORDS)
          </div>
          <div className="font-mono text-xs md:text-sm text-[#1DB954] font-extrabold tracking-wider break-all select-all">
            {ticket.securityCode}
          </div>
        </div>

        {/* Buttons / Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#232323]">
          <button
            onClick={() => setShowQRModal(true)}
            className="flex-1 bg-[#282828] hover:bg-[#333] text-white py-2.5 rounded-full font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 text-xs border border-[#3e3e3e]"
          >
            <QrCode className="w-4 h-4 text-[#1DB954]" />
            <span>Show QR Code</span>
          </button>
          
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 bg-white hover:bg-gray-100 text-black py-2.5 rounded-full font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-700 disabled:text-gray-400 disabled:scale-100 flex items-center justify-center gap-2 text-xs cursor-pointer"
          >
            {downloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                <span>Generating PNG...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-black" />
                <span>Download Picture</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* QR Zoom Popover Modal */}
      <AnimatePresence>
        {showQRModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#181818] p-8 rounded-xl border border-[#282828] text-center max-w-sm w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowQRModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-[#1DB954] text-xs font-black tracking-wider uppercase">MOBILE SYNC ENTRY PASS</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider ${
                  ticket.status === 'used' ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400 animate-pulse'
                }`}>
                  {ticket.status === 'used' ? 'USED' : 'ACTIVE'}
                </span>
              </div>
              
              <h4 className="text-lg font-black tracking-tight text-white mb-4 line-clamp-1">{ticket.eventTitle}</h4>

              {/* QR Render block */}
              <div className="bg-white p-4 rounded-lg inline-block mb-4 shadow-xl">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(ticket.qrCodeData)}`} 
                  alt="Entry QR Code" 
                  className="w-56 h-56 mx-auto" 
                />
              </div>

              {/* Scrambled code subline */}
              <div className="bg-[#121212] p-3 rounded border border-[#282828] font-mono text-xs">
                <div className="text-[9px] text-gray-500 uppercase font-semibold mb-1">VALIDATION SECURITY CODE</div>
                <div className="text-[#1DB954] font-extrabold tracking-wider">{ticket.securityCode}</div>
              </div>

              <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">
                Admit count: {ticket.peopleCount} guest(s). Keep code secure. Present at the door for instant multi-device sync validation.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
