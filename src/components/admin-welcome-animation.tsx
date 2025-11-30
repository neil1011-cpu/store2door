
'use client';

import { useEffect, useState } from 'react';

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
    </div>
  );
}
