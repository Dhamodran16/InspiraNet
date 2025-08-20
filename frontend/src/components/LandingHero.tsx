import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const LandingHero = () => {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    const el = document.querySelector('[data-section="features"]');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center text-white">
      {/* Center content */}
      <div className="z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.h1
          className="text-5xl md:text-7xl font-extrabold leading-tight drop-shadow-[0_6px_24px_rgba(0,0,0,0.6)]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Connect, Grow,
          <span className="block text-yellow-300">Succeed Together</span>
        </motion.h1>

        <motion.p
          className="mt-6 text-lg md:text-2xl max-w-3xl mx-auto backdrop-blur-md bg-black/40 rounded-2xl px-6 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Join thousands of alumni building lasting connections, advancing careers, and creating opportunities that matter.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <button
            className="text-lg px-8 py-4 rounded-xl font-bold shadow-[0_12px_30px_rgba(0,0,0,0.45)] bg-yellow-300 text-slate-900 hover:bg-yellow-200 transition-transform hover:-translate-y-0.5"
            onClick={() => navigate('/signup')}
          >
            Join the Network
          </button>

        </motion.div>
      </div>
    </section>
  );
};

export default LandingHero;
