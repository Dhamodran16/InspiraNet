import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, MessageSquare, Video, GraduationCap, Award } from "lucide-react";

const EnhancedFeatureShowcase = () => {
  const navigate = useNavigate();

  const features = [
    { title: "Alumni Network", description: "Connect with 15,000+ KEC alumni worldwide across industries", color: "#3b82f6", icon: Users, gradient: "from-blue-500 to-blue-600" },
    { title: "Career Opportunities", description: "Access exclusive job openings and placement drives", color: "#10b981", icon: Briefcase, gradient: "from-green-500 to-green-600" },
    { title: "Community Posts", description: "Share updates, achievements, and stay connected", color: "#8b5cf6", icon: MessageSquare, gradient: "from-purple-500 to-purple-600" },
    { title: "Virtual Meetings", description: "Join career guidance sessions and networking events", color: "#f97316", icon: Video, gradient: "from-orange-500 to-orange-600" },
    { title: "Mentorship Program", description: "Get guidance from experienced alumni in your field", color: "#6366f1", icon: GraduationCap, gradient: "from-indigo-500 to-indigo-600" },
    { title: "Success Stories", description: "Read inspiring journeys of successful alumni", color: "#ef4444", icon: Award, gradient: "from-red-500 to-red-600" },
  ];

  const sectionMap: Record<string, string> = {
    "Alumni Network": "network",
    "Career Opportunities": "placements",
    "Community Posts": "home",
    "Virtual Meetings": "meetings",
    "Mentorship Program": "network",
    "Success Stories": "home",
  };

  return (
    <section className="py-20 px-5 bg-transparent relative" data-section="features">
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">Why Choose KEC Alumni Platform?</h2>
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">Your gateway to a thriving community of engineers, innovators, and leaders</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-black/30 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-white/15 cursor-pointer relative overflow-hidden text-white" onClick={() => navigate(`/dashboard?section=${sectionMap[f.title]}`)}>
                <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 hover:opacity-10 transition-opacity duration-300`} />
                <div className="flex items-center mb-6 relative">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mr-4 shadow-lg" style={{ background: `linear-gradient(135deg, ${f.color}, ${f.color}dd)` }}>
                    <Icon className="text-white text-2xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">{f.title}</h3>
                  </div>
                </div>
                <p className="text-white/85 leading-relaxed">{f.description}</p>
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent hover:border-white/20 transition-all duration-300" />
              </div>
            );
          })}
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/signup')}
            className="text-xl px-10 py-5 rounded-xl font-bold shadow-[0_14px_36px_rgba(0,0,0,0.5)] bg-gradient-to-r from-cyan-400 to-blue-600 text-white hover:from-cyan-300 hover:to-blue-500 border border-white/20"
          >
            Join Our Community Today
          </button>
        </div>
      </div>
    </section>
  );
};

export default EnhancedFeatureShowcase;