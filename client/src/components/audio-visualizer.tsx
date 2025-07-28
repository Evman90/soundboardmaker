import { useEffect, useState } from "react";

interface AudioVisualizerProps {
  audioLevel: number;
  isListening: boolean;
}

export default function AudioVisualizer({ audioLevel, isListening }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>(Array(20).fill(0));

  useEffect(() => {
    if (!isListening) {
      setBars(Array(20).fill(0));
      return;
    }

    const interval = setInterval(() => {
      setBars(prev => prev.map(() => Math.random() * 100));
    }, 150);

    return () => clearInterval(interval);
  }, [isListening]);

  return (
    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Audio Level</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {isListening ? `${Math.round(audioLevel)} dB` : "- dB"}
        </span>
      </div>
      <div className="flex items-end space-x-1 h-16">
        {bars.map((height, index) => (
          <div
            key={index}
            className={`flex-1 rounded-t transition-all duration-150 ${
              isListening ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
            }`}
            style={{
              height: `${Math.max(height * 0.8, 10)}%`,
              animationDelay: `${index * 0.1}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
