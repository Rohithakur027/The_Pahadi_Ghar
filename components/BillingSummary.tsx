'use client';

import { useState } from 'react';
import { Room } from '@/types';
import { calculateTotal } from '@/context/HomestayContext';
import { CheckCircle, AlertCircle, Clock, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';

interface BillingSummaryProps {
  room: Room;
  onRecordPayment: (amount: number) => void;
}

function formatINR(n: number) {
  return new Intl.NumberFormat('en-IN').format(n);
}

const STATUS_CONFIG = {
  paid: { label: 'Paid', icon: CheckCircle, bg: 'rgba(62,107,71,0.12)', color: '#3E6B47', borderColor: 'rgba(62,107,71,0.25)' },
  partial: { label: 'Partially Paid', icon: Clock, bg: 'rgba(212,135,58,0.12)', color: '#A36520', borderColor: 'rgba(212,135,58,0.3)' },
  unpaid: { label: 'Unpaid', icon: AlertCircle, bg: 'rgba(192,83,58,0.1)', color: '#C0533A', borderColor: 'rgba(192,83,58,0.25)' },
};

export default function BillingSummary({ room, onRecordPayment }: BillingSummaryProps) {
  const [payAmount, setPayAmount] = useState('');
  const [showPayInput, setShowPayInput] = useState(false);

  const total = calculateTotal(room);
  const balance = Math.max(0, total - room.amountPaid);

  const nights = room.checkInDate && room.checkOutDate
    ? Math.max(1, Math.ceil(
        (new Date(room.checkOutDate).getTime() - new Date(room.checkInDate).getTime()) / (1000 * 60 * 60 * 24)
      ))
    : 0;
  const roomCharge = nights * room.nightlyRate;
  const itemsTotal = room.items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);

  const statusConf = STATUS_CONFIG[room.paymentStatus];
  const StatusIcon = statusConf.icon;

  const handlePay = () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > balance) {
      toast.error(`Amount exceeds balance of ₹${formatINR(balance)}`);
      return;
    }
    onRecordPayment(amount);
    setPayAmount('');
    setShowPayInput(false);
    toast.success(`₹${formatINR(amount)} recorded!`);
  };

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit"
        style={{ background: statusConf.bg, border: `1px solid ${statusConf.borderColor}` }}
      >
        <StatusIcon size={15} style={{ color: statusConf.color }} />
        <span className="text-sm font-semibold" style={{ color: statusConf.color }}>
          {statusConf.label}
        </span>
      </div>

      {/* Breakdown Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(28,58,42,0.1)', background: '#FFFDF9' }}
      >
        {/* Room charge */}
        <div className="flex justify-between items-center px-4 py-3.5 border-b" style={{ borderColor: 'rgba(28,58,42,0.06)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>Room Charges</p>
            {nights > 0 && (
              <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
                {nights} night{nights !== 1 ? 's' : ''} × ₹{formatINR(room.nightlyRate)}
              </p>
            )}
          </div>
          <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
            ₹{formatINR(roomCharge)}
          </span>
        </div>

        {/* Items */}
        <div className="flex justify-between items-center px-4 py-3.5 border-b" style={{ borderColor: 'rgba(28,58,42,0.06)' }}>
          <div>
            <p className="text-sm font-medium" style={{ color: '#1A1A1A' }}>Items & Services</p>
            <p className="text-xs mt-0.5" style={{ color: '#7A7A6E' }}>
              {room.items.length} item{room.items.length !== 1 ? 's' : ''}
            </p>
          </div>
          <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
            ₹{formatINR(itemsTotal)}
          </span>
        </div>

        {/* Total */}
        <div
          className="flex justify-between items-center px-4 py-4"
          style={{ background: 'rgba(28,58,42,0.03)' }}
        >
          <span className="text-base font-bold" style={{ fontFamily: 'var(--font-playfair)' }}>Total Due</span>
          <span className="text-xl font-bold" style={{ color: '#1C3A2A', fontFamily: 'var(--font-playfair)' }}>
            ₹{formatINR(total)}
          </span>
        </div>
      </div>

      {/* Paid / Balance */}
      {room.amountPaid > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(62,107,71,0.1)', border: '1px solid rgba(62,107,71,0.2)' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#7A7A6E' }}>Amount Paid</p>
            <p className="text-base font-bold" style={{ color: '#3E6B47' }}>₹{formatINR(room.amountPaid)}</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: balance > 0 ? 'rgba(192,83,58,0.08)' : 'rgba(62,107,71,0.08)', border: `1px solid ${balance > 0 ? 'rgba(192,83,58,0.2)' : 'rgba(62,107,71,0.2)'}` }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#7A7A6E' }}>Balance</p>
            <p className="text-base font-bold" style={{ color: balance > 0 ? '#C0533A' : '#3E6B47' }}>
              {balance > 0 ? `₹${formatINR(balance)}` : 'Settled'}
            </p>
          </div>
        </div>
      )}

      {/* Payment Input */}
      {room.status === 'occupied' && room.paymentStatus !== 'paid' && (
        <div>
          {!showPayInput ? (
            <button
              onClick={() => setShowPayInput(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
            >
              <IndianRupee size={17} />
              Record Payment
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#7A7A6E' }}>₹</span>
                  <input
                    type="number"
                    placeholder={`Max ${formatINR(balance)}`}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-warmamber/40 focus:border-warmamber bg-white"
                    style={{ borderColor: 'rgba(28,58,42,0.2)' }}
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => setPayAmount(balance.toString())}
                  className="px-3 py-3 rounded-xl text-xs font-semibold"
                  style={{ background: 'rgba(212,135,58,0.12)', color: '#A36520', border: '1px solid rgba(212,135,58,0.25)' }}
                >
                  Full
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowPayInput(false); setPayAmount(''); }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                  style={{ background: 'rgba(28,58,42,0.06)', color: '#7A7A6E' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePay}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
                >
                  Confirm ₹{payAmount ? formatINR(parseFloat(payAmount) || 0) : '—'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
