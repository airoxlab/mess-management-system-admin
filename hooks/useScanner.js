'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export function useScanner(onScanSuccess, onScanError) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);
  const scannerIdRef = useRef('qr-scanner-' + Math.random().toString(36).substr(2, 9));

  const startScanner = useCallback(async () => {
    try {
      setError(null);

      if (scannerRef.current) {
        await stopScanner();
      }

      const scanner = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (onScanSuccess) {
            onScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          // Ignore scan errors (no QR found)
        }
      );

      setIsScanning(true);
    } catch (err) {
      setError(err.message || 'Failed to start scanner');
      setIsScanning(false);
      if (onScanError) {
        onScanError(err);
      }
    }
  }, [onScanSuccess, onScanError]);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    } finally {
      scannerRef.current = null;
      setIsScanning(false);
    }
  }, []);

  const pauseScanner = useCallback(async () => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.pause();
      }
    } catch (err) {
      console.error('Error pausing scanner:', err);
    }
  }, []);

  const resumeScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.resume();
      }
    } catch (err) {
      console.error('Error resuming scanner:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopScanner();
      }
    };
  }, [stopScanner]);

  return {
    isScanning,
    error,
    scannerId: scannerIdRef.current,
    startScanner,
    stopScanner,
    pauseScanner,
    resumeScanner,
  };
}

export default useScanner;
