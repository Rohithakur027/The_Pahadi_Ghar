'use client';

import { useState } from 'react';
import { Guest, IDType } from '@/types';
import { User, Phone, CreditCard, Upload, FileText, Users, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

interface GuestFormProps {
  initialGuest?: Guest;
  onSave: (guest: Guest) => void;
}

const ID_OPTIONS: { value: IDType; label: string }[] = [
  { value: 'aadhar', label: 'Aadhar Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'voter_id', label: 'Voter ID' },
];

const inputClass = `
  w-full px-3 py-3 rounded-xl border bg-white text-sm
  focus:outline-none focus:ring-2 focus:ring-warmamber/40 focus:border-warmamber
  transition-all duration-150 placeholder:text-stone-muted/60
`.trim();

const labelClass = "text-xs font-semibold uppercase tracking-wide mb-1.5 block";

export default function GuestForm({ initialGuest, onSave }: GuestFormProps) {
  const [form, setForm] = useState<Omit<Guest, 'id'>>({
    fullName: initialGuest?.fullName || '',
    phone: initialGuest?.phone || '',
    adults: initialGuest?.adults || 1,
    children: initialGuest?.children || 0,
    idType: initialGuest?.idType || 'aadhar',
    idNumber: initialGuest?.idNumber || '',
    idDocumentBase64: initialGuest?.idDocumentBase64,
    specialRequests: initialGuest?.specialRequests || '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Guest, string>>>({});

  const set = (key: keyof typeof form, value: string | number) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, idDocumentBase64: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs: Partial<Record<keyof Guest, string>> = {};
    if (!form.fullName.trim()) errs.fullName = 'Name is required';
    if (!form.phone.trim()) errs.phone = 'Phone is required';
    else if (!/^\+?[\d\s-]{8,15}$/.test(form.phone)) errs.phone = 'Enter a valid phone number';
    if (!form.idNumber.trim()) errs.idNumber = 'ID number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, id: initialGuest?.id || crypto.randomUUID() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Full Name */}
      <div>
        <label className={labelClass} style={{ color: '#7A7A6E' }}>Full Name</label>
        <div className="relative">
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#7A7A6E' }} />
          <input
            type="text"
            placeholder="Guest full name"
            value={form.fullName}
            onChange={e => set('fullName', e.target.value)}
            className={`${inputClass} pl-9`}
            style={{ borderColor: errors.fullName ? '#C0533A' : 'rgba(28,58,42,0.15)' }}
          />
        </div>
        {errors.fullName && <p className="text-xs mt-1" style={{ color: '#C0533A' }}>{errors.fullName}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className={labelClass} style={{ color: '#7A7A6E' }}>Phone Number</label>
        <div className="relative">
          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#7A7A6E' }} />
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            className={`${inputClass} pl-9`}
            style={{ borderColor: errors.phone ? '#C0533A' : 'rgba(28,58,42,0.15)' }}
          />
        </div>
        {errors.phone && <p className="text-xs mt-1" style={{ color: '#C0533A' }}>{errors.phone}</p>}
      </div>

      {/* Adults + Children */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={{ color: '#7A7A6E' }}>Adults</label>
          <div className="relative">
            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#7A7A6E' }} />
            <input
              type="number"
              min="1"
              max="20"
              value={form.adults}
              onChange={e => set('adults', parseInt(e.target.value) || 1)}
              className={`${inputClass} pl-9`}
              style={{ borderColor: 'rgba(28,58,42,0.15)' }}
            />
          </div>
        </div>
        <div>
          <label className={labelClass} style={{ color: '#7A7A6E' }}>Children</label>
          <input
            type="number"
            min="0"
            max="10"
            value={form.children}
            onChange={e => set('children', parseInt(e.target.value) || 0)}
            className={inputClass}
            style={{ borderColor: 'rgba(28,58,42,0.15)' }}
          />
        </div>
      </div>

      {/* ID Type */}
      <div>
        <label className={labelClass} style={{ color: '#7A7A6E' }}>ID Type</label>
        <div className="relative">
          <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#7A7A6E' }} />
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#7A7A6E' }} />
          <select
            value={form.idType}
            onChange={e => set('idType', e.target.value as IDType)}
            className={`${inputClass} pl-9 pr-9 appearance-none`}
            style={{ borderColor: 'rgba(28,58,42,0.15)' }}
          >
            {ID_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ID Number */}
      <div>
        <label className={labelClass} style={{ color: '#7A7A6E' }}>ID Number</label>
        <input
          type="text"
          placeholder="Enter ID number"
          value={form.idNumber}
          onChange={e => set('idNumber', e.target.value)}
          className={inputClass}
          style={{ borderColor: errors.idNumber ? '#C0533A' : 'rgba(28,58,42,0.15)' }}
        />
        {errors.idNumber && <p className="text-xs mt-1" style={{ color: '#C0533A' }}>{errors.idNumber}</p>}
      </div>

      {/* ID Document Upload */}
      <div>
        <label className={labelClass} style={{ color: '#7A7A6E' }}>ID Document (Photo)</label>
        <label
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed cursor-pointer transition-colors"
          style={{
            borderColor: form.idDocumentBase64 ? '#3E6B47' : 'rgba(28,58,42,0.2)',
            background: form.idDocumentBase64 ? 'rgba(62,107,71,0.06)' : 'rgba(247,243,238,0.5)',
          }}
        >
          {form.idDocumentBase64 ? (
            <FileText size={18} style={{ color: '#3E6B47' }} />
          ) : (
            <Upload size={18} style={{ color: '#7A7A6E' }} />
          )}
          <span className="text-sm" style={{ color: form.idDocumentBase64 ? '#3E6B47' : '#7A7A6E' }}>
            {form.idDocumentBase64 ? 'Document uploaded ✓' : 'Tap to upload photo'}
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Special Requests */}
      <div>
        <label className={labelClass} style={{ color: '#7A7A6E' }}>Notes / Special Requests</label>
        <textarea
          placeholder="Dietary needs, room preferences, arrival time..."
          value={form.specialRequests}
          onChange={e => set('specialRequests', e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
          style={{ borderColor: 'rgba(28,58,42,0.15)' }}
        />
      </div>

      <button
        type="submit"
        className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-all active:scale-95"
        style={{ background: 'linear-gradient(135deg, #1C3A2A, #2A5A40)' }}
      >
        Save Guest Details
      </button>
    </form>
  );
}
