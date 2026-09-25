import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Camera, MapPin, Send, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function Reports() {
  const { addToast } = useToast();
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState<'broken_light' | 'unsafe_area' | 'safe_spot' | 'other'>('other');
  const [severity, setSeverity] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  async function reverseGeocode(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('Failed to reverse geocode');
    return res.json();
  }

  async function geocodeAddress(query: string) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('Failed to geocode');
    const data = await res.json();
    return data?.[0] as { lat: string; lon: string; display_name: string } | undefined;
  }

  async function handleAutoLocate() {
    if (!('geolocation' in navigator)) {
      addToast('Geolocation is not supported by this browser.', 'error');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const data = await reverseGeocode(latitude, longitude);
          setLocationLabel(data?.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } catch (err) {
          console.error(err);
          setLocationLabel(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Auto locate error', error);
        addToast(error.message || 'Failed to access location.', 'error');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }

  /**
   * COMMUNITY REPORT SUBMISSION
   * This sends the user's observation to the database.
   * Severity levels help the 'Safe Route Engine' weigh the risk of a path.
   */
  async function handleReportSubmit(event: React.FormEvent) {
    event.preventDefault();
    
    // Simple validation: Ensure there is a description
    if (!description.trim()) {
      addToast("Please enter a description of the hazard.", "error");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      addToast('Please sign in to submit a report.', "error");
      return;
    }

    let resolvedCoords = coords;
    if (!resolvedCoords && locationLabel.trim()) {
      try {
        const data = await geocodeAddress(locationLabel.trim());
        if (data) {
          resolvedCoords = { lat: parseFloat(data.lat), lng: parseFloat(data.lon) };
          setCoords(resolvedCoords);
          setLocationLabel(data.display_name);
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (!resolvedCoords) {
      addToast('Please add a location or use Auto Locate.', "error");
      return;
    }

    setIsSubmitting(true);
    
    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        const path = `${user.id}/report-${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('report-photos')
          .upload(path, photoFile, { upsert: true });

        if (uploadError) throw uploadError;
        const publicUrl = supabase.storage.from('report-photos').getPublicUrl(path);
        photoUrl = publicUrl.data.publicUrl || null;
      }

      const { error } = await supabase.from('safety_reports').insert({
        user_id: user.id,
        report_type: reportType,
        description: description,
        latitude: resolvedCoords.lat,
        longitude: resolvedCoords.lng,
        photo_url: photoUrl,
        severity: severity,
        status: 'pending'
      });

      if (error) throw error;

      addToast("Thank you! Your report has been submitted for community verification.", "success");
      // Reset form on success
      setDescription('');
      setReportType('other');
      setSeverity(3);
      setCoords(null);
      setLocationLabel('');
      setPhotoFile(null);
    } catch (err) {
      console.error("Report Error:", err);
      addToast("Something went wrong. Please check your network and try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-space-navy-900 text-white p-6 pb-24">
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-soft-lavender-400 flex items-center gap-2">
          <AlertCircle size={28} /> Community Report
        </h1>
        <p className="text-gray-400 text-sm mt-2 font-medium">
          Report hazards to help others stay safe.
        </p>
      </header>

      <form onSubmit={handleReportSubmit} className="space-y-8">
        {/* TEXT DESCRIPTION INPUT */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">
            Hazard Description
          </label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Broken street lights on 5th Ave, suspicious vehicle near the park..."
            className="
              w-full h-44 p-5 rounded-3xl bg-space-navy-800 border border-space-navy-700
              focus:border-neon-cyan-500 focus:ring-2 focus:ring-neon-cyan-500/20
              outline-none transition-all resize-none text-white placeholder:text-gray-600
            "
          />
        </div>

        {/* REPORT TYPE */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as typeof reportType)}
            className="w-full p-4 rounded-2xl bg-space-navy-800 border border-space-navy-700 focus:border-neon-cyan-500 outline-none text-sm"
          >
            <option value="broken_light" className="bg-space-navy-900">Broken Street Light</option>
            <option value="unsafe_area" className="bg-space-navy-900">Unsafe Area</option>
            <option value="safe_spot" className="bg-space-navy-900">Safe Spot</option>
            <option value="other" className="bg-space-navy-900">Other</option>
          </select>
        </div>

        {/* SEVERITY SLIDER */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">
              Severity Level
            </label>
            <span className={`px-4 py-1 rounded-full text-xs font-black border ${
              severity > 3 ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-neon-cyan-500/10 border-neon-cyan-500 text-neon-cyan-500'
            }`}>
              LEVEL {severity}
            </span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="5" 
            value={severity}
            onChange={(e) => setSeverity(parseInt(e.target.value))}
            className="w-full h-2 bg-space-navy-700 rounded-full appearance-none cursor-pointer accent-neon-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-gray-600 font-black uppercase tracking-widest">
            <span>Minor Concern</span>
            <span>Moderate</span>
            <span>High Danger</span>
          </div>
        </div>

        {/* LOCATION */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">
            Hazard Location
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={locationLabel}
              onChange={(e) => {
                setLocationLabel(e.target.value);
                setCoords(null);
              }}
              placeholder="Auto-locate or type an address"
              className="flex-1 p-4 rounded-2xl bg-space-navy-800 border border-space-navy-700 focus:border-neon-cyan-500 outline-none text-sm"
            />
            <button
              type="button"
              onClick={handleAutoLocate}
              className="px-4 rounded-2xl bg-space-navy-800 border border-space-navy-700 active:bg-space-navy-700 transition-colors flex items-center gap-2"
              disabled={isLocating}
            >
              <MapPin size={18} className="text-neon-cyan-500" />
              <span className="text-xs font-bold">{isLocating ? 'LOCATING' : 'AUTO'}</span>
            </button>
          </div>
          {coords && (
            <p className="text-xs text-gray-500">
              {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          )}
        </div>

        {/* PHOTO UPLOAD */}
        <div className="space-y-3">
          <label className="text-sm font-bold text-gray-300 uppercase tracking-widest">
            Attach Photo
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setPhotoFile(file);
            }}
          />
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-3 px-5 py-4 rounded-2xl bg-space-navy-800 border border-space-navy-700 active:bg-space-navy-700 transition-colors"
            >
              <Camera size={20} className="text-neon-cyan-500" />
              <span className="text-sm font-bold">{photoFile ? 'Replace Photo' : 'Add Photo'}</span>
            </button>
            {photoFile && (
              <button
                type="button"
                onClick={() => setPhotoFile(null)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-400"
              >
                <X size={14} />
                Remove
              </button>
            )}
          </div>
          {photoPreview && (
            <div className="relative w-full max-w-xs">
              <img src={photoPreview} alt="Report preview" className="rounded-2xl border border-space-navy-700" />
            </div>
          )}
        </div>

        {/* SUBMIT BUTTON */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className={`
            w-full py-5 rounded-3xl font-black text-space-navy-900 bg-neon-cyan-500
            flex items-center justify-center gap-3 transition-transform active:scale-95
            shadow-[0_10px_30px_rgba(0,225,255,0.25)]
            ${isSubmitting ? 'opacity-50 cursor-not-allowed animate-pulse' : ''}
          `}
        >
          <Send size={20} />
          {isSubmitting ? 'UPLOADING...' : 'SUBMIT SAFETY REPORT'}
        </button>
      </form>
    </div>
  );
}
