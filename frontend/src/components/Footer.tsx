import { GraduationCap, Linkedin, Twitter, Facebook, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import React from "react";

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-white" />
              <span className="text-xl font-bold text-white">KEC Alumni Network</span>
            </div>
            <p className="text-white/90">Connecting graduates worldwide through meaningful relationships and endless opportunities.</p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="icon" className="text-white hover:text-yellow-300 hover:bg-white/10" onClick={() => handleSocialMediaClick("linkedin")}>
                <Linkedin className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:text-blue-300 hover:bg-white/10" onClick={() => handleSocialMediaClick("twitter")}>
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:text-blue-400 hover:bg-white/10" onClick={() => handleSocialMediaClick("facebook")}>
                <Facebook className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { k: "directory", label: "Alumni Directory" },
                { k: "events", label: "Events" },
                { k: "career", label: "Career Center" },
                { k: "mentorship", label: "Mentorship Program" },
                { k: "giveback", label: "Give Back" },
              ].map((item) => (
                <li key={item.k}>
                  <button onClick={() => handleQuickLinkClick(item.k)} className="text-white/90 hover:text-yellow-300 transition-colors text-left">
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Resources</h3>
            <ul className="space-y-2">
              <li>
                <button onClick={() => navigate("/dashboard?section=placements")} className="text-white/90 hover:text-yellow-300 transition-colors text-left">Job Board</button>
              </li>
              <li>
                <button onClick={() => navigate("/dashboard?section=home")} className="text-white/90 hover:text-yellow-300 transition-colors text-left">Alumni News</button>
              </li>
              <li>
                <button onClick={() => window.open("mailto:benefits@kec.edu", "_blank")} className="text-white/90 hover:text-yellow-300 transition-colors text-left">Benefits & Discounts</button>
              </li>
              <li>
                <button onClick={() => window.open("https://store.kec.edu", "_blank")} className="text-white/90 hover:text-yellow-300 transition-colors text-left">University Store</button>
              </li>
              <li>
                <button onClick={() => window.open("mailto:support@kec.edu", "_blank")} className="text-white/90 hover:text-yellow-300 transition-colors text-left">Help Center</button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4 text-white">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-white/90">
                <Mail className="h-4 w-4 text-yellow-300" />
                <span>inspiranet@gmail.com</span>
              </div>
              <div className="flex items-center space-x-2 text-white/90">
                <MapPin className="h-4 w-4 text-yellow-300" />
                <span>Kongu Engineering College<br />Perundurai, Erode - 638060</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/80 text-sm">© 2025 KEC Alumni Network. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <button onClick={() => window.open("/privacy-policy", "_blank")} className="text-white/80 hover:text-yellow-300 text-sm transition-colors">Privacy Policy</button>
            <button onClick={() => window.open("/terms-of-service", "_blank")} className="text-white/80 hover:text-yellow-300 text-sm transition-colors">Terms of Service</button>
            <button onClick={() => navigate("/team")} className="text-sm transition-transform duration-200 hover:scale-105">
              <span className="font-serif font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-pink-500 drop-shadow">
                Developed by Beyond Bonds
              </span>
            </button>
            <button onClick={() => window.open("/cookie-policy", "_blank")} className="text-white/80 hover:text-yellow-300 text-sm transition-colors">Cookie Policy</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;