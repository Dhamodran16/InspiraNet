import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const LogoHeader = () => {
  const navigate = useNavigate();

  return (
    <motion.header
      className="fixed top-4 left-4 z-50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <motion.div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => navigate("/")}
        role="button"
        tabIndex={0}
        aria-label="Navigate to home page"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative">
          <img
            src="/favicon.png"
            alt="KEC Alumni Network Logo"
            className="w-12 h-12 rounded-xl shadow-2xl ring-2 ring-white/20"
          />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent" />
        </div>
        <div className="px-4 py-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-2xl">
          <span className="text-white font-bold text-lg tracking-wide">
            KEC Alumni Network
          </span>
        </div>
      </motion.div>
    </motion.header>
  );
};

export default LogoHeader;
