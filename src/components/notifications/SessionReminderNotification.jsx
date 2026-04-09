import React, { useState, useEffect } from "react";
import { X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SessionReminderNotification({ reminder, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(), 300);
    }, 10000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(), 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#FF5722] text-white rounded-xl shadow-2xl p-6 min-w-[400px] max-w-[500px]"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">Session Starting Soon!</h3>
              <p className="text-white/90 text-sm mb-2">
                Your campaign session is about to start. Get ready to play!
              </p>
              {reminder.session_time && (
                <p className="text-xs text-white/70">
                  Scheduled: {new Date(reminder.session_time).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}