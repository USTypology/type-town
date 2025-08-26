import React, { useState, useEffect } from 'react';
import { agentSimulation, NPCStatus, Position } from '../lib/staticAgentSimulation';

interface NPCControlPanelProps {
  selectedAgent?: any;
  agents: any[];
  onMapClick?: (position: Position, npcId: string, action: string) => void;
}

export default function NPCControlPanel({ selectedAgent, agents, onMapClick }: NPCControlPanelProps) {
  const [npcStatuses, setNpcStatuses] = useState<NPCStatus[]>([]);
  const [selectedNpcId, setSelectedNpcId] = useState<string>('');
  const [goalInput, setGoalInput] = useState('');
  const [controlMode, setControlMode] = useState<'goal' | 'move' | 'talk'>('goal');
  const [targetNpcId, setTargetNpcId] = useState<string>('');

  useEffect(() => {
    const updateStatuses = () => {
      const statuses = agentSimulation.getAllNPCStatuses();
      setNpcStatuses(statuses);
    };

    // Initial load
    updateStatuses();

    // Update every 2 seconds
    const interval = setInterval(updateStatuses, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleGiveGoal = () => {
    if (selectedNpcId && goalInput.trim()) {
      const success = agentSimulation.giveNPCGoal(selectedNpcId, goalInput.trim());
      if (success) {
        setGoalInput('');
        console.log(`Goal given to NPC: ${goalInput}`);
      }
    }
  };

  const handleDirectToClick = () => {
    if (selectedNpcId && onMapClick) {
      // Trigger NPC direction mode
      onMapClick({ x: 0, y: 0 }, selectedNpcId, 'move');
    }
  };

  const handleMakeTalk = () => {
    if (selectedNpcId && targetNpcId) {
      const success = agentSimulation.makeNPCTalkTo(selectedNpcId, targetNpcId);
      if (success) {
        console.log(`Instructed ${selectedNpcId} to talk to ${targetNpcId}`);
      }
    }
  };

  const availableNpcs = npcStatuses.filter(npc => npc.canBeControlled);
  const selectedNpc = npcStatuses.find(npc => npc.id === selectedNpcId);

  if (availableNpcs.length === 0) {
    return (
      <div className="bg-gray-800 text-white p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-2">NPC Control</h3>
        <p className="text-gray-300">Start the simulation to control NPCs</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">NPC Control</h3>
        <span className="text-sm text-gray-400">{availableNpcs.length} NPCs available</span>
      </div>

      {/* NPC Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Select NPC to Control:</label>
        <select
          value={selectedNpcId}
          onChange={(e) => setSelectedNpcId(e.target.value)}
          className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600"
        >
          <option value="">Choose an NPC...</option>
          {availableNpcs.map(npc => (
            <option key={npc.id} value={npc.id}>
              {npc.name} ({npc.currentActivity})
            </option>
          ))}
        </select>
      </div>

      {/* Selected NPC Status */}
      {selectedNpc && (
        <div className="bg-gray-700 p-3 rounded">
          <h4 className="font-semibold mb-2">{selectedNpc.name} Status</h4>
          <div className="text-sm space-y-1">
            <div>Activity: <span className="text-blue-300">{selectedNpc.currentActivity}</span></div>
            <div>Position: ({Math.round(selectedNpc.position.x)}, {Math.round(selectedNpc.position.y)})</div>
            {selectedNpc.currentGoals.length > 0 && (
              <div>
                Current Goals:
                <ul className="list-disc list-inside ml-2 text-gray-300">
                  {selectedNpc.currentGoals.slice(0, 3).map((goal, idx) => (
                    <li key={idx}>{goal}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control Mode Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Control Mode:</label>
        <div className="flex space-x-2">
          <button
            onClick={() => setControlMode('goal')}
            className={`px-3 py-1 rounded text-sm ${controlMode === 'goal' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-600 text-gray-300'}`}
          >
            Give Goal
          </button>
          <button
            onClick={() => setControlMode('move')}
            className={`px-3 py-1 rounded text-sm ${controlMode === 'move' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-600 text-gray-300'}`}
          >
            Direct Movement
          </button>
          <button
            onClick={() => setControlMode('talk')}
            className={`px-3 py-1 rounded text-sm ${controlMode === 'talk' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-600 text-gray-300'}`}
          >
            Make Talk
          </button>
        </div>
      </div>

      {/* Control Interface */}
      {controlMode === 'goal' && (
        <div>
          <label className="block text-sm font-medium mb-2">New Goal:</label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="e.g., Find someone to talk to about science"
              className="flex-1 bg-gray-700 text-white p-2 rounded border border-gray-600"
              onKeyPress={(e) => e.key === 'Enter' && handleGiveGoal()}
            />
            <button
              onClick={handleGiveGoal}
              disabled={!selectedNpcId || !goalInput.trim()}
              className="px-4 py-2 bg-green-600 disabled:bg-gray-600 text-white rounded hover:bg-green-700 disabled:hover:bg-gray-600"
            >
              Give Goal
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-400">
            Examples: "Explore the forest area", "Find someone friendly to chat with", "Go rest near the water"
          </div>
        </div>
      )}

      {controlMode === 'move' && (
        <div>
          <button
            onClick={handleDirectToClick}
            disabled={!selectedNpcId}
            className="w-full px-4 py-2 bg-purple-600 disabled:bg-gray-600 text-white rounded hover:bg-purple-700 disabled:hover:bg-gray-600"
          >
            Click on Map to Direct NPC
          </button>
          <div className="mt-1 text-xs text-gray-400">
            Select an NPC above, then click this button and click on the map where you want them to go
          </div>
        </div>
      )}

      {controlMode === 'talk' && (
        <div>
          <label className="block text-sm font-medium mb-2">Talk to:</label>
          <div className="flex space-x-2">
            <select
              value={targetNpcId}
              onChange={(e) => setTargetNpcId(e.target.value)}
              className="flex-1 bg-gray-700 text-white p-2 rounded border border-gray-600"
            >
              <option value="">Choose target...</option>
              {availableNpcs
                .filter(npc => npc.id !== selectedNpcId && npc.currentActivity !== 'talking')
                .map(npc => (
                  <option key={npc.id} value={npc.id}>
                    {npc.name} ({npc.currentActivity})
                  </option>
                ))}
            </select>
            <button
              onClick={handleMakeTalk}
              disabled={!selectedNpcId || !targetNpcId}
              className="px-4 py-2 bg-blue-600 disabled:bg-gray-600 text-white rounded hover:bg-blue-700 disabled:hover:bg-gray-600"
            >
              Make Talk
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="pt-2 border-t border-gray-600">
        <div className="text-sm font-medium mb-2">Quick Actions:</div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => selectedNpcId && agentSimulation.giveNPCGoal(selectedNpcId, "Explore and find interesting places")}
            disabled={!selectedNpcId}
            className="px-2 py-1 bg-gray-600 disabled:bg-gray-700 text-white rounded text-xs hover:bg-gray-500 disabled:hover:bg-gray-700"
          >
            🗺️ Explore
          </button>
          <button
            onClick={() => selectedNpcId && agentSimulation.giveNPCGoal(selectedNpcId, "Find someone to have a friendly conversation")}
            disabled={!selectedNpcId}
            className="px-2 py-1 bg-gray-600 disabled:bg-gray-700 text-white rounded text-xs hover:bg-gray-500 disabled:hover:bg-gray-700"
          >
            💬 Socialize
          </button>
          <button
            onClick={() => selectedNpcId && agentSimulation.giveNPCGoal(selectedNpcId, "Take a break and observe surroundings")}
            disabled={!selectedNpcId}
            className="px-2 py-1 bg-gray-600 disabled:bg-gray-700 text-white rounded text-xs hover:bg-gray-500 disabled:hover:bg-gray-700"
          >
            🧘 Rest
          </button>
        </div>
      </div>
    </div>
  );
}