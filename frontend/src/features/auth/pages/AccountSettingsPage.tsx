import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { toast } from '../../../store/toastStore';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { 
  User, Lock, Bell, Settings, Trash2, Download, History, 
  Upload, Trash, ZoomIn, Eye, EyeOff, Check, X, ShieldAlert, Laptop,
  Globe, RefreshCw
} from 'lucide-react';

export const AccountSettingsPage: React.FC = () => {
  const { user, updateUser, clearSession } = useAuthStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'privacy' | 'notifications' | 'preferences' | 'logs' | 'danger'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);

  // States for user profiles/preferences
  const [profileData, setProfileData] = useState<any>({
    first_name: '',
    last_name: '',
    headline: '',
    bio: '',
    website_url: '',
    linkedin_url: '',
    github_url: '',
    twitter_url: '',
    display_name: '',
    country: '',
    timezone: 'UTC',
    preferred_language: 'en',
    occupation: '',
  });

  const [preferences, setPreferences] = useState<any>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    date_format: 'YYYY-MM-DD',
    accessibility_preferences: {},
    course_updates: true,
    assignment_reminders: true,
    quiz_reminders: true,
    ai_notifications: true,
    marketing_emails: false,
    community_notifications: true,
    purchase_emails: true,
    public_profile_visibility: true,
    show_achievements: true,
    show_certificates: true,
    show_enrolled_courses: true,
    messaging_preferences: 'ALL'
  });

  const [sessions, setSessions] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // Avatar Upload Zoom/Crop Mock modal state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [showCropModal, setShowCropModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security Form States
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [securityData, setSecurityData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
    new_email: '',
  });

  // Deactivate State
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deactivateFeedback, setDeactivateFeedback] = useState('');

  // Fetch initial preferences, profile, sessions, logs
  const fetchData = async () => {
    try {
      setIsPageLoading(true);
      // Fetch profile
      const profRes = await api.get('auth/profile/');
      setProfileData({
        first_name: profRes.data.user?.first_name || '',
        last_name: profRes.data.user?.last_name || '',
        headline: profRes.data.headline || '',
        bio: profRes.data.bio || '',
        website_url: profRes.data.website_url || '',
        linkedin_url: profRes.data.linkedin_url || '',
        github_url: profRes.data.github_url || '',
        twitter_url: profRes.data.twitter_url || '',
        display_name: profRes.data.display_name || '',
        country: profRes.data.country || '',
        timezone: profRes.data.timezone || 'UTC',
        preferred_language: profRes.data.preferred_language || 'en',
        occupation: profRes.data.occupation || '',
        avatar: profRes.data.avatar,
      });

      // Fetch preferences
      const prefRes = await api.get('auth/profile/preferences/');
      setPreferences(prefRes.data);

      // Fetch sessions
      const sessRes = await api.get('auth/sessions/');
      setSessions(sessRes.data);

      // Fetch activity logs
      const actRes = await api.get('auth/profile/activity/');
      setActivities(actRes.data);

    } catch (err) {
      toast.error('Failed to load profile details.');
    } finally {
      setIsPageLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute profile completion percentage
  const getProfileCompletion = () => {
    let completed = 0;
    const items = [
      { key: 'avatar', label: 'Upload Avatar', isDone: !!profileData.avatar, val: 15 },
      { key: 'bio', label: 'Add a Bio', isDone: !!profileData.bio, val: 15 },
      { key: 'occupation', label: 'Add Occupation', isDone: !!profileData.occupation, val: 15 },
      { key: 'social', label: 'Link Socials', isDone: !!(profileData.linkedin_url || profileData.github_url || profileData.website_url), val: 15 },
      { key: 'verified', label: 'Verify Email', isDone: !!user?.is_verified, val: 15 },
      { key: 'timezone', label: 'Set Timezone', isDone: profileData.timezone !== 'UTC' || preferences.timezone !== 'UTC', val: 10 },
      { key: '2fa', label: 'Enable 2FA', isDone: !!(user as any)?.two_factor_enabled, val: 15 }
    ];
    
    items.forEach(item => {
      if (item.isDone) completed += item.val;
    });

    return { percent: completed, items };
  };

  const completion = getProfileCompletion();

  // Save profile info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData();
      Object.entries(profileData).forEach(([key, val]) => {
        if (key !== 'avatar' && val !== null && val !== undefined) {
          formData.append(key, String(val));
        }
      });

      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await api.put('auth/profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Update auth store user details if names changed
      if (user) {
        updateUser({
          ...user,
          first_name: res.data.user.first_name,
          last_name: res.data.user.last_name,
        });
      }

      setAvatarFile(null);
      setAvatarPreview(null);
      
      // Update local profile data
      setProfileData((prev: any) => ({
        ...prev,
        avatar: res.data.avatar,
      }));

      toast.success('Profile updated successfully!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityData.current_password || !securityData.new_password || !securityData.confirm_password) {
      toast.error('All password fields are required.');
      return;
    }

    if (securityData.new_password !== securityData.confirm_password) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('auth/password/change/', {
        current_password: securityData.current_password,
        new_password: securityData.new_password,
      });
      toast.success('Password updated successfully!');
      setSecurityData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Request new email change verification
  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityData.new_email.trim()) {
      toast.error('New email is required.');
      return;
    }

    setIsLoading(true);
    try {
      // Create new EmailVerificationToken of type EMAIL_CHANGE
      await api.post('auth/email/change-request/', {
        new_email: securityData.new_email,
      });
      toast.success('Verification link has been sent to your new email address.');
      setSecurityData(prev => ({ ...prev, new_email: '' }));
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to initiate email change.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save Preferences
  const handleSavePreferences = async (updatedPrefs?: any) => {
    const payload = updatedPrefs || preferences;
    setIsLoading(true);
    try {
      await api.put('auth/profile/preferences/', payload);
      setPreferences(payload);
      toast.success('Preferences saved successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save settings.');
    } finally {
      setIsLoading(false);
    }
  };

  // Revoke Session
  const handleRevokeSession = async (sessionId: string) => {
    try {
      await api.post('auth/sessions/', {
        action: 'revoke',
        session_id: sessionId,
      });
      toast.success('Device logged out successfully.');
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      toast.error('Failed to log out device.');
    }
  };

  // Logout All Other Sessions
  const handleRevokeAllOtherSessions = async () => {
    try {
      await api.post('auth/sessions/', {
        action: 'revoke_all_other',
      });
      toast.success('Logged out from all other devices.');
      // Refresh session list
      const sessRes = await api.get('auth/sessions/');
      setSessions(sessRes.data);
    } catch (err) {
      toast.error('Failed to logout other sessions.');
    }
  };

  // Data Export
  const handleDataExport = async () => {
    try {
      toast.info('Preparing your data export archive. Download will begin shortly...');
      const res = await api.get('auth/profile/export/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `skillsphere_export_${user?.username}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to export your data.');
    }
  };

  // Deactivate/Delete Account
  const handleDeactivateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactivatePassword) {
      toast.error('Password is required to confirm deletion.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('auth/profile/delete/', {
        password: deactivatePassword,
        feedback: deactivateFeedback,
      });
      toast.success('Account deactivated. Thank you for using SkillSphere!');
      clearSession();
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Deactivation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Setup Avatar File change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setZoomScale(1);
      setShowCropModal(true);
    }
  };

  const handleSaveAvatarMock = () => {
    setShowCropModal(false);
    toast.success('Avatar crop applied! Click "Save Profile Changes" at the bottom to upload.');
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsLoading(true);
      await api.put('auth/profile/', { ...profileData, avatar: null });
      setProfileData((prev: any) => ({ ...prev, avatar: null }));
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success('Avatar removed.');
      fetchData();
    } catch (err) {
      toast.error('Failed to remove avatar.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-xs text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-brand-600" />
        <span>Loading account settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      
      {/* Page Title & Profile Completion */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <Settings className="h-5 w-5 text-indigo-650" />
            Account settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-light">
            Manage your public profile information, settings preferences, and session security.
          </p>
        </div>

        {/* Profile Completion Bar widget */}
        <Card className="p-4 w-full md:max-w-xs border-slate-200/50 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex justify-between items-center mb-1 text-[10px] font-bold">
            <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wide">Profile completion</span>
            <span className="text-indigo-650 dark:text-indigo-400">{completion.percent}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden border">
            <div 
              className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
              style={{ width: `${completion.percent}%` }}
            />
          </div>
          {completion.percent < 100 && (
            <p className="text-[9px] text-slate-405 mt-1.5 leading-normal">
              Next: <span className="text-slate-650 dark:text-slate-350 font-semibold">{completion.items.find(i => !i.isDone)?.label}</span>
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Navigation Sidebar */}
        <div className="flex flex-col gap-1.5 lg:col-span-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${activeTab === 'profile' ? 'bg-indigo-650 text-white shadow-md shadow-indigo-500/10' : 'text-slate-650 hover:bg-slate-150 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
          >
            <User className="h-4.5 w-4.5" />
            Profile Info
          </button>
          
          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${activeTab === 'security' ? 'bg-indigo-650 text-white shadow-md shadow-indigo-500/10' : 'text-slate-650 hover:bg-slate-150 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
          >
            <Lock className="h-4.5 w-4.5" />
            Security & Login
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${activeTab === 'privacy' ? 'bg-indigo-650 text-white shadow-md shadow-indigo-500/10' : 'text-slate-650 hover:bg-slate-150 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
          >
            <Eye className="h-4.5 w-4.5" />
            Privacy Toggles
          </button>
          
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${activeTab === 'notifications' ? 'bg-indigo-650 text-white shadow-md shadow-indigo-500/10' : 'text-slate-650 hover:bg-slate-150 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
          >
            <Bell className="h-4.5 w-4.5" />
            Notification Rules
          </button>
          
          <button
            onClick={() => setActiveTab('preferences')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${activeTab === 'preferences' ? 'bg-indigo-650 text-white shadow-md shadow-indigo-500/10' : 'text-slate-650 hover:bg-slate-150 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
          >
            <Globe className="h-4.5 w-4.5" />
            General Settings
          </button>
          
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${activeTab === 'logs' ? 'bg-indigo-650 text-white shadow-md shadow-indigo-500/10' : 'text-slate-650 hover:bg-slate-150 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
          >
            <History className="h-4.5 w-4.5" />
            Security Activity
          </button>
          
          <div className="border-t border-slate-200/60 dark:border-slate-800/40 my-3" />
          
          <button
            onClick={() => setActiveTab('danger')}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${activeTab === 'danger' ? 'bg-rose-600 text-white shadow-md shadow-rose-500/10' : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/10'}`}
          >
            <Trash2 className="h-4.5 w-4.5" />
            Deactivate Account
          </button>
        </div>

        {/* Tab Workspace Panels */}
        <div className="lg:col-span-3">
          
          {/* PROFILE INFO TAB */}
          {activeTab === 'profile' && (
            <Card className="p-6 border-slate-200/50 space-y-6">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b dark:border-slate-800 pb-3">
                Public profile info
              </h3>

              <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
                
                {/* Avatar upload center */}
                <div className="flex flex-col sm:flex-row gap-5 items-center">
                  <div className="relative">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="h-20 w-20 rounded-2xl object-cover border-2 border-brand-500" />
                    ) : profileData.avatar ? (
                      <img src={profileData.avatar} alt="Avatar" className="h-20 w-20 rounded-2xl object-cover border" />
                    ) : (
                      <div className="h-20 w-20 rounded-2xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 border border-brand-100 flex items-center justify-center font-bold text-lg">
                        {user?.username?.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-center sm:text-left">
                    <span className="font-bold text-slate-700 dark:text-slate-350 block">Profile Picture</span>
                    <p className="text-[10px] text-slate-400">JPG, PNG, max 2MB. Crops automatically.</p>
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleAvatarChange} 
                        accept="image/*"
                        className="hidden" 
                      />
                      <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-3 w-3 mr-1" />
                        Choose File
                      </Button>
                      {profileData.avatar && (
                        <Button type="button" size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={handleRemoveAvatar}>
                          <Trash className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="Display Name" 
                    value={profileData.display_name} 
                    onChange={e => setProfileData({...profileData, display_name: e.target.value})} 
                    placeholder="John Doe" 
                  />
                  <Input 
                    label="Occupation" 
                    value={profileData.occupation} 
                    onChange={e => setProfileData({...profileData, occupation: e.target.value})} 
                    placeholder="Frontend Engineer" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="First Name" 
                    value={profileData.first_name} 
                    onChange={e => setProfileData({...profileData, first_name: e.target.value})} 
                  />
                  <Input 
                    label="Last Name" 
                    value={profileData.last_name} 
                    onChange={e => setProfileData({...profileData, last_name: e.target.value})} 
                  />
                </div>

                <Input 
                  label="Headline" 
                  value={profileData.headline} 
                  onChange={e => setProfileData({...profileData, headline: e.target.value})} 
                  placeholder="Passionate learner building scalable AI apps" 
                />

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">Biography</label>
                  <textarea 
                    value={profileData.bio} 
                    onChange={e => setProfileData({...profileData, bio: e.target.value})} 
                    rows={4}
                    placeholder="Tell us a little about your journey, interests, or career..."
                    className="w-full px-3 py-2 text-xs rounded-xl border dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    label="Country" 
                    value={profileData.country} 
                    onChange={e => setProfileData({...profileData, country: e.target.value})} 
                    placeholder="United States" 
                  />
                  <Input 
                    label="Website Link" 
                    value={profileData.website_url} 
                    onChange={e => setProfileData({...profileData, website_url: e.target.value})} 
                    placeholder="https://example.com" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input 
                    label="GitHub Profile URL" 
                    value={profileData.github_url} 
                    onChange={e => setProfileData({...profileData, github_url: e.target.value})} 
                    placeholder="https://github.com/username" 
                  />
                  <Input 
                    label="LinkedIn Profile URL" 
                    value={profileData.linkedin_url} 
                    onChange={e => setProfileData({...profileData, linkedin_url: e.target.value})} 
                    placeholder="https://linkedin.com/in/username" 
                  />
                  <Input 
                    label="Twitter / X Profile URL" 
                    value={profileData.twitter_url} 
                    onChange={e => setProfileData({...profileData, twitter_url: e.target.value})} 
                    placeholder="https://twitter.com/username" 
                  />
                </div>

                <div className="flex justify-end pt-3">
                  <Button type="submit" isLoading={isLoading} className="font-bold">
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* SECURITY & LOGINS TAB */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              
              {/* Email Change */}
              <Card className="p-6 border-slate-200/50 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b dark:border-slate-800 pb-3">
                  Change email address
                </h3>
                <form onSubmit={handleRequestEmailChange} className="space-y-4 text-xs">
                  <p className="text-[10px] text-slate-400">
                    Currently verified: <span className="font-bold text-slate-650 dark:text-slate-350">{user?.email}</span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 w-full">
                      <Input
                        label="New Email Address"
                        type="email"
                        value={securityData.new_email}
                        onChange={e => setSecurityData({...securityData, new_email: e.target.value})}
                        placeholder="new-email@example.com"
                      />
                    </div>
                    <Button type="submit" isLoading={isLoading} className="font-bold">
                      Verify & Change Email
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Password Change */}
              <Card className="p-6 border-slate-200/50 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white border-b dark:border-slate-800 pb-3">
                  Update password
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                  <div className="relative">
                    <Input
                      label="Current Password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={securityData.current_password}
                      onChange={e => setSecurityData({...securityData, current_password: e.target.value})}
                      rightIcon={
                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="text-slate-400">
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <Input
                        label="New Password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={securityData.new_password}
                        onChange={e => setSecurityData({...securityData, new_password: e.target.value})}
                        rightIcon={
                          <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="text-slate-400">
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        }
                      />
                    </div>
                    <Input
                      label="Confirm New Password"
                      type="password"
                      value={securityData.confirm_password}
                      onChange={e => setSecurityData({...securityData, confirm_password: e.target.value})}
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" isLoading={isLoading} className="font-bold">
                      Change Password
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Device Sessions */}
              <Card className="p-6 border-slate-200/50 space-y-5">
                <div className="flex justify-between items-center border-b dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">Active device sessions</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Revoke any sessions you do not recognize.</p>
                  </div>
                  {sessions.length > 1 && (
                    <Button variant="outline" size="sm" onClick={handleRevokeAllOtherSessions} className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold">
                      Sign Out Other Devices
                    </Button>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  {sessions.map((sess) => (
                    <div key={sess.id} className="flex justify-between items-center p-3.5 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 rounded-xl">
                      <div className="flex gap-3 items-center min-w-0">
                        <Laptop className="h-5 w-5 text-slate-450 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-250 block">
                            {sess.browser} on {sess.device_type}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            IP: {sess.ip_address} • Location: {sess.country} • Last Active: {new Date(sess.last_active).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-slate-500 hover:text-rose-600" onClick={() => handleRevokeSession(sess.id)}>
                        Revoke
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          )}

          {/* PRIVACY TOGGLES TAB */}
          {activeTab === 'privacy' && (
            <Card className="p-6 border-slate-200/50 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Privacy controls</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Toggle what other students and instructors can see.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-start gap-4 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 dark:text-slate-250 block">Public Profile Visibility</span>
                    <p className="text-[9px] text-slate-400 leading-relaxed">If disabled, only you and administrators can access your public profile page.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.public_profile_visibility}
                    onChange={(e) => {
                      const next = { ...preferences, public_profile_visibility: e.target.checked };
                      setPreferences(next);
                      handleSavePreferences(next);
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer mt-0.5" 
                  />
                </div>

                <div className="flex justify-between items-start gap-4 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 dark:text-slate-250 block">Show Achievements</span>
                    <p className="text-[9px] text-slate-400 leading-relaxed">Display earned badges, experience points (XP), and learning streaks publicly.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.show_achievements}
                    onChange={(e) => {
                      const next = { ...preferences, show_achievements: e.target.checked };
                      setPreferences(next);
                      handleSavePreferences(next);
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer mt-0.5" 
                  />
                </div>

                <div className="flex justify-between items-start gap-4 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 dark:text-slate-250 block">Show Certificates</span>
                    <p className="text-[9px] text-slate-400 leading-relaxed">Allow others to inspect verified course credentials in your profile gallery.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.show_certificates}
                    onChange={(e) => {
                      const next = { ...preferences, show_certificates: e.target.checked };
                      setPreferences(next);
                      handleSavePreferences(next);
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer mt-0.5" 
                  />
                </div>

                <div className="flex justify-between items-start gap-4 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-xl border">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 dark:text-slate-250 block">Show Enrolled Courses</span>
                    <p className="text-[9px] text-slate-400 leading-relaxed">Display current active studies queue and academic interests.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.show_enrolled_courses}
                    onChange={(e) => {
                      const next = { ...preferences, show_enrolled_courses: e.target.checked };
                      setPreferences(next);
                      handleSavePreferences(next);
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer mt-0.5" 
                  />
                </div>
              </div>
            </Card>
          )}

          {/* NOTIFICATION PREFERENCES TAB */}
          {activeTab === 'notifications' && (
            <Card className="p-6 border-slate-200/50 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Email & alert rules</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Define granular controls for transactional alerts.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center border-b pb-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-850 dark:text-slate-200 block">Course Updates</span>
                    <p className="text-[9px] text-slate-400">Receive alerts when instructors publish new lessons or documents.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.course_updates}
                    onChange={(e) => {
                      const next = { ...preferences, course_updates: e.target.checked };
                      setPreferences(next);
                      handleSavePreferences(next);
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer" 
                  />
                </div>

                <div className="flex justify-between items-center border-b pb-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-850 dark:text-slate-200 block">Assignment reminders</span>
                    <p className="text-[9px] text-slate-400">Alert me about approaching grading submissions deadlines.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.assignment_reminders}
                    onChange={(e) => {
                      const next = { ...preferences, assignment_reminders: e.target.checked };
                      setPreferences(next);
                      handleSavePreferences(next);
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer" 
                  />
                </div>

                <div className="flex justify-between items-center border-b pb-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-850 dark:text-slate-200 block">Quiz reminders</span>
                    <p className="text-[9px] text-slate-400">Alert me when new test assignments are unlocked.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.quiz_reminders}
                    onChange={(e) => {
                      const next = { ...preferences, quiz_reminders: e.target.checked };
                      setPreferences(next);
                      handleSavePreferences(next);
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer" 
                  />
                </div>

                <div className="flex justify-between items-center border-b pb-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-850 dark:text-slate-200 block">AI Tutor Notifications</span>
                    <p className="text-[9px] text-slate-400">Notification updates regarding study planner milestones and RAG indexes.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.ai_notifications}
                    onChange={(e) => {
                      const next = { ...preferences, ai_notifications: e.target.checked };
                      setPreferences(next);
                      handleSavePreferences(next);
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer" 
                  />
                </div>

                <div className="flex justify-between items-center border-b pb-3">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-850 dark:text-slate-200 block">Marketing & Newsletters</span>
                    <p className="text-[9px] text-slate-400">Hear about new premium courses, offers, or newsletters.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.marketing_emails}
                    onChange={(e) => {
                      const next = { ...preferences, marketing_emails: e.target.checked };
                      setPreferences(next);
                      handleSavePreferences(next);
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer" 
                  />
                </div>

                <div className="flex justify-between items-center pb-1">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-850 dark:text-slate-200 block">Purchase Receipts</span>
                    <p className="text-[9px] text-slate-400">Transactional purchase invoices and receipt documents.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={preferences.purchase_emails}
                    onChange={(e) => {
                      const next = { ...preferences, purchase_emails: e.target.checked };
                      setPreferences(next);
                      handleSavePreferences(next);
                    }}
                    className="rounded text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 cursor-pointer" 
                  />
                </div>
              </div>
            </Card>
          )}

          {/* GENERAL PREFERENCES TAB */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <Card className="p-6 border-slate-200/50 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Account display configuration</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Customize default theme, language, and format styling.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Theme Mode</label>
                    <select
                      value={preferences.theme}
                      onChange={(e) => {
                        const next = { ...preferences, theme: e.target.value };
                        setPreferences(next);
                        handleSavePreferences(next);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                      <option value="system">System Synced</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Primary Language</label>
                    <select
                      value={preferences.language}
                      onChange={(e) => {
                        const next = { ...preferences, language: e.target.value };
                        setPreferences(next);
                        handleSavePreferences(next);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Time Zone</label>
                    <select
                      value={preferences.timezone}
                      onChange={(e) => {
                        const next = { ...preferences, timezone: e.target.value };
                        setPreferences(next);
                        handleSavePreferences(next);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="UTC">UTC / Coordinated Universal Time</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300">Date Format</label>
                    <select
                      value={preferences.date_format}
                      onChange={(e) => {
                        const next = { ...preferences, date_format: e.target.value };
                        setPreferences(next);
                        handleSavePreferences(next);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-100"
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Data Export section */}
              <Card className="p-6 border-slate-200/50 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 flex items-center justify-center shrink-0 border">
                    <Download className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Export personal data</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                      Download a packaged ZIP archive containing profile information, enrollments list, certificate credentials, and assignment scores.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleDataExport} className="font-bold">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Request Data ZIP Export
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* SECURITY LOGS TAB */}
          {activeTab === 'logs' && (
            <Card className="p-6 border-slate-200/50 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Security & activity logs</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Recent audit events recorded on your account.</p>
              </div>

              <div className="relative border-l border-slate-100 dark:border-slate-800/80 pl-4 ml-2 space-y-6 text-xs">
                {activities.map((act) => (
                  <div key={act.id} className="relative space-y-1">
                    <div className="absolute -left-[21.5px] top-1.5 h-2 w-2 rounded-full bg-brand-500 ring-4 ring-white dark:ring-slate-900" />
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {act.event_type}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {act.description}
                    </p>
                    {act.ip_address && (
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-slate-950 px-1 py-0.5 rounded">
                        IP: {act.ip_address}
                      </span>
                    )}
                  </div>
                ))}
                {activities.length === 0 && (
                  <p className="text-slate-400 text-center py-6">No audit activities logged.</p>
                )}
              </div>
            </Card>
          )}

          {/* DANGER TAB */}
          {activeTab === 'danger' && (
            <Card className="p-6 border-rose-200 dark:border-rose-950/20 bg-rose-50/5 dark:bg-rose-950/5 space-y-6">
              <div className="flex items-start gap-3 border-b border-rose-100 dark:border-rose-950/10 pb-4">
                <div className="h-10 w-10 bg-rose-100 dark:bg-rose-950/30 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">Deactivate user account</h3>
                  <p className="text-[10px] text-rose-600/80 mt-0.5">Please read the warnings below carefully.</p>
                </div>
              </div>

              <div className="text-xs space-y-3 text-slate-650 dark:text-slate-400 leading-relaxed">
                <p>
                  By initiating account deactivation:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your user profile, public portfolio, and access console will be disabled instantly.</li>
                  <li>We preserve your enrolled course progress, quizzes, and certificates during a <span className="font-bold text-slate-800 dark:text-slate-200">30-day deactivation retention period</span>.</li>
                  <li>You can restore your account at any time within 30 days by signing back in and contacting support.</li>
                  <li>After 30 days, your account data will be permanently and irreversibly purged from our databases.</li>
                </ul>
              </div>

              <form onSubmit={handleDeactivateAccount} className="space-y-4 text-xs pt-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-350">Optional feedback (Why are you leaving?)</label>
                  <textarea 
                    value={deactivateFeedback}
                    onChange={e => setDeactivateFeedback(e.target.value)}
                    rows={3}
                    placeholder="Tell us what we could improve..."
                    className="w-full px-3 py-2 text-xs rounded-xl border dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <Input
                  label="Password Confirmation"
                  type="password"
                  value={deactivatePassword}
                  onChange={e => setDeactivatePassword(e.target.value)}
                  placeholder="Enter your password to confirm deactivation"
                />

                <div className="flex justify-end pt-2">
                  <Button type="submit" isLoading={isLoading} className="bg-rose-600 hover:bg-rose-500 border-0 text-white font-bold shadow-md shadow-rose-600/10">
                    Deactivate Account
                  </Button>
                </div>
              </form>
            </Card>
          )}

        </div>
      </div>

      {/* CROP AVATAR MODAL */}
      {showCropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 border shadow-2xl rounded-2xl space-y-5 animate-scale-in">
            <div className="flex justify-between items-center border-b pb-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <ZoomIn className="h-4 w-4 text-brand-600" />
                Adjust Avatar Zoom
              </h4>
              <button onClick={() => setShowCropModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="h-32 w-32 rounded-full overflow-hidden border-2 border-brand-500 flex items-center justify-center bg-slate-100 dark:bg-slate-950">
                {avatarPreview && (
                  <img 
                    src={avatarPreview} 
                    alt="Preview" 
                    className="h-full w-full object-cover transition-transform duration-75"
                    style={{ transform: `scale(${zoomScale})` }}
                  />
                )}
              </div>

              <div className="w-full space-y-1">
                <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                  <span>Zoom Level</span>
                  <span>{Math.round(zoomScale * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoomScale}
                  onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t pt-3">
              <Button size="sm" variant="outline" onClick={() => { setShowCropModal(false); setAvatarFile(null); setAvatarPreview(null); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveAvatarMock} className="font-bold">
                <Check className="h-3.5 w-3.5 mr-1" />
                Apply Zoom
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};
