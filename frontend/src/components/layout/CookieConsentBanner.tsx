import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { X, Shield, Settings, Check } from 'lucide-react';

export const CookieConsentBanner: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [isVisible, setIsVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    functional: false,
    marketing: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('skillsphere-cookie-consent');
    if (!saved) {
      setIsVisible(true);
    } else {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        setIsVisible(true);
      }
    }
  }, []);

  const savePreferences = async (prefs: typeof preferences) => {
    localStorage.setItem('skillsphere-cookie-consent', JSON.stringify(prefs));
    setIsVisible(false);
    
    if (isAuthenticated) {
      try {
        await api.put('auth/profile/preferences/', {
          cookie_consent_essential: prefs.essential,
          cookie_consent_analytics: prefs.analytics,
          cookie_consent_functional: prefs.functional,
          cookie_consent_marketing: prefs.marketing,
          cookie_consent_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to sync cookie preferences to backend:', err);
      }
    }
  };

  const handleAcceptAll = () => {
    const all = { essential: true, analytics: true, functional: true, marketing: true };
    setPreferences(all);
    savePreferences(all);
  };

  const handleRejectAll = () => {
    const min = { essential: true, analytics: false, functional: false, marketing: false };
    setPreferences(min);
    savePreferences(min);
  };

  const handleSaveCustom = () => {
    savePreferences(preferences);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-2xl flex flex-col gap-4">
        
        {!showCustomize ? (
          <>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100 dark:border-brand-900/30">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Cookie Consent</h4>
                <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed">
                  We use cookies to optimize platform performance, analyze traffic, and support personalized marketing tools.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowCustomize(true)} className="text-slate-500 font-bold">
                <Settings className="h-3.5 w-3.5 mr-1" />
                Customize
              </Button>
              <Button variant="outline" size="sm" onClick={handleRejectAll} className="font-bold">
                Reject All
              </Button>
              <Button size="sm" onClick={handleAcceptAll} className="font-bold">
                Accept All
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Settings className="h-4.5 w-4.5 text-brand-600" />
                Cookie Preferences
              </h4>
              <button onClick={() => setShowCustomize(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {/* Essential */}
              <div className="flex items-center justify-between gap-4 p-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Essential Cookies</span>
                  <p className="text-[9px] text-slate-400">Required for logging in, checkout, and core security.</p>
                </div>
                <input type="checkbox" checked disabled className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5 cursor-not-allowed" />
              </div>

              {/* Functional */}
              <div className="flex items-center justify-between gap-4 p-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Functional Cookies</span>
                  <p className="text-[9px] text-slate-400">Remembers settings, theme modes, and layout states.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={preferences.functional}
                  onChange={(e) => setPreferences(prev => ({ ...prev, functional: e.target.checked }))}
                  className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5 cursor-pointer" 
                />
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between gap-4 p-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Analytics Cookies</span>
                  <p className="text-[9px] text-slate-400">Helps us monitor performance and page load metrics.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences(prev => ({ ...prev, analytics: e.target.checked }))}
                  className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5 cursor-pointer" 
                />
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between gap-4 p-2 bg-slate-50 dark:bg-slate-950/30 rounded-lg">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">Marketing (Future-ready)</span>
                  <p className="text-[9px] text-slate-400">Used to deliver targeted ads and analyze campaigns.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences(prev => ({ ...prev, marketing: e.target.checked }))}
                  className="rounded text-brand-600 focus:ring-brand-500 h-3.5 w-3.5 cursor-pointer" 
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
              <Button variant="ghost" size="sm" onClick={() => setShowCustomize(false)}>
                Back
              </Button>
              <Button size="sm" onClick={handleSaveCustom}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Save Preferences
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
