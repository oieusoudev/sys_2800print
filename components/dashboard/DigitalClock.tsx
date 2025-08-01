'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function DigitalClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-PT', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="flex items-center space-x-3 bg-slate-700 rounded-lg px-3 py-2">
      <Clock className="h-4 w-4 text-yellow-400" />
      <div className="text-right">
        <div className="text-lg font-mono font-bold text-white">
          {formatTime(time)}
        </div>
        <div className="text-xs text-slate-400 capitalize">
          {formatDate(time)}
        </div>
      </div>
    </div>
  );
}