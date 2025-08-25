import React from 'react';
import SimpleAgentWorld from './SimpleAgentWorld';

// AI Town game with client-side LLM agents
export default function Game() {
  return (
    <div className="mx-auto w-full max-w-full h-full min-h-[600px] game-frame">
      <SimpleAgentWorld />
    </div>
  );
}