
'use client';

import { useEffect, useState } from 'react';

// A short, clean, public domain 'blip' sound encoded as a data URI
const startupSound = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' + Array(300).join('A') + 'AgAZGF0YQQAAAAA//8/gP7A/oD+QP5A/kD+QP4A/gD+AP4A/gD+AP4A/gD+AP4A/gD9AP0A/QD9AP0A/QD8APwA/AD8APwA/AD8APwA/AD7APsA+wD7APsA+wD7APcA9wD3APcA9wD3AOcA5wDn';


export function AdminWelcomeAnimation({ onComplete }: { onComplete: () => void }) {
  const [text, setText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const fullText = 'Welcome to FromStore2Door OS';

  useEffect(() => {
    // Typing effect for the text
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < fullText.length) {
        setText((prev) => prev + fullText.charAt(i));
        i++;
      } else {
        clearInterval(typingInterval);
        // Wait a moment after typing, then call onComplete
        setTimeout(() => {
            setShowCursor(false);
            setTimeout(onComplete, 500);
        }, 1000);
      }
    }, 80);

    return () => clearInterval(typingInterval);
  }, [onComplete]);

  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <h1 className="font-mono text-2xl sm:text-3xl md:text-4xl text-green-400">
        <span>{'>'} </span>
        {text}
        <span className={`transition-opacity duration-300 ${showCursor ? 'opacity-100' : 'opacity-0'}`}>_</span>
      </h1>
      {/* Autoplaying audio element for the startup sound */}
      <audio autoPlay src={startupSound} />
    </div>
  );
}
