'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Room, Guest, OrderItem, ActivityLog, Payment, PaymentStatus, BlockedBooking, GroupBooking, AadharEntry } from '@/types';

const DATA_VERSION = 'v2';

const INITIAL_ROOMS: Room[] = [
  { id: 'room-gushaini',    name: 'Room (Gushaini)',         emoji: '🏡', status: 'vacant', nightlyRate: 2500, items: [], amountPaid: 0, paymentStatus: 'unpaid' },
  { id: 'room-banjar',      name: 'Room (Banjar)',           emoji: '🌄', status: 'vacant', nightlyRate: 2500, items: [], amountPaid: 0, paymentStatus: 'unpaid' },
  { id: 'rooftop-gushaini', name: 'RooftopCottage (Gushaini)', emoji: '🏔️', status: 'vacant', nightlyRate: 3500, items: [], amountPaid: 0, paymentStatus: 'unpaid' },
  { id: 'rooftop-banjar',   name: 'RooftopCottage (Banjar)',   emoji: '⛺', status: 'vacant', nightlyRate: 3500, items: [], amountPaid: 0, paymentStatus: 'unpaid' },
];

interface HomestayContextType {
  rooms: Room[];
  activityLog: ActivityLog[];
  payments: Payment[];
  blockedBookings: BlockedBooking[];
  groupBookings: GroupBooking[];
  updateRoom: (roomId: string, updates: Partial<Room>) => void;
  addItem: (roomId: string, item: Omit<OrderItem, 'id' | 'addedAt'>) => void;
  removeItem: (roomId: string, itemId: string) => void;
  updateGuest: (roomId: string, guest: Guest) => void;
  recordPayment: (roomId: string, amount: number) => void;
  checkIn: (roomId: string, guest: Guest, checkInDate: string, checkOutDate: string, nightlyRate: number) => void;
  checkOut: (roomId: string) => void;
  getMonthlyRevenue: (year: number, month: number) => number;
  addBlockedBooking: (booking: Omit<BlockedBooking, 'id' | 'createdAt'>) => void;
  cancelBlockedBooking: (bookingId: string) => void;
  checkInFromBlock: (bookingId: string) => { firstRoomId: string; guestName: string; groupBookingId?: string } | null;
  // Group bookings
  createGroupBooking: (data: Omit<GroupBooking, 'id' | 'createdAt' | 'items' | 'aadharCards' | 'amountPaid' | 'paymentStatus' | 'status'>) => string;
  addGroupItem: (bookingId: string, item: Omit<OrderItem, 'id' | 'addedAt'>) => void;
  removeGroupItem: (bookingId: string, itemId: string) => void;
  addGroupAadhar: (bookingId: string, aadhar: Omit<AadharEntry, 'id'>) => void;
  removeGroupAadhar: (bookingId: string, aadharId: string) => void;
  recordGroupPayment: (bookingId: string, amount: number) => void;
  checkOutGroup: (bookingId: string) => void;
}

