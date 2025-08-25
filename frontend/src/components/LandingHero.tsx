import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const LandingHero = () => {
  const navigate = useNavigate();

  const scrollToFeatures = () => {
    const el = document.querySelector('[data-section="features"]');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center text-white px-4 sm:px-6 lg:px-8">
      {/* Center content */}
      <div className="z-10 max-w-5xl mx-auto text-center w-full">
        <motion.h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight drop-shadow-[0_6px_24px_rgba(0,0,0,0.6)] px-2"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Connect, Grow,
          <span className="block text-yellow-300 mt-2 sm:mt-0">Succeed Together</span>
        </motion.h1>

        <motion.p
          className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl lg:text-2xl max-w-2xl sm:max-w-3xl mx-auto backdrop-blur-md bg-black/40 rounded-2xl px-4 sm:px-6 py-4 sm:py-5 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Join thousands of alumni building lasting connections, advancing careers, and creating opportunities that matter.
        </motion.p>

        <motion.div
          className="mt-6 sm:mt-8 lg:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <button
            className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold shadow-[0_12px_30px_rgba(0,0,0,0.45)] bg-yellow-300 text-slate-900 hover:bg-yellow-200 transition-transform hover:-translate-y-0.5"
            onClick={() => navigate('/signup')}
          >
            Join the Network
          </button>

          <button
            className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold shadow-[0_12px_30px_rgba(0,0,0,0.45)] bg-transparent border-2 border-white text-white hover:bg-white/10 transition-all duration-300"
            onClick={scrollToFeatures}
          >
            Learn More
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingHero;
