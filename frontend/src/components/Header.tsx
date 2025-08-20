import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Header = ({ onLogin }: { onLogin?: () => void }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    if (onLogin) {
      onLogin();
    } else {
      navigate('/signin');
    }
  };

  const handleSignUp = () => {
    navigate('/signup');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-5">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
            role="button"
            tabIndex={0}
            aria-label="Navigate to home page"
          >
            <img 
              src="/favicon.png" 
              alt="KEC Alumni Network Logo" 
              className="w-8 h-8 rounded"
            />
            <span className="text-xl font-bold text-brand-primary">KEC Alumni Network</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="outline" onClick={handleLogin}>Login</Button>
            <Button variant="default" onClick={handleSignUp}>Join Network</Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? '✕' : '☰'}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={handleLogin}>Login</Button>
              <Button variant="default" onClick={handleSignUp}>Join Network</Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;