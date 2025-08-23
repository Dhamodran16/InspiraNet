import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Linkedin, Twitter, Facebook, Mail, Users, Calendar, Briefcase, Heart } from 'lucide-react';

type FooterProps = { transparent?: boolean };

const Footer: React.FC<FooterProps> = ({ transparent = true }) => {
  const navigate = useNavigate();

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
    ? "bg-black/40 backdrop-blur-sm text-white"
    : "bg-primary text-primary-foreground";

  return (
    <footer className={rootClasses}>
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-yellow-300">KEC Alumni Network</h3>
            <p className="text-white/80 text-sm">
              Connecting Kongu Engineering College alumni worldwide through networking, 
              mentorship, and career opportunities.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => handleSocialMediaClick('linkedin')}
                className="text-white/60 hover:text-yellow-300 transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleSocialMediaClick('twitter')}
                className="text-white/60 hover:text-yellow-300 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleSocialMediaClick('facebook')}
                className="text-white/60 hover:text-yellow-300 transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-yellow-300">Quick Links</h4>
            <div className="space-y-2">
              <button
                onClick={() => handleQuickLinkClick('directory')}
                className="block text-white/80 hover:text-yellow-300 text-sm transition-colors flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Alumni Directory
              </button>
              <button
                onClick={() => handleQuickLinkClick('events')}
                className="block text-white/80 hover:text-yellow-300 text-sm transition-colors flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Events & Meetups
              </button>
              <button
                onClick={() => handleQuickLinkClick('career')}
                className="block text-white/80 hover:text-yellow-300 text-sm transition-colors flex items-center gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Career Opportunities
              </button>
              <button
                onClick={() => handleQuickLinkClick('mentorship')}
                className="block text-white/80 hover:text-yellow-300 text-sm transition-colors flex items-center gap-2"
              >
                <Heart className="h-4 w-4" />
                Mentorship Program
              </button>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-yellow-300">Contact Us</h4>
            <div className="space-y-2 text-sm text-white/80">
              <p>Kongu Engineering College</p>
              <p>Perundurai, Erode - 638060</p>
              <p>Tamil Nadu, India</p>
              <div className="flex items-center gap-2 mt-2">
                <Mail className="h-4 w-4" />
                <button
                  onClick={() => window.open("mailto:alumni@kec.edu", "_blank")}
                  className="hover:text-yellow-300 transition-colors"
                >
                  alumni@kec.edu
                </button>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-yellow-300">Stay Connected</h4>
            <p className="text-white/80 text-sm">
              Get updates about alumni events, job opportunities, and networking events.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-3 py-2 text-sm text-gray-900 bg-white rounded-l-md focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />
              <button className="px-4 py-2 bg-yellow-300 text-black text-sm font-medium rounded-r-md hover:bg-yellow-400 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-white/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/80 text-sm">© 2025 KEC Alumni Network. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <button 
              onClick={() => navigate('/privacy-policy')} 
              className="text-white/80 hover:text-yellow-300 text-sm transition-colors"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => navigate('/terms')} 
              className="text-white/80 hover:text-yellow-300 text-sm transition-colors"
            >
              Terms of Service
            </button>
            <button 
              onClick={() => navigate('/team')} 
              className="text-sm transition-transform duration-200 hover:scale-105"
            >
              <span className="font-serif font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 drop-shadow">
                Developed by Beyond Bonds
              </span>
            </button>
            <button 
              onClick={() => navigate('/cookie-policy')} 
              className="text-white/80 hover:text-yellow-300 text-sm transition-colors"
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

