import { Ticket } from '../types';

export function drawTicketToCanvas(
  canvas: HTMLCanvasElement,
  ticket: Ticket,
  onComplete: (dataUrl: string) => void
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set high resolution for print-ready quality
  canvas.width = 600;
  canvas.height = 800;

  // Load the QR code image and draw the full ticket
  const qrImage = new Image();
  qrImage.crossOrigin = 'anonymous'; // Prevent CORS taint
  
  // Use a stable, high-performance QR code API
  const qrSize = 250;
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(ticket.qrCodeData)}`;

  qrImage.onload = () => {
    // 1. Background (Spotify Dark Theme)
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, 600, 800);

    // Decorative gradient accent
    const gradient = ctx.createLinearGradient(0, 0, 600, 200);
    gradient.addColorStop(0, '#1DB954'); // Spotify Green
    gradient.addColorStop(1, '#191414');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(0, 0, 600, 800);
    ctx.globalAlpha = 1.0;

    // Glowing Green Inner Border
    ctx.strokeStyle = '#1DB954';
    ctx.lineWidth = 4;
    ctx.strokeRect(15, 15, 570, 770);

    // 2. Ticket Header
    ctx.fillStyle = '#1DB954';
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillText('OFFICIAL ENTRY TICKET', 50, 60);

    ctx.fillStyle = '#888888';
    ctx.font = '12px "Inter", sans-serif';
    ctx.fillText('TICKETPULSE DIGITAL MULTI-SYNC', 50, 80);

    // Cutout dashes separator
    ctx.strokeStyle = '#282828';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(30, 110);
    ctx.lineTo(570, 110);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 3. Event Details
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px "Inter", sans-serif';
    // Wrap text if event title is long
    const title = ticket.eventTitle;
    if (title.length > 30) {
      ctx.fillText(title.substring(0, 28) + '...', 50, 160);
    } else {
      ctx.fillText(title, 50, 160);
    }

    // Venue details
    ctx.fillStyle = '#888888';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('VENUE', 50, 205);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px "Inter", sans-serif';
    ctx.fillText(ticket.eventLocation, 50, 225);

    // Date & Time
    ctx.fillStyle = '#888888';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('DATE & TIME', 50, 265);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px "Inter", sans-serif';
    ctx.fillText(`${ticket.eventDate} @ ${ticket.eventTime}`, 50, 285);

    // Separator line
    ctx.strokeStyle = '#282828';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(30, 315);
    ctx.lineTo(570, 315);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Attendee Details & Tier
    // Left: Attendee / Right: Tier
    ctx.fillStyle = '#888888';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('ATTENDEE', 50, 355);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillText(ticket.buyerName, 50, 375);

    ctx.fillStyle = '#888888';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('PASS TIER', 350, 355);
    ctx.fillStyle = '#1DB954';
    ctx.font = 'bold 18px "Inter", sans-serif';
    ctx.fillText(ticket.tier.toUpperCase(), 350, 375);

    // Expected People Count (The Ticket count)
    ctx.fillStyle = '#888888';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('EXPECTED GUESTS', 50, 420);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px "Inter", sans-serif';
    ctx.fillText(`ADMIT: ${ticket.peopleCount} ${ticket.peopleCount === 1 ? 'PERSON' : 'PEOPLE'}`, 50, 445);

    // Status Badge
    ctx.fillStyle = '#888888';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('SYNC STATUS', 350, 420);
    ctx.fillStyle = '#1DB954';
    ctx.font = 'bold 14px "Inter", sans-serif';
    ctx.fillText('● REALTIME SYNC ACTIVE', 350, 445);

    // Separator
    ctx.strokeStyle = '#282828';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(30, 480);
    ctx.lineTo(570, 480);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. QR Code Draw (Middle center)
    // Draw white background block for QR code contrast
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(175, 500, 250, 250);
    ctx.drawImage(qrImage, 175, 500, 250, 250);

    // 6. Security Scrambled Words Key (Bottom)
    ctx.fillStyle = '#888888';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SECURITY CHECK CODE (SCRAMBLED WORDS PIN)', 300, 765);
    ctx.fillStyle = '#1DB954';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText(ticket.securityCode, 300, 782);

    // Generate output DataURL for sharing/download
    onComplete(canvas.toDataURL('image/png'));
  };

  qrImage.onerror = (err) => {
    console.error('Error loading QR Code for ticket canvas rendering', err);
    // Draw mock fallback QR visual if network offline
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(175, 500, 250, 250);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Offline QR Code Code:', 200, 600);
    ctx.fillText(ticket.id.substring(0, 10), 200, 630);
    onComplete(canvas.toDataURL('image/png'));
  };
}
