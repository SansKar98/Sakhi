import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Briefcase, Calendar, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const EMERGENCY_RELATIONS = ['Mother', 'Father', 'Sister', 'Brother', 'Friend', 'Spouse', 'Other'];

export default function ProfileCompletion() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);

  const [formData, setFormData] = useState({
    age: profile?.age?.toString() || '',
    gender: profile?.gender || '',
    phone: profile?.phone || '',
    occupation: profile?.occupation || '',
    address: profile?.address || '',
    emergencyContacts: profile?.emergency_contacts || [{ name: '', phone: '', relationship: '' }],
  });

  const showToast = (message: string, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleEmergencyContactChange = (
    index: number,
    field: 'name' | 'phone' | 'relationship',
    value: string
  ) => {
    const contacts = [...formData.emergencyContacts];
    contacts[index] = { ...contacts[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      emergencyContacts: contacts,
    }));
  };

  const addEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, { name: '', phone: '', relationship: '' }],
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    if (!formData.age || !formData.gender || !formData.phone) {
      showToast('Please fill in Age, Gender, and Phone', 'error');
      return false;
    }

    if (formData.phone.length < 10) {
      showToast('Phone number must be at least 10 digits', 'error');
      return false;
    }

    if (formData.emergencyContacts.length === 0 || !formData.emergencyContacts[0].name) {
      showToast('Please add at least one emergency contact', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const profileData = {
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        phone: formData.phone || null,
        occupation: formData.occupation || null,
        address: formData.address || null,
        emergency_contacts: formData.emergencyContacts.filter(c => c.name && c.phone),
        profile_completed: true,
      };

      console.log('Submitting profile data:', profileData);

      const { error } = await updateProfile(profileData);

      if (error) {
        console.error('Update profile error:', error);
        showToast(
          error.message || 'Failed to update profile. Please try again.',
          'error'
        );
        setLoading(false);
        return;
      }

      showToast('Profile completed! Welcome to Sakhi 🎉', 'success');
      setTimeout(() => navigate('/home'), 1500);
    } catch (err) {
      console.error('Submit error:', err);
      showToast(err instanceof Error ? err.message : 'Failed to update profile', 'error');
      setLoading(false);
    }
  };

  const skipForNow = async () => {
    setLoading(true);
    try {
      const { error } = await updateProfile({
        profile_completed: true,
      });
      if (error) throw error;
      navigate('/');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to skip', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-space-navy-900 via-space-navy-800 to-space-navy-700 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="bg-space-navy-700 rounded-2xl shadow-2xl p-8 border border-space-navy-600">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-cyan-400 to-soft-lavender-400 bg-clip-text text-transparent mb-2">
              Complete Your Profile
            </h1>
            <p className="text-gray-400">Help us personalize your safety experience</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-neon-cyan-400 flex items-center gap-2">
                <User size={20} />
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => handleInputChange(e, 'age')}
                      className="w-full pl-10 pr-4 py-3 bg-space-navy-600 border border-space-navy-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan-500 focus:border-transparent transition-smooth"
                      placeholder="18"
                      min="13"
                      max="120"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange(e, 'gender')}
                    className="w-full px-4 py-3 bg-space-navy-600 border border-space-navy-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan-500 focus:border-transparent transition-smooth"
                    required
                  >
                    <option value="">Select Gender</option>
                    {GENDERS.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange(e, 'phone')}
                      className="w-full pl-10 pr-4 py-3 bg-space-navy-600 border border-space-navy-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan-500 focus:border-transparent transition-smooth"
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Occupation
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={formData.occupation}
                      onChange={(e) => handleInputChange(e, 'occupation')}
                      className="w-full pl-10 pr-4 py-3 bg-space-navy-600 border border-space-navy-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan-500 focus:border-transparent transition-smooth"
                      placeholder="Student, Engineer, etc."
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange(e, 'address')}
                    className="w-full pl-10 pr-4 py-3 bg-space-navy-600 border border-space-navy-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan-500 focus:border-transparent transition-smooth"
                    placeholder="Your address"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-4 border-t border-space-navy-500 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-soft-lavender-400 flex items-center gap-2">
                  <Users size={20} />
                  Emergency Contacts
                </h2>
                <span className="text-xs text-gray-400">At least 1 required</span>
              </div>

              <div className="space-y-4">
                {formData.emergencyContacts.map((contact, index) => (
                  <div key={index} className="space-y-3 p-4 bg-space-navy-600 rounded-lg border border-space-navy-500">
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-sm font-medium text-gray-300">Contact {index + 1}</p>
                      {formData.emergencyContacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEmergencyContact(index)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => handleEmergencyContactChange(index, 'name', e.target.value)}
                      className="w-full px-4 py-2 bg-space-navy-700 border border-space-navy-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan-500 focus:border-transparent transition-smooth"
                      placeholder="Name"
                      required
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => handleEmergencyContactChange(index, 'phone', e.target.value)}
                        className="w-full px-4 py-2 bg-space-navy-700 border border-space-navy-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-cyan-500 focus:border-transparent transition-smooth"
                        placeholder="Phone"
                        required
                      />

                      <select
                        value={contact.relationship}
                        onChange={(e) => handleEmergencyContactChange(index, 'relationship', e.target.value)}
                        className="w-full px-4 py-2 bg-space-navy-700 border border-space-navy-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-neon-cyan-500 focus:border-transparent transition-smooth"
                        required
                      >
                        <option value="">Relationship</option>
                        {EMERGENCY_RELATIONS.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {formData.emergencyContacts.length < 5 && (
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="w-full py-2 px-4 border-2 border-dashed border-neon-cyan-500 rounded-lg text-neon-cyan-400 hover:bg-neon-cyan-500/10 transition-smooth font-medium"
                >
                  + Add Another Contact
                </button>
              )}
            </div>

            {/* Toast */}
            {toast && (
              <div className={`p-3 rounded-lg text-sm font-medium ${
                toast.type === 'error'
                  ? 'bg-red-500/10 border border-red-500/50 text-red-400'
                  : 'bg-green-500/10 border border-green-500/50 text-green-400'
              }`}>
                {toast.message}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 items-center pt-6">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-3 px-4 rounded-lg font-medium text-white transition-smooth haptic-press bg-gradient-to-r from-neon-cyan-500 to-neon-cyan-600 hover:from-neon-cyan-600 hover:to-neon-cyan-700 shadow-neon-cyan ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </button>

              <button
                type="button"
                onClick={skipForNow}
                disabled={loading}
                className="px-6 py-3 text-gray-300 hover:text-white transition-smooth"
              >
                Skip for now
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
