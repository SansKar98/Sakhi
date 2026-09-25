import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Shield, LogOut, Award, ChevronRight, Plus, Trash, Edit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Profile() {
  const { user, profile, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [safeWalksCount, setSafeWalksCount] = useState(0);

  // local guardians state mirrors profile.emergency_contacts
  const [guardians, setGuardians] = useState<{ name: string; phone: string; relationship: string; }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRelation, setEditRelation] = useState('');
  const [saving, setSaving] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [guardianToDelete, setGuardianToDelete] = useState<number | null>(null);

  // populate local guardians from context profile
  useEffect(() => {
    const raw = profile?.emergency_contacts;
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) setGuardians(parsed as any);
      } catch (e) {
        console.warn('Failed to parse emergency_contacts', e);
      }
    }
  }, [profile]);

  // Fetch safe walks count from guardian_sessions
  useEffect(() => {
    if (!user) return;
    async function loadSafeWalks() {
      const { count, error } = await supabase
        .from('guardian_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('status', 'completed');
      if (!error && count !== null) setSafeWalksCount(count);
    }
    loadSafeWalks();
  }, [user]);

  /**
   * Handle user logout.
   */
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      addToast(error.message, 'error');
    } else {
      navigate('/');
    }
  }

  // Avatar upload
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const path = `${user.id}/${Date.now()}_${file.name}`;
    try {
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      // Save path to profile
      const { error: updErr } = await updateProfile({ avatar_url: path });
      if (updErr) throw updErr;
      addToast('Avatar uploaded successfully', 'success');
    } catch (err: any) {
      console.error('Avatar upload failed', err);
      addToast(err?.message || 'Failed to upload avatar', 'error');
    }
  }

  // Guardian management helpers
  function addGuardian() {
    setGuardians(prev => [...prev, { name: '', phone: '', relationship: '' }]);
    setEditingIndex((prev) => (prev === null ? (guardians.length) : prev));
  }

  function startEdit(i: number) {
    setEditingIndex(i);
    const g = guardians[i];
    setEditName(g?.name || '');
    setEditPhone(g?.phone || '');
    setEditRelation(g?.relationship || '');
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditName(''); setEditPhone(''); setEditRelation('');
  }

  async function saveEdit() {
    if (editingIndex === null) return;
    const updated = [...guardians];
    updated[editingIndex] = { name: editName, phone: editPhone, relationship: editRelation };
    setGuardians(updated);
    setEditingIndex(null);
    setEditName(''); setEditPhone(''); setEditRelation('');
    await persistGuardians(updated);
  }

  function removeGuardian(i: number) {
    setGuardians(prev => prev.filter((_, idx) => idx !== i));
  }

  async function persistGuardians(updatedGuardians?: any[]) {
    if (!user) return;
    setSaving(true);
    const dataToSave = updatedGuardians || guardians;
    try {
      const { error } = await updateProfile({ emergency_contacts: dataToSave });
      if (error) throw error;
      addToast('Guardians updated successfully', 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to save guardians', 'error');
    } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-space-navy-900 flex items-center justify-center">
        <div className="text-neon-cyan-500 animate-pulse font-bold uppercase tracking-widest">
          Loading Profile...
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-space-navy-900 text-white p-6 pb-24">
      {/* Profile Header */}
      <header className="flex flex-col items-center mt-8 mb-10">
        <div className="w-28 h-28 rounded-full bg-space-navy-800 border-2 border-neon-cyan-500 flex items-center justify-center shadow-neon-cyan mb-4 overflow-hidden">
          {profile?.avatar_url ? (
            (() => {
              try {
                const res = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url as string);
                // getPublicUrl returns { data: { publicUrl } }
                const publicUrl = (res as any)?.data?.publicUrl || (res as any)?.publicUrl;
                return <img src={publicUrl} alt="avatar" className="w-full h-full object-cover" />;
              } catch (e) {
                console.error('Error generating avatar URL', e);
                return <User size={48} className="text-neon-cyan-500" />;
              }
            })()
          ) : (
            <User size={48} className="text-neon-cyan-500" />
          )}
        </div>
        <label className="text-sm mb-2">
          <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          <span className="px-3 py-1 bg-neon-cyan-500 text-space-navy-900 rounded cursor-pointer">Change Photo</span>
        </label>

        <h1 className="text-2xl font-black tracking-tight text-white">
          {profile?.full_name || user?.email?.split('@')[0].toUpperCase() || 'GUARDIAN'}
        </h1>
        <p className="text-neon-cyan-500 text-xs font-bold uppercase tracking-widest mt-1">
          Verified Sakhi User
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-space-navy-800 border border-space-navy-700 p-4 rounded-2xl flex flex-col items-center">
          <Award className="text-soft-lavender-400 mb-2" />
          <span className="text-xl font-black">{profile?.safety_credits ?? 0}</span>
          <span className="text-[10px] text-gray-500 font-bold uppercase">Safety Credits</span>
        </div>
        <div className="bg-space-navy-800 border border-space-navy-700 p-4 rounded-2xl flex flex-col items-center">
          <Shield className="text-green-500 mb-2" />
          <span className="text-xl font-black">{safeWalksCount}</span>
          <span className="text-[10px] text-gray-500 font-bold uppercase">Safe Walks</span>
        </div>
      </div>

      {/* Account Settings List */}
      <div className="space-y-3">
        <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest px-2 mb-4">
          Account Settings
        </h2>

        <div className="w-full flex items-center justify-between p-5 rounded-2xl bg-space-navy-800 border border-space-navy-700">
          <div className="flex items-center gap-4">
            <Mail className="text-gray-400" size={20} />
            <div className="text-left">
              <p className="text-xs text-gray-500 font-bold uppercase">Email Address</p>
              <p className="font-medium text-sm">{user?.email || 'Not available'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-bold uppercase">Phone</p>
            <p className="font-medium text-sm">{profile?.phone || 'Not set'}</p>
          </div>
        </div>

        <button className="w-full flex items-center justify-between p-5 rounded-2xl bg-space-navy-800 border border-space-navy-700 active:bg-space-navy-700 transition-colors">
          <div className="flex items-center gap-4">
            <Shield className="text-gray-400" size={20} />
            <p className="font-bold">Privacy Settings</p>
          </div>
          <ChevronRight size={18} className="text-gray-600" />
        </button>

        {/* LOGOUT BUTTON */}
        <button 
          onClick={() => setShowSignOutConfirm(true)}
          className="w-full flex items-center gap-4 p-5 rounded-2xl bg-red-900/20 border border-red-900/50 text-red-500 font-bold mt-8 active:bg-red-900/40 transition-colors"
        >
          <LogOut size={20} />
          <span>Sign Out of Sakhi</span>
        </button>
      </div>

      {/* Guardian Management */}
      <div className="mt-8">
        <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest px-2 mb-4">Guardians</h2>
        <div className="space-y-4">
          {(guardians || []).map((g, i) => (
            <div key={i} className="bg-space-navy-800 border border-space-navy-700 p-4 rounded-2xl flex items-start justify-between">
              <div className="flex-1">
                  {editingIndex === i ? (
                  <div className="space-y-2">
                    <input className="w-full p-2 rounded bg-space-navy-700" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name" />
                    <input className="w-full p-2 rounded bg-space-navy-700" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone" />
                    <input className="w-full p-2 rounded bg-space-navy-700" value={editRelation} onChange={e => setEditRelation(e.target.value)} placeholder="Relationship" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={saveEdit} className="btn-primary">Save</button>
                      <button onClick={cancelEdit} className="btn-secondary">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold">{g.name || '—'}</p>
                    <p className="text-sm text-gray-400">{g.relationship || '—'} • {g.phone || '—'}</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end ml-4 gap-2">
                <button onClick={() => startEdit(i)} className="p-2 rounded bg-space-navy-700"><Edit size={16} /></button>
                <button onClick={() => setGuardianToDelete(i)} className="p-2 rounded bg-red-800 text-red-400"><Trash size={16} /></button>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <button onClick={addGuardian} className="flex items-center gap-2 btn-primary"><Plus size={16}/> Add Guardian</button>
            <button onClick={() => persistGuardians()} disabled={saving} className="btn-secondary">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>

      {/* Edit Profile: simple settings inline */}
      <div className="mt-8">
        <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest px-2 mb-4">Edit Profile</h2>
        <ProfileEditor profile={profile} updateProfile={updateProfile} />
      </div>

      <ConfirmDialog
        isOpen={showSignOutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out? You will stop sharing your location and updates."
        confirmLabel="Sign Out"
        isDestructive
        onConfirm={handleSignOut}
        onCancel={() => setShowSignOutConfirm(false)}
      />

      <ConfirmDialog
        isOpen={guardianToDelete !== null}
        title="Remove Guardian"
        message="Are you sure you want to remove this emergency contact? They will no longer receive alerts."
        confirmLabel="Remove"
        isDestructive
        onConfirm={() => {
          if (guardianToDelete !== null) {
            removeGuardian(guardianToDelete);
            setGuardianToDelete(null);
          }
        }}
        onCancel={() => setGuardianToDelete(null)}
      />
    </div>
    </ErrorBoundary>
  );
}

// Simple Error Boundary to catch rendering errors and show a helpful message
class ErrorBoundary extends React.Component<any, { hasError: boolean; error?: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-space-navy-900 text-white">
          <div className="max-w-xl p-6 bg-space-navy-800 border border-space-navy-700 rounded-lg text-center">
            <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-400">We couldn't load your profile. Try refreshing or contact support.</p>
            <pre className="text-xs text-red-400 mt-4">{String(this.state.error)}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProfileEditor({ profile, updateProfile }: any) {
  const { addToast } = useToast();
  const [name, setName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [occupation, setOccupation] = useState(profile?.occupation || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(profile?.full_name || '');
    setPhone(profile?.phone || '');
    setOccupation(profile?.occupation || '');
    setAddress(profile?.address || '');
  }, [profile]);

  async function save() {
    setLoading(true);
    try {
      const { error } = await updateProfile({ full_name: name, phone, occupation, address });
      if (error) throw error;
      addToast('Profile updated successfully', 'success');
    } catch (err: any) { addToast(err?.message || 'Failed to update', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-space-navy-800 border border-space-navy-700 p-4 rounded-2xl space-y-3">
      <input className="w-full p-3 rounded bg-space-navy-700" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
      <input className="w-full p-3 rounded bg-space-navy-700" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" />
      <input className="w-full p-3 rounded bg-space-navy-700" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="Occupation" />
      <input className="w-full p-3 rounded bg-space-navy-700" value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" />
      <div className="flex gap-2">
        <button onClick={save} className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}

