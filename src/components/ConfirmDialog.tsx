import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-space-navy-800 border border-space-navy-600 shadow-2xl rounded-2xl w-full max-w-sm p-6 overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${isDestructive ? 'bg-red-500/20 text-red-500' : 'bg-neon-cyan-500/20 text-neon-cyan-500'}`}>
                <AlertTriangle size={24} />
              </div>
              <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
            <p className="text-gray-400 text-sm mb-6">{message}</p>
            
            <div className="flex gap-3 w-full">
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-xl bg-space-navy-700 text-white font-bold hover:bg-space-navy-600 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel(); // auto close on confirm
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition-colors shadow-lg
                  ${isDestructive 
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' 
                    : 'bg-neon-cyan-500 text-space-navy-900 hover:bg-neon-cyan-400 shadow-neon-cyan/20'}
                `}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
