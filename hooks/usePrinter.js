'use client';

import { useState, useCallback, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

export function usePrinter() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState(null);
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onBeforePrint: () => {
      setIsPrinting(true);
      setError(null);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    },
    onPrintError: (errorLocation, err) => {
      setError(err?.message || 'Print failed');
      setIsPrinting(false);
    },
  });

  const print = useCallback(() => {
    if (printRef.current) {
      handlePrint();
    } else {
      setError('Nothing to print');
    }
  }, [handlePrint]);

  // Print multiple copies
  const printCopies = useCallback(async (copies = 1) => {
    for (let i = 0; i < copies; i++) {
      await new Promise((resolve) => {
        handlePrint();
        setTimeout(resolve, 500);
      });
    }
  }, [handlePrint]);

  return {
    printRef,
    isPrinting,
    error,
    print,
    printCopies,
  };
}

export default usePrinter;
