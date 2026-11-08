import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface ModelLoadingIndicatorProps {
  isLoading: boolean;
  progress: number;
  modelName?: string;
}

export const ModelLoadingIndicator: React.FC<ModelLoadingIndicatorProps> = ({
  isLoading,
  progress,
  modelName = 'модели',
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-40 pointer-events-none flex justify-center pt-2"
        >
          <div className="relative bg-gradient-to-b from-background/95 to-background/90 backdrop-blur-md rounded-lg border border-primary/30 shadow-lg px-4 py-2 min-w-[200px] max-w-[280px]">
            <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-primary/50" />
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary/50" />
            <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-primary/50" />
            <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-primary/50" />

            <div className="flex items-center gap-2 mb-1">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-3 h-3 text-primary" />
              </motion.div>
              <span className="text-primary/90 text-[10px] font-serif uppercase tracking-wider">
                Загрузка {modelName}
              </span>
              <span className="text-primary text-xs font-mono font-bold ml-auto">{progress}%</span>
            </div>

            <div className="relative h-2 bg-background rounded border border-primary/30 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-foreground/5 to-transparent" />
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/80 via-primary to-accent/80"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-foreground/20 to-transparent" />
                <motion.div
                  className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-foreground/30"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModelLoadingIndicator;
