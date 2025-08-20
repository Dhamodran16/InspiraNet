import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronUp, Users, MessageSquare } from "lucide-react";

const FloatingActionButton = () => {
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
        className="flex flex-col gap-2"
      >
        <motion.button
          className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl"
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/dashboard?section=network')}
          title="Alumni Network"
        >
          <Users className="w-5 h-5" />
        </motion.button>

        <motion.button
          className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl"
          whileHover={{ scale: 1.1, rotate: -5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/dashboard?section=messages')}
          title="Messages"
        >
          <MessageSquare className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Scroll to top */}
      <motion.button
        className="w-12 h-12 bg-gradient-to-r from-brand-secondary to-yellow-400 rounded-full shadow-lg flex items-center justify-center text-brand-primary hover:shadow-xl"
        onClick={scrollToTop}
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.9 }}
        title="Scroll to top"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2.5, duration: 0.5 }}
      >
        <ChevronUp className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

export default FloatingActionButton;

