import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Calendar, Briefcase, ArrowRight, Star, Award, Globe, Mail, Phone } from "lucide-react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface HeroProps {
  onJoinNetwork: () => void;
}

const Hero = ({ onJoinNetwork }: HeroProps) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heroRef.current) {
      // Parallax effect for background
      gsap.to(heroRef.current, {
        yPercent: -20,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });

      // Stagger animation for title and subtitle
      gsap.fromTo([titleRef.current, subtitleRef.current],
        { y: 50, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 1, 
          stagger: 0.3,
          ease: "power3.out"
        }
      );

      // CTA button animation
      gsap.fromTo(ctaRef.current,
        { scale: 0.8, opacity: 0 },
        { 
          scale: 1, 
          opacity: 1, 
          duration: 0.8, 
          delay: 0.6,
          ease: "back.out(1.7)"
        }
      );

      // Features animation
      gsap.fromTo(featuresRef.current?.children,
        { y: 100, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.8, 
          stagger: 0.2,
          delay: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: featuresRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );

      // Stats animation
      gsap.fromTo(statsRef.current?.children,
        { scale: 0, opacity: 0 },
        { 
          scale: 1, 
          opacity: 1, 
          duration: 0.6, 
          stagger: 0.1,
          delay: 1.2,
          ease: "back.out(1.7)",
          scrollTrigger: {
            trigger: statsRef.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          }
        }
      );
    }
  }, []);

  return (
    <div ref={heroRef} className="landing-hero relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute top-3/4 right-1/4 w-48 h-48 bg-gradient-to-br from-pink-400/20 to-red-400/20 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Content */}
        <div className="space-y-8">
          {/* Title and Subtitle */}
          <div className="space-y-6">
            <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold text-white leading-tight">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                KEC Alumni Network
              </span>
            </h1>
            <p ref={subtitleRef} className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Connect, collaborate, and grow with your fellow alumni. 
              Join thousands of KEC graduates building the future together.
            </p>
          </div>

          {/* CTA Buttons */}
          <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={onJoinNetwork}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300"
            >
              Join the Network
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg font-semibold backdrop-blur-sm"
            >
              Learn More
            </Button>
          </div>

          {/* Contact Information - removed as per request */}
        </div>

        {/* Features Grid */}
        <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-20">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-2">
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Network & Connect</h3>
              <p className="text-gray-400">Build meaningful connections with fellow alumni across the globe</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-2">
            <CardContent className="p-6 text-center">
              <Briefcase className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Career Growth</h3>
              <p className="text-gray-400">Access exclusive job opportunities and career development resources</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-2">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Stay Connected</h3>
              <p className="text-gray-400">Real-time messaging and collaboration with your network</p>
            </CardContent>
          </Card>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-6">Trusted by leading companies worldwide</p>
          <div className="flex justify-center items-center gap-8 opacity-50">
            <div className="text-white font-semibold">Google</div>
            <div className="text-white font-semibold">Microsoft</div>
            <div className="text-white font-semibold">Amazon</div>
            <div className="text-white font-semibold">Apple</div>
            <div className="text-white font-semibold">Meta</div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default Hero;