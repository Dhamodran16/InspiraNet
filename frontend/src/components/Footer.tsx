import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Linkedin, Twitter, Facebook, Mail, Users, Calendar, Briefcase, Heart } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

type FooterProps = { transparent?: boolean };

const Footer: React.FC<FooterProps> = ({ transparent = true }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const handleSocialMediaClick = (platform: string) => {
    const socialLinks = {
      linkedin: "https://linkedin.com/company/kec-alumni-network",
      twitter: "https://twitter.com/kecalumni",
      facebook: "https://facebook.com/kecalumninetwork",
    } as const;
    const url = socialLinks[platform as keyof typeof socialLinks];
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleQuickLinkClick = (link: string) => {
    const map: Record<string, string | null> = {
      directory: "/dashboard?section=network",
      events: "/dashboard?section=events",
      career: "/dashboard?section=placements",
      mentorship: "/dashboard?section=network",
      giveback: null,
    };
    const target = map[link];
    if (target) navigate(target);
    else window.open("mailto:alumni@kec.edu", "_blank");
  };

  const rootClasses = transparent
    ? isDark 
      ? "bg-gray-900/80 backdrop-blur-sm text-white border-t border-gray-700"
      : "bg-black/40 backdrop-blur-sm text-white"
    : isDark
      ? "bg-gray-900 text-white border-t border-gray-700"
      : "bg-primary text-primary-foreground";

  return (
    <footer className={rootClasses}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Company Info */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-300'}`}>KEC Alumni Network</h3>
            <p className={`text-sm sm:text-base ${isDark ? 'text-gray-300' : 'text-white/80'}`}>
              Connecting Kongu Engineering College alumni worldwide through networking, 
              mentorship, and career opportunities.
            </p>
            <div className="flex space-x-3 sm:space-x-4">
              <button
                onClick={() => handleSocialMediaClick('linkedin')}
                className={`transition-colors ${isDark ? 'text-gray-400 hover:text-yellow-400' : 'text-white/60 hover:text-yellow-300'}`}
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={() => handleSocialMediaClick('twitter')}
                className={`transition-colors ${isDark ? 'text-gray-400 hover:text-yellow-400' : 'text-white/60 hover:text-yellow-300'}`}
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <button
                onClick={() => handleSocialMediaClick('facebook')}
                className={`transition-colors ${isDark ? 'text-gray-400 hover:text-yellow-400' : 'text-white/60 hover:text-yellow-300'}`}
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-yellow-400' : 'text-yellow-300'}`}>Quick Links</h4>
            <div className="space-y-1.5 sm:space-y-2">
              <button
                onClick={() => handleQuickLinkClick('directory')}
                className={`block text-xs sm:text-sm transition-colors flex items-center gap-2 ${isDark ? 'text-gray-300 hover:text-yellow-400' : 'text-white/80 hover:text-yellow-300'}`}
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                Alumni Directory
              </button>
              <button
                onClick={() => handleQuickLinkClick('events')}
                className={`block text-xs sm:text-sm transition-colors flex items-center gap-2 ${isDark ? 'text-gray-300 hover:text-yellow-400' : 'text-white/80 hover:text-yellow-300'}`}
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                Events & Meetups
              </button>
              <button
                onClick={() => handleQuickLinkClick('career')}
                className={`block text-xs sm:text-sm transition-colors flex items-center gap-2 ${isDark ? 'text-gray-300 hover:text-yellow-400' : 'text-white/80 hover:text-yellow-300'}`}
              >
                <Briefcase className="h-3 w-3 sm:h-4 sm:w-4" />
                Career Opportunities
              </button>
              <button
                onClick={() => handleQuickLinkClick('mentorship')}
                className={`block text-xs sm:text-sm transition-colors flex items-center gap-2 ${isDark ? 'text-gray-300 hover:text-yellow-400' : 'text-white/80 hover:text-yellow-300'}`}
              >
                <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
                Mentorship Program
              </button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-yellow-400' : 'text-yellow-300'}`}>Contact Us</h4>
            <div className={`space-y-1.5 sm:space-y-2 text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-white/80'}`}>
              <p>Kongu Engineering College</p>
              <p>Perundurai, Erode - 638060</p>
              <p>Tamil Nadu, India</p>
              <div className="flex items-center gap-2 mt-2">
                <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                <button
                  onClick={() => window.open("mailto:alumni@kec.edu", "_blank")}
                  className={`transition-colors ${isDark ? 'hover:text-yellow-400' : 'hover:text-yellow-300'}`}
                >
                  alumni@kec.edu
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className={`border-t mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 ${isDark ? 'border-gray-700' : 'border-white/20'}`}>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-white/80'}`}>© 2025 KEC Alumni Network. All rights reserved.</p>
          <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6">
            <button 
              onClick={() => navigate('/privacy-policy')} 
              className={`text-xs sm:text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-yellow-400' : 'text-white/80 hover:text-yellow-300'}`}
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => navigate('/terms')} 
              className={`text-xs sm:text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-yellow-400' : 'text-white/80 hover:text-yellow-300'}`}
            >
              Terms of Service
            </button>
            <button 
              onClick={() => navigate('/team')} 
              className="text-xs sm:text-sm transition-transform duration-200 hover:scale-105"
            >
              <span className="font-serif font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 drop-shadow">
                Developed by Beyond Bonds
              </span>
            </button>
            <button 
              onClick={() => navigate('/cookie-policy')} 
              className={`text-xs sm:text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-yellow-400' : 'text-white/80 hover:text-yellow-300'}`}
            >
              Cookie Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

