import { useState, useEffect } from 'react';
import { MapPin, Navigation, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type SafeHaven = Database['public']['Tables']['safe_havens']['Row'];

export default function MapView() {
  const [safeHavens, setSafeHavens] = useState<SafeHaven[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getUserLocation();
    fetchSafeHavens();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  };

  const fetchSafeHavens = async () => {
    try {
      const { data, error } = await supabase
        .from('safe_havens')
        .select('*')
        .eq('is_verified', true)
        .limit(20);

      if (error) throw error;
      setSafeHavens(data || []);
    } catch (error) {
      console.error('Error fetching safe havens:', error);
    }
  };

  const getTypeIcon = (type: SafeHaven['type']) => {
    const icons = {
      hospital: '🏥',
      police: '👮',
      fire_station: '🚒',
      '24_7_business': '🏪',
      other: '📍',
    };
    return icons[type] || '📍';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-space-navy-900 to-space-navy-800 px-4 pt-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Safe Navigation</h1>
          <p className="text-gray-400">Find the safest route to your destination</p>
        </div>

        <div className="bg-space-navy-700 rounded-2xl p-6 mb-6 border border-space-navy-600 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-neon-cyan-500 to-soft-lavender-500 rounded-full flex items-center justify-center shadow-neon-cyan">
                <Navigation size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Your Location</h2>
                {userLocation ? (
                  <p className="text-gray-400 text-sm">
                    {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">Getting location...</p>
                )}
              </div>
            </div>
            <button
              onClick={getUserLocation}
              className="px-4 py-2 bg-neon-cyan-500 text-white rounded-lg font-medium haptic-press shadow-neon-cyan"
            >
              Refresh
            </button>
          </div>

          <div className="bg-space-navy-800 rounded-xl p-4 flex items-center justify-center h-64">
            <div className="text-center">
              <MapPin size={48} className="text-neon-cyan-400 mx-auto mb-3" />
              <p className="text-gray-400">Map integration coming soon</p>
              <p className="text-gray-500 text-sm mt-1">Mapbox GL JS will be integrated here</p>
            </div>
          </div>
        </div>

        <div className="bg-space-navy-700 rounded-2xl p-6 border border-space-navy-600 shadow-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="text-soft-lavender-400" />
            <h2 className="text-xl font-bold text-white">Nearby Safe Havens</h2>
          </div>

          <div className="space-y-3">
            {safeHavens.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No safe havens found nearby</p>
            ) : (
              safeHavens.map((haven) => (
                <div
                  key={haven.id}
                  className="bg-space-navy-600 rounded-xl p-4 hover:bg-space-navy-500 transition-smooth"
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-3xl">{getTypeIcon(haven.type)}</div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{haven.name}</h3>
                      <p className="text-gray-400 text-sm mb-2">{haven.address}</p>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-gray-500">
                          {haven.latitude.toFixed(4)}, {haven.longitude.toFixed(4)}
                        </span>
                        {haven.phone && (
                          <a
                            href={`tel:${haven.phone}`}
                            className="text-neon-cyan-400 hover:text-neon-cyan-300"
                          >
                            {haven.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
