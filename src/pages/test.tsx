// src/pages/test.tsx
import React from 'react';

export function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url('/Background2.jpg')` }}
      />
      <div className="relative p-8 text-white">Test Background</div>
    </div>
  );
}