export function calculateTotal(room: Room): number {
  const nights = room.checkInDate && room.checkOutDate
    ? Math.max(1, Math.ceil((new Date(room.checkOutDate).getTime() - new Date(room.checkInDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  return nights * room.nightlyRate + room.items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
}

export function calculateGroupTotal(booking: GroupBooking): number {
  const roomCharge = Object.entries(booking.roomRates).reduce((sum, [, rate]) => sum + rate * booking.nights, 0);
  const itemsTotal = booking.items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
  return roomCharge + itemsTotal;
}

const HomestayContext = createContext<HomestayContextType | null>(null);

export function HomestayProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [blockedBookings, setBlockedBookings] = useState<BlockedBooking[]>([]);
  const [groupBookings, setGroupBookings] = useState<GroupBooking[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedVersion = localStorage.getItem('homestay_version');
      if (storedVersion !== DATA_VERSION) {
        localStorage.removeItem('homestay_rooms');
        localStorage.removeItem('homestay_activity');
        localStorage.removeItem('homestay_payments');
        localStorage.setItem('homestay_version', DATA_VERSION);
      } else {
        const s = (key: string) => localStorage.getItem(key);
        if (s('homestay_rooms')) setRooms(JSON.parse(s('homestay_rooms')!));
        if (s('homestay_activity')) setActivityLog(JSON.parse(s('homestay_activity')!));
        if (s('homestay_payments')) setPayments(JSON.parse(s('homestay_payments')!));
      }
      const sb = localStorage.getItem('homestay_blocked_bookings');
      if (sb) setBlockedBookings(JSON.parse(sb));
      const sg = localStorage.getItem('homestay_group_bookings');
      if (sg) setGroupBookings(JSON.parse(sg));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => { if (loaded) localStorage.setItem('homestay_rooms', JSON.stringify(rooms)); }, [rooms, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem('homestay_activity', JSON.stringify(activityLog)); }, [activityLog, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem('homestay_payments', JSON.stringify(payments)); }, [payments, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem('homestay_blocked_bookings', JSON.stringify(blockedBookings)); }, [blockedBookings, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem('homestay_group_bookings', JSON.stringify(groupBookings)); }, [groupBookings, loaded]);

  const addActivity = useCallback((message: string, type: ActivityLog['type']) => {
    setActivityLog(prev => [{ id: crypto.randomUUID(), message, timestamp: new Date().toISOString(), type }, ...prev].slice(0, 50));
  }, []);

  const updateRoom = useCallback((roomId: string, updates: Partial<Room>) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...updates } : r));
  }, []);

  const addItem = useCallback((roomId: string, item: Omit<OrderItem, 'id' | 'addedAt'>) => {
    const newItem: OrderItem = { ...item, id: crypto.randomUUID(), addedAt: new Date().toISOString() };
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, items: [...r.items, newItem] } : r));
    addActivity(`Added "${item.name}" to ${rooms.find(r => r.id === roomId)?.name || roomId}`, 'item');
  }, [addActivity, rooms]);

  const removeItem = useCallback((roomId: string, itemId: string) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, items: r.items.filter(i => i.id !== itemId) } : r));
  }, []);

  const updateGuest = useCallback((roomId: string, guest: Guest) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, guest } : r));
    addActivity(`Guest details updated — ${guest.fullName}`, 'guest');
  }, [addActivity]);

  const recordPayment = useCallback((roomId: string, amount: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const newPaid = room.amountPaid + amount;
    const total = calculateTotal(room);
    const status: PaymentStatus = newPaid >= total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, amountPaid: newPaid, paymentStatus: status } : r));
    setPayments(prev => [...prev, { id: crypto.randomUUID(), roomId, roomName: room.name, amount, date: new Date().toISOString() }]);
    addActivity(`₹${amount.toLocaleString('en-IN')} received — ${room.name}`, 'payment');
  }, [rooms, addActivity]);

  const checkIn = useCallback((roomId: string, guest: Guest, checkInDate: string, checkOutDate: string, nightlyRate: number) => {
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: 'occupied', guest, checkInDate, checkOutDate, nightlyRate, amountPaid: 0, paymentStatus: 'unpaid', items: [], groupBookingId: undefined } : r));
    addActivity(`${guest.fullName} checked into ${rooms.find(r => r.id === roomId)?.name || roomId}`, 'checkin');
  }, [addActivity, rooms]);

  const checkOut = useCallback((roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: 'vacant', guest: undefined, checkInDate: undefined, checkOutDate: undefined, items: [], amountPaid: 0, paymentStatus: 'unpaid', groupBookingId: undefined } : r));
    if (room?.guest) addActivity(`${room.guest.fullName} checked out of ${room.name}`, 'checkout');
  }, [rooms, addActivity]);

  const getMonthlyRevenue = useCallback((year: number, month: number) => {
    return payments.filter(p => { const d = new Date(p.date); return d.getFullYear() === year && d.getMonth() === month; }).reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  const addBlockedBooking = useCallback((booking: Omit<BlockedBooking, 'id' | 'createdAt'>) => {
    const newBooking: BlockedBooking = { ...booking, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setBlockedBookings(prev => [newBooking, ...prev]);
    addActivity(`${booking.guestName} advance booked ${booking.roomIds.length} room${booking.roomIds.length > 1 ? 's' : ''} — ${booking.checkInDate}`, 'checkin');
  }, [addActivity]);

  const cancelBlockedBooking = useCallback((bookingId: string) => {
    setBlockedBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
  }, []);

  const checkInFromBlock = useCallback((bookingId: string) => {
    const booking = blockedBookings.find(b => b.id === bookingId);
    if (!booking) return null;

    // Multi-room → create GroupBooking
    if (booking.roomIds.length > 1) {
      const nightlyRate = booking.nights > 0 ? Math.round(booking.totalAmount / booking.nights / booking.roomIds.length) : 2500;
      const roomRates: Record<string, number> = {};
      booking.roomIds.forEach(id => { roomRates[id] = nightlyRate; });
      const gbId = crypto.randomUUID();
      const gb: GroupBooking = {
        id: gbId, roomIds: booking.roomIds, roomRates,
        guestName: booking.guestName, phone: booking.phone,
        adults: booking.adults, children: booking.children,
        checkInDate: booking.checkInDate, checkOutDate: booking.checkOutDate,
        nights: booking.nights, items: [], aadharCards: [],
        amountPaid: booking.advancePaid,
        paymentStatus: booking.advancePaid > 0 ? 'partial' : 'unpaid',
        specialRequests: booking.specialRequests,
        sourceBlockedBookingId: bookingId,
        status: 'active', createdAt: new Date().toISOString(),
      };
      setGroupBookings(prev => [gb, ...prev]);
      setRooms(prev => prev.map(r => booking.roomIds.includes(r.id) ? { ...r, status: 'occupied', checkInDate: booking.checkInDate, checkOutDate: booking.checkOutDate, nightlyRate: roomRates[r.id], amountPaid: 0, paymentStatus: 'unpaid', items: [], groupBookingId: gbId, guest: { id: crypto.randomUUID(), fullName: booking.guestName, phone: booking.phone || '', adults: booking.adults, children: booking.children, idType: 'aadhar', idNumber: 'N/A' } } : r));
      if (booking.advancePaid > 0) {
        setPayments(prev => [...prev, { id: crypto.randomUUID(), roomId: booking.roomIds[0], roomName: rooms.find(r => r.id === booking.roomIds[0])?.name || '', amount: booking.advancePaid, date: new Date().toISOString() }]);
      }
      setBlockedBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'checked_in' } : b));
      addActivity(`${booking.guestName} checked in (group booking — ${booking.roomIds.length} rooms)`, 'checkin');
      return { firstRoomId: booking.roomIds[0], guestName: booking.guestName, groupBookingId: gbId };
    }

    // Single room
    const nightlyRate = booking.nights > 0 ? Math.round(booking.totalAmount / booking.nights) : 2500;
    const guest: Guest = { id: crypto.randomUUID(), fullName: booking.guestName, phone: booking.phone || '', adults: booking.adults, children: booking.children, idType: 'aadhar', idNumber: 'N/A', specialRequests: booking.specialRequests };
    setRooms(prev => prev.map(r => r.id === booking.roomIds[0] ? { ...r, status: 'occupied', guest, checkInDate: booking.checkInDate, checkOutDate: booking.checkOutDate, nightlyRate, amountPaid: booking.advancePaid, paymentStatus: booking.advancePaid > 0 ? 'partial' : 'unpaid', items: [] } : r));
    if (booking.advancePaid > 0) {
      setPayments(prev => [...prev, { id: crypto.randomUUID(), roomId: booking.roomIds[0], roomName: rooms.find(r => r.id === booking.roomIds[0])?.name || '', amount: booking.advancePaid, date: new Date().toISOString() }]);
    }
    setBlockedBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'checked_in' } : b));
    addActivity(`${booking.guestName} checked in from advance booking`, 'checkin');
    return { firstRoomId: booking.roomIds[0], guestName: booking.guestName };
  }, [blockedBookings, rooms, addActivity]);

  // ── Group Booking actions ──

  const createGroupBooking = useCallback((data: Omit<GroupBooking, 'id' | 'createdAt' | 'items' | 'aadharCards' | 'amountPaid' | 'paymentStatus' | 'status'>) => {
    const id = crypto.randomUUID();
    const gb: GroupBooking = { ...data, id, items: [], aadharCards: [], amountPaid: 0, paymentStatus: 'unpaid', status: 'active', createdAt: new Date().toISOString() };
    setGroupBookings(prev => [gb, ...prev]);
    setRooms(prev => prev.map(r => data.roomIds.includes(r.id) ? { ...r, status: 'occupied', checkInDate: data.checkInDate, checkOutDate: data.checkOutDate, nightlyRate: data.roomRates[r.id] || r.nightlyRate, amountPaid: 0, paymentStatus: 'unpaid', items: [], groupBookingId: id, guest: { id: crypto.randomUUID(), fullName: data.guestName, phone: data.phone || '', adults: data.adults, children: data.children, idType: 'aadhar', idNumber: 'N/A' } } : r));
    addActivity(`${data.guestName} checked in — ${data.roomIds.length} room${data.roomIds.length > 1 ? 's' : ''}`, 'checkin');
    return id;
  }, [addActivity]);

  const addGroupItem = useCallback((bookingId: string, item: Omit<OrderItem, 'id' | 'addedAt'>) => {
    const newItem: OrderItem = { ...item, id: crypto.randomUUID(), addedAt: new Date().toISOString() };
    setGroupBookings(prev => prev.map(b => b.id === bookingId ? { ...b, items: [...b.items, newItem] } : b));
  }, []);

  const removeGroupItem = useCallback((bookingId: string, itemId: string) => {
    setGroupBookings(prev => prev.map(b => b.id === bookingId ? { ...b, items: b.items.filter(i => i.id !== itemId) } : b));
  }, []);

  const addGroupAadhar = useCallback((bookingId: string, aadhar: Omit<AadharEntry, 'id'>) => {
    const entry: AadharEntry = { ...aadhar, id: crypto.randomUUID() };
    setGroupBookings(prev => prev.map(b => b.id === bookingId ? { ...b, aadharCards: [...b.aadharCards, entry] } : b));
  }, []);

  const removeGroupAadhar = useCallback((bookingId: string, aadharId: string) => {
    setGroupBookings(prev => prev.map(b => b.id === bookingId ? { ...b, aadharCards: b.aadharCards.filter(a => a.id !== aadharId) } : b));
  }, []);

  const recordGroupPayment = useCallback((bookingId: string, amount: number) => {
    const booking = groupBookings.find(b => b.id === bookingId);
    if (!booking) return;
    const newPaid = booking.amountPaid + amount;
    const total = calculateGroupTotal(booking);
    const status: PaymentStatus = newPaid >= total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    setGroupBookings(prev => prev.map(b => b.id === bookingId ? { ...b, amountPaid: newPaid, paymentStatus: status } : b));
    setPayments(prev => [...prev, { id: crypto.randomUUID(), roomId: booking.roomIds[0], roomName: booking.guestName, amount, date: new Date().toISOString() }]);
    addActivity(`₹${amount.toLocaleString('en-IN')} received — ${booking.guestName}`, 'payment');
  }, [groupBookings, addActivity]);

  const checkOutGroup = useCallback((bookingId: string) => {
    const booking = groupBookings.find(b => b.id === bookingId);
    if (!booking) return;
    setGroupBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'checked_out' } : b));
    setRooms(prev => prev.map(r => booking.roomIds.includes(r.id) ? { ...r, status: 'vacant', guest: undefined, checkInDate: undefined, checkOutDate: undefined, items: [], amountPaid: 0, paymentStatus: 'unpaid', groupBookingId: undefined } : r));
    addActivity(`${booking.guestName} checked out (group booking)`, 'checkout');
  }, [groupBookings, addActivity]);

  return (
    <HomestayContext.Provider value={{
      rooms, activityLog, payments, blockedBookings, groupBookings,
      updateRoom, addItem, removeItem, updateGuest, recordPayment, checkIn, checkOut, getMonthlyRevenue,
      addBlockedBooking, cancelBlockedBooking, checkInFromBlock,
      createGroupBooking, addGroupItem, removeGroupItem, addGroupAadhar, removeGroupAadhar, recordGroupPayment, checkOutGroup,
    }}>
      {children}
    </HomestayContext.Provider>
  );
}

export function useHomestay() {
  const ctx = useContext(HomestayContext);
  if (!ctx) throw new Error('useHomestay must be used within HomestayProvider');
  return ctx;
}
