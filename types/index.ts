export type RoomStatus = 'vacant' | 'occupied';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type IDType = 'aadhar' | 'passport' | 'driving_license' | 'voter_id';

export interface Guest {
  id: string;
  fullName: string;
  phone: string;
  adults: number;
  children: number;
  idType: IDType;
  idNumber: string;
  idDocumentBase64?: string;
  specialRequests?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  pricePerUnit: number;
  addedAt: string;
}

export type NoteCategory = 'food' | 'request' | 'transport' | 'general';

export interface StaffNote {
  id: string;
  text: string;
  category: NoteCategory;
  addedAt: string;
}

export interface Payment {
  id: string;
  roomId: string;
  roomName: string;
  amount: number;
  date: string;
}

export interface Room {
  id: string;
  name: string;
  emoji: string;
  status: RoomStatus;
  nightlyRate: number;
  checkInDate?: string;
  checkOutDate?: string;
  guest?: Guest;
  items: OrderItem[];
  notes: StaffNote[];
  amountPaid: number;
  paymentStatus: PaymentStatus;
  groupBookingId?: string;
}

export interface ActivityLog {
  id: string;
  message: string;
  timestamp: string;
  type: 'checkin' | 'checkout' | 'payment' | 'item' | 'guest';
}

export type BookingStatus = 'blocked' | 'checked_in' | 'checked_out' | 'cancelled';
export type MealPlan = 'room_only' | 'breakfast' | 'breakfast_dinner' | 'all_meals';

export interface AadharEntry {
  id: string;
  holderName: string;
  number: string;
  imageBase64?: string;
}

export interface GroupBooking {
  id: string;
  roomIds: string[];
  roomRates: Record<string, number>;
  guestName: string;
  phone?: string;
  adults: number;
  children: number;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  items: OrderItem[];
  aadharCards: AadharEntry[];
  amountPaid: number;
  paymentStatus: PaymentStatus;
  specialRequests?: string;
  mealPlan?: MealPlan;
  sourceBlockedBookingId?: string;
  status: 'active' | 'checked_out';
  createdAt: string;
}
export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer';

export interface BlockedBooking {
  id: string;
  roomIds: string[];
  guestName: string;
  phone: string;
  adults: number;
  children: number;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  specialRequests?: string;
  mealPlan?: MealPlan;
  status: BookingStatus;
  createdAt: string;
  blockType?: 'advance' | 'maintenance';
  maintenanceReason?: string;
}
