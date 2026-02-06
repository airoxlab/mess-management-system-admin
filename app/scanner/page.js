'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { QRScanner } from '@/components/Scanner/QRScanner';
import { ScanResult } from '@/components/Scanner/ScanResult';
import { TokenDisplay } from '@/components/Token/TokenDisplay';
import { TokenReceipt } from '@/components/Token/TokenReceipt';
import { Button } from '@/components/ui/Button';
import { usePrinter } from '@/hooks/usePrinter';
import { playSound } from '@/lib/utils';
import { getCurrentMealType, MEAL_TYPE_LABELS } from '@/lib/constants';
import api from '@/lib/api-client';

export default function ScannerPage() {
  const router = useRouter();
  const [state, setState] = useState('scanning'); // scanning, result, token
  const [member, setMember] = useState(null);
  const [token, setToken] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { printRef, isPrinting, print } = usePrinter();
  const lastScanRef = useRef(null);

  // Load organization data on mount
  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const response = await api.get('/api/organization');
      if (response.ok) {
        const data = await response.json();
        setOrganization(data.organization);
      }
    } catch (error) {
      console.error('Error loading organization:', error);
    }
  };

  const handleScan = useCallback(async (qrData) => {
    // Debounce scans
    const now = Date.now();
    if (lastScanRef.current && now - lastScanRef.current < 2000) {
      return;
    }
    lastScanRef.current = now;

    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/api/scan', { qrData });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scan');
      }

      setMember(data.member);
      setState('result');
      playSound('/sounds/success.mp3');
    } catch (err) {
      setError(err.message);
      playSound('/sounds/error.mp3');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateToken = async () => {
    if (!member) return;

    try {
      setLoading(true);
      setError(null);

      const mealType = getCurrentMealType();

      const response = await api.post('/api/tokens', {
          memberId: member.id,
          mealType,
        });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate token');
      }

      setToken(data.token);
      setMember(data.member); // Updated balance
      setState('token');
      playSound('/sounds/success.mp3');
      toast.success(`Token #${data.token.token_no} generated!`);
    } catch (err) {
      setError(err.message);
      playSound('/sounds/error.mp3');
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewScan = () => {
    setMember(null);
    setToken(null);
    setError(null);
    setState('scanning');
    lastScanRef.current = null;
  };

  const handlePrint = () => {
    print();
  };

  const orgName = organization?.name || 'LIMHS CAFETERIA';

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">{orgName}</h1>
                <p className="text-sm text-gray-400">Scanner Station - Scan to generate token</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-green-400">
                {MEAL_TYPE_LABELS[getCurrentMealType()]}
              </p>
              <p className="text-sm text-gray-400">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        {state === 'scanning' && (
          <div className="space-y-6">
            <QRScanner
              onScan={handleScan}
              onError={(err) => {
                setError(err.message);
                toast.error(err.message);
              }}
              className="rounded-2xl overflow-hidden shadow-2xl"
            />

            {error && (
              <div className="p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200 text-center">
                {error}
              </div>
            )}

            <div className="text-center text-gray-400">
              <p>Position the QR code within the frame</p>
            </div>
          </div>
        )}

        {state === 'result' && member && (
          <ScanResult
            member={member}
            onGenerateToken={handleGenerateToken}
            onCancel={handleNewScan}
            loading={loading}
            error={error}
          />
        )}

        {state === 'token' && token && (
          <>
            <TokenDisplay
              token={token}
              member={member}
              onPrint={handlePrint}
              onNewScan={handleNewScan}
              printing={isPrinting}
            />

            {/* Hidden print receipt */}
            <div className="hidden">
              <TokenReceipt
                ref={printRef}
                token={token}
                member={member}
                organization={organization}
              />
            </div>
          </>
        )}
      </main>

      {/* Fullscreen toggle */}
      <div className="fixed bottom-4 right-4">
        <Button
          variant="ghost"
          className="text-gray-400 hover:text-white"
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
