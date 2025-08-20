import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, MessageSquare, Video, GraduationCap, Award } from "lucide-react";

const FeatureShowcase = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Alumni Network",
      description: "Connect with 15,000+ KEC alumni worldwide across industries",
      stats: "15,000+ Members",
      color: "#3b82f6",
      icon: Users
    },
    {
      title: "Career Opportunities",
      description: "Access exclusive job openings and placement drives",
      stats: "500+ Jobs Posted",
      color: "#10b981",
      icon: Briefcase
    },
    {
      title: "Community Posts",
      description: "Share updates, achievements, and stay connected",
      stats: "1,200+ Posts",
      color: "#8b5cf6",
      icon: MessageSquare
    },
    {
      title: "Virtual Meetings",
      description: "Join career guidance sessions and networking events",
      stats: "200+ Events/Year",
      color: "#f97316",
      icon: Video
    },
    {
      title: "Mentorship Program",
      description: "Get guidance from experienced alumni in your field",
      stats: "300+ Mentors",
      color: "#6366f1",
      icon: GraduationCap
    },
    {
      title: "Success Stories",
      description: "Read inspiring journeys of successful alumni",
      stats: "150+ Stories",
      color: "#ef4444",
      icon: Award
    }
  ];

  const handleFeatureClick = (featureTitle: string) => {
    const sectionMap: { [key: string]: string } = {
      "Alumni Network": "network",
      "Career Opportunities": "placements",
      "Community Posts": "home",
      "Virtual Meetings": "meetings",
      "Mentorship Program": "network",
      "Success Stories": "home"
    };
    
    const section = sectionMap[featureTitle];
    if (section) {
      navigate(`/dashboard?section=${section}`);
    }
  };

  return (
    <section className="py-20 px-5 bg-brand-background" data-section="features" id="why-choose-kec">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-brand-primary mb-4">
            Why Choose KEC Alumni Platform?
          </h2>
          <p className="text-xl text-brand-muted max-w-2xl mx-auto">
            Your gateway to a thriving community of engineers, innovators, and leaders
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={index} 
                className="bg-white p-6 rounded-lg shadow-sm border border-border cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-brand-primary/30"
                onClick={() => handleFeatureClick(feature.title)}
                onKeyDown={(e) => e.key === 'Enter' && handleFeatureClick(feature.title)}
                role="button"
                tabIndex={0}
                aria-label={`Learn more about ${feature.title}`}
              >
                <div className="flex items-center mb-4">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mr-4"
                    style={{ backgroundColor: feature.color }}
                  >
                    <IconComponent className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1">{feature.title}</h3>
                    <div className="text-sm font-medium" style={{ color: feature.color }}>{feature.stats}</div>
                  </div>
                </div>
                <p className="text-base text-brand-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <Button 
            size="lg" 
            className="bg-brand-secondary text-brand-primary text-lg px-8 py-4 hover:bg-brand-secondary/90"
            onClick={() => navigate('/signup')}
          >
            Join Our Community Today
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;