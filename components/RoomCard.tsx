'use client';

import Link from 'next/link';
import { Room } from '@/types';
import { calculateTotal } from '@/context/HomestayContext';
import { Users, IndianRupee } from 'lucide-react';

function formatINR(amount: number) {
  return new Intl.NumberFormat('en-IN').format(amount);
}

const ROOM_COLORS: Record<string, string> = {
  'room-gushaini':   '#3E6B47',
  'room-banjar':     '#2563EB',
  'rooftop-gushaini': '#D4873A',
  'rooftop-banjar':  '#1C3A2A',
};

export default function RoomCard({ room }: { room: Room }) {
  const isOccupied = room.status === 'occupied';
  const total = calculateTotal(room);
  const balance = total - room.amountPaid;
  const roomColor = ROOM_COLORS[room.id] || '#1C3A2A';

  return (
    <Link href={`/rooms/${room.id}`}>
      <div
        className="rounded-2xl p-4 cursor-pointer active:scale-95 transition-transform duration-150 relative"
        style={{
          background: isOccupied
            ? 'linear-gradient(135deg, rgba(212,135,58,0.12) 0%, rgba(232,165,90,0.06) 100%)'
            : 'linear-gradient(135deg, rgba(62,107,71,0.1) 0%, rgba(62,107,71,0.04) 100%)',
          border: `1px solid ${isOccupied ? 'rgba(212,135,58,0.3)' : 'rgba(62,107,71,0.25)'}`,
          boxShadow: '0 2px 12px rgba(28,58,42,0.07)',
        }}
      >
        {/* Status badge — pinned top-right */}
        <span
          className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: isOccupied ? 'rgba(212,135,58,0.18)' : 'rgba(62,107,71,0.15)',
            color: isOccupied ? '#A36520' : '#2D5235',
          }}
        >
          {isOccupied ? 'Occupied' : 'Vacant'}
        </span>

        {/* Room color accent bar */}
        <div
          className="w-8 h-1 rounded-full mb-3"
          style={{ background: roomColor }}
        />

        {/* Header */}
        <div className="mb-3 pr-16">
          <span className="text-2xl leading-none">{room.emoji}</span>
          <h3 className="text-base font-semibold mt-1 leading-tight" style={{ color: '#1A1A1A' }}>
            {room.name}
          </h3>
        </div>

        {/* Guest name */}
        {isOccupied && room.guest ? (
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={13} style={{ color: '#7A7A6E' }} />
            <span className="text-sm text-stone-muted truncate" style={{ color: '#7A7A6E' }}>
              {room.guest.fullName}
            </span>
          </div>
        ) : (
          <div className="h-5 mb-2" />
        )}

        {/* Balance */}
        <div className="flex items-center gap-1 mt-1">
          <IndianRupee size={13} style={{ color: isOccupied && balance > 0 ? '#C0533A' : '#7A7A6E' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: isOccupied && balance > 0 ? '#C0533A' : '#7A7A6E' }}
          >
            {isOccupied ? `${formatINR(balance)} due` : 'Available'}
          </span>
        </div>
      </div>
    </Link>
  );
}
