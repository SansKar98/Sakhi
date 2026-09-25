import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Navigation, AlertCircle, Clock } from 'lucide-react';

export default function History() {
  const { user } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      setLoading(true);
      try {
        const { data: sData, error: sErr } = await supabase
          .from('guardian_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('started_at', { ascending: false });

        const { data: rData, error: rErr } = await supabase
          .from('safety_reports')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (sErr) throw sErr;
        if (rErr) throw rErr;

        setSessions(sData || []);
        setReports(rData || []);
      } catch (err: any) {
        console.error('Failed loading history', err.message || err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-space-navy-900">
        <p className="text-gray-400">Please sign in to view history.</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return '—';
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-neon-cyan-500/20 text-neon-cyan-400 border-neon-cyan-500/50',
      completed: 'bg-green-500/20 text-green-400 border-green-500/50',
      emergency: 'bg-red-500/20 text-red-400 border-red-500/50',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      verified: 'bg-green-500/20 text-green-400 border-green-500/50',
      resolved: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    };
    return `px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/50'}`;
  };

  const reportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      broken_light: 'Broken Light',
      unsafe_area: 'Unsafe Area',
      safe_spot: 'Safe Spot',
      other: 'Other',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen p-6 bg-space-navy-900 text-white pb-24">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-soft-lavender-400 flex items-center gap-2">
          <Clock size={28} /> Activity History
        </h1>
        <p className="text-gray-400 text-sm mt-2 font-medium">
          Your past trips and safety reports.
        </p>
      </header>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2">
            <Navigation size={18} className="text-neon-cyan-400" /> Guardian Sessions
          </h2>
          <span className="text-sm text-gray-400">{sessions.length} trips</span>
        </div>
        {loading ? (
          <div className="text-gray-400 animate-pulse">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-gray-500 bg-space-navy-800 border border-space-navy-700 rounded-2xl p-6 text-center">
            No guardian sessions yet. Start a safe trip from the home screen!
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="p-4 bg-space-navy-800 border border-space-navy-700 rounded-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">
                      {s.start_location?.address || 'Unknown start'}
                      {s.end_location?.address ? ` → ${s.end_location.address}` : ''}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{formatDate(s.started_at)}</div>
                  </div>
                  <span className={statusBadge(s.status)}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2">
            <AlertCircle size={18} className="text-soft-lavender-400" /> Safety Reports
          </h2>
          <span className="text-sm text-gray-400">{reports.length} reports</span>
        </div>
        {loading ? (
          <div className="text-gray-400 animate-pulse">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="text-gray-500 bg-space-navy-800 border border-space-navy-700 rounded-2xl p-6 text-center">
            No safety reports yet. Report hazards from the Reports tab!
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="p-4 bg-space-navy-800 border border-space-navy-700 rounded-2xl">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">{reportTypeLabel(r.report_type)}</div>
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">{r.description}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatDate(r.created_at)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={statusBadge(r.status)}>{r.status}</span>
                    <span className="text-[10px] text-gray-500">Severity: {r.severity}/5</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
