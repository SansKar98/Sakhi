import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabase';
import { ShieldCheck, AlertOctagon } from 'lucide-react';
import { motion } from 'framer-motion';

const createGlowIcon = (color: string) => L.divIcon({
  className: 'custom-icon',
  html: `<div class="marker-pulse" style="background: radial-gradient(circle, ${color} 0%, rgba(139, 92, 246, 0) 70%); width: 24px; height: 24px; border-radius: 50%;">
           <div style="background: ${color}; width: 12px; height: 12px; border-radius: 50%; margin: 6px; box-shadow: 0 0 10px ${color};"></div>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const userIcon = createGlowIcon('#00e1ff'); // Neon Cyan

export default function GuardianTrack() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      if (!sessionId) return;
      try {
        const { data, error } = await supabase
          .from('guardian_sessions')
          .select('*, profiles(full_name)')
          .eq('id', sessionId)
          .single();

        if (error) throw error;
        if (!data) throw new Error("Session not found");
        
        setSession(data);
      } catch (err: any) {
        setError(err.message || 'Session not found or expired.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSession();

    // Subscribe to real-time updates
    const channel = supabase.channel(`public:guardian_sessions:id=eq.${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'guardian_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          setSession(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-space-navy-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon-cyan-500"></div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-space-navy-900 text-white flex flex-col items-center justify-center p-6">
        <AlertOctagon size={64} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Tracking Unavailable</h1>
        <p className="text-gray-400 text-center mb-8">{error || "This session might have ended or does not exist."}</p>
        <button 
          onClick={() => navigate('/')}
          className="btn-primary"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  const currentLoc = session.current_location || session.start_location;
  const isCompleted = session.status === 'completed';

  return (
    <div className="min-h-screen bg-space-navy-900 text-white flex flex-col">
      <header className="p-4 bg-space-navy-800/80 backdrop-blur-md border-b border-white/10 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck size={28} className="text-neon-cyan-500" />
          <div>
            <h1 className="text-xl font-black uppercase text-white">Guardian Tracking</h1>
            <p className="text-xs text-neon-cyan-500 font-bold tracking-widest">
              {session.profiles?.full_name ? `${session.profiles.full_name}'s Location` : 'Live Tracking'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 relative">
        <MapContainer 
          center={[currentLoc.lat, currentLoc.lng]} 
          zoom={15} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            className="map-tiles"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <Marker position={[currentLoc.lat, currentLoc.lng]} icon={userIcon}>
            <Popup className="glass-popup">
              <div className="font-bold text-space-navy-900">
                {isCompleted ? 'Final Location' : 'Live Location'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Updated: {new Date(currentLoc.timestamp || session.started_at).toLocaleTimeString()}
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {isCompleted && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-6 left-6 right-6 z-[1000]"
          >
            <div className="glass-panel p-4 flex items-center gap-4 border-red-500/30">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                <AlertOctagon className="text-red-500" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-white">Trip Completed</h3>
                <p className="text-xs text-gray-400">The user has ended their travel session.</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
