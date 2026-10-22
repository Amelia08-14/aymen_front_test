import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { grantTrackerConsent, revokeTrackerConsent } from '../utils/aymenTracker';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà fait un choix
    const cookieConsent = localStorage.getItem('aymen_cookie_consent');
    // Visiteur ayant déjà accepté : le suivi doit reprendre sans rouvrir le bandeau
    if (cookieConsent === 'accepted') grantTrackerConsent();
    if (!cookieConsent) {
      // Un petit délai pour ne pas agresser l'utilisateur dès la première seconde
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('aymen_cookie_consent', 'accepted');
    setIsVisible(false);
    
    // Si nous avons des scripts qui nécessitent un consentement (comme GA ou Meta Pixel),
    // nous pourrions déclencher un événement personnalisé ici pour les charger
    window.dispatchEvent(new Event('cookie_consent_accepted'));
    grantTrackerConsent();
  };

  const handleDecline = () => {
    localStorage.setItem('aymen_cookie_consent', 'declined');
    setIsVisible(false);
    revokeTrackerConsent();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-[100] animate-fadeInUp">
      {/* Bande de fond avec flou et bordure */}
      <div className="bg-[#031B17]/95 backdrop-blur-md border-t border-white/10 p-4 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <div className="container mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
          
          {/* Texte d'information */}
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-[#F7C66A] font-bold text-lg mb-1 flex items-center justify-center md:justify-start gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
                <path d="M8.5 8.5v.01" />
                <path d="M16 15.5v.01" />
                <path d="M12 12v.01" />
                <path d="M11 17v.01" />
                <path d="M7 14v.01" />
              </svg>
              Gestion des cookies
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Nous utilisons des cookies pour améliorer votre expérience de navigation, analyser le trafic de notre site et personnaliser le contenu conformément à la législation algérienne (Loi 18-07) et aux normes internationales (RGPD). 
              <Link to="/confidentialite" className="text-[#F7C66A] hover:underline ml-1 font-medium">
                En savoir plus
              </Link>
            </p>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row items-center gap-3 min-w-max">
            <button 
              onClick={handleDecline}
              className="px-6 py-2.5 rounded-full border border-white/20 text-white/90 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors w-full sm:w-auto"
            >
              Refuser
            </button>
            <button 
              onClick={handleAccept}
              className="px-6 py-2.5 rounded-full bg-[#F7C66A] text-[#031B17] border border-[#F7C66A] text-xs font-bold uppercase tracking-widest hover:bg-white hover:border-white hover:text-[#031B17] transition-all shadow-[0_0_15px_rgba(247,198,106,0.3)] w-full sm:w-auto"
            >
              Accepter tout
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
