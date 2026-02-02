'use client';

import { useEffect } from 'react';
import { useScanner } from '@/hooks/useScanner';

export function QRScanner({ onScan, onError, className }) {
  const {
    isScanning,
    error,
    scannerId,
    startScanner,
    stopScanner,
  } = useScanner(onScan, onError);

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);

  return (
    <div className={className}>
      <div className="relative">
        <div
          id={scannerId}
          className="w-full overflow-hidden rounded-2xl bg-black"
          style={{ minHeight: '400px' }}
        />

        {/* Scanner overlay with frame */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="w-full h-full flex items-center justify-center">
            <div className="relative w-64 h-64">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />

              {/* Scanning line animation */}
              {isScanning && (
                <div className="absolute left-2 right-2 h-0.5 bg-green-500 animate-scan" />
              )}
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            isScanning
              ? 'bg-green-500 text-white'
              : error
              ? 'bg-red-500 text-white'
              : 'bg-gray-500 text-white'
          }`}>
            {isScanning ? 'Scanning...' : error ? error : 'Initializing...'}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default QRScanner;
