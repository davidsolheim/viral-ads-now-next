'use client';

import { useState, useEffect } from 'react';

interface ProductNameLoadingProps {
  className?: string;
}

export function ProductNameLoading({ className }: ProductNameLoadingProps) {
  const [displayText, setDisplayText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const fullText = 'Extracting product name...';

  useEffect(() => {
    let currentIndex = 0;
    const typeInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typeInterval);
      }
    }, 100); // Type speed: 100ms per character

    // Cursor blinking effect
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500); // Blink every 500ms

    return () => {
      clearInterval(typeInterval);
      clearInterval(cursorInterval);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center">
        <span className="text-gray-500 font-mono text-sm">
          {displayText}
          {showCursor && <span className="animate-pulse">|</span>}
        </span>
      </div>
    </div>
  );
}