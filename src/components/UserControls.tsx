import React, { useState, useEffect } from 'react';
import { agentSimulation, Agent } from '../lib/staticAgentSimulation';

interface UserControlsProps {
  userCharacterId?: string;
  agents: Agent[];
  onUserCharacterCreated: (userId: string) => void;
  onUserCharacterRemoved: () => void;
}

export default function UserControls({ 
  userCharacterId, 
  agents, 
  onUserCharacterCreated, 
  onUserCharacterRemoved 
}: UserControlsProps) {
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateNPC, setShowCreateNPC] = useState(false);
  const [userName, setUserName] = useState('');
  const [userIdentity, setUserIdentity] = useState('');
  const [npcName, setNpcName] = useState('');
  const [npcIdentity, setNpcIdentity] = useState('');
  const [npcPlan, setNpcPlan] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [userMessage, setUserMessage] = useState('');

  const userAgent = userCharacterId ? agents.find(a => a.id === userCharacterId) : null;

  // Listen for NPC selection events from the map
  useEffect(() => {
    const handleNPCSelected = (event: CustomEvent) => {
      const { npcId, npcName } = event.detail;
      if (userCharacterId && npcId !== userCharacterId) {
        setSelectedTarget(npcId);
        // Could also show a toast or highlight the interaction area
        console.log(`Selected NPC: ${npcName} for interaction`);
      }
    };

    window.addEventListener('npcSelected', handleNPCSelected as EventListener);
    return () => window.removeEventListener('npcSelected', handleNPCSelected as EventListener);
  }, [userCharacterId]);

  const handleCreateUser = () => {
    if (userName.trim() && userIdentity.trim()) {
      const userId = agentSimulation.addUserCharacter(userName.trim(), userIdentity.trim());
      onUserCharacterCreated(userId);
      setShowCreateUser(false);
      setUserName('');
      setUserIdentity('');
    }
  };

  const handleRemoveUser = () => {
    if (userCharacterId) {
      agentSimulation.removeUserCharacter(userCharacterId);
      onUserCharacterRemoved();
    }
  };

  const handleCreateNPC = () => {
    if (npcName.trim() && npcIdentity.trim()) {
      agentSimulation.createCustomNPC(npcName.trim(), npcIdentity.trim(), npcPlan.trim() || undefined);
      setShowCreateNPC(false);
      setNpcName('');
      setNpcIdentity('');
      setNpcPlan('');
    }
  };

  const handleSendMessage = () => {
    if (userCharacterId && userMessage.trim() && selectedTarget) {
      const success = agentSimulation.sendUserMessage(userCharacterId, userMessage.trim(), selectedTarget);
      if (success) {
        setUserMessage('');
      } else {
        alert('Could not send message. Make sure you are close enough to the target.');
      }
    }
  };

  const availableTargets = agents.filter(a => 
    a.id !== userCharacterId && 
    !a.isUserControlled &&
    !a.currentConversation
  );

  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg space-y-4">
      <h3 className="text-xl font-bold">User Controls</h3>

      {/* User Character Section */}
      {!userCharacterId ? (
        <div>
          <button
            onClick={() => setShowCreateUser(!showCreateUser)}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Join as Character
          </button>

          {showCreateUser && (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                placeholder="Character Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white"
              />
              <textarea
                placeholder="Character Identity/Personality"
                value={userIdentity}
                onChange={(e) => setUserIdentity(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 text-white h-20"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateUser}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="bg-gray-700 p-3 rounded">
            <p><strong>Playing as:</strong> {userAgent?.name}</p>
            <p className="text-sm opacity-75">{userAgent?.identity}</p>
          </div>
          
          {/* Chat Interface */}
          <div className="space-y-2">
            <div className="text-sm text-gray-300 mb-2">💬 Talk to NPCs (click on them or select below)</div>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className={`w-full p-2 rounded text-white ${
                selectedTarget ? 'bg-blue-700 border-blue-400' : 'bg-gray-700'
              } border-2 border-transparent`}
            >
              <option value="">Select character to talk to...</option>
              {availableTargets.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} - {agent.currentConversation ? '(busy)' : '(available)'}
                </option>
              ))}
            </select>
            
            {selectedTarget && (
              <div className="bg-blue-900 p-2 rounded text-sm">
                Ready to chat with: <strong>{availableTargets.find(a => a.id === selectedTarget)?.name}</strong>
                <br />
                <span className="text-blue-300">💡 Click on NPCs directly on the map for quick selection!</span>
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={selectedTarget ? "Type your message..." : "Select an NPC first..."}
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={!selectedTarget}
                className="flex-1 p-2 rounded bg-gray-700 text-white disabled:bg-gray-800 disabled:text-gray-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!selectedTarget || !userMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors"
                title={!selectedTarget ? "Select an NPC first" : !userMessage.trim() ? "Type a message" : "Send message"}
              >
                Send
              </button>
            </div>
          </div>

          <button
            onClick={handleRemoveUser}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Leave World
          </button>
        </div>
      )}

      {/* NPC Creation Section */}
      <div className="border-t border-gray-600 pt-4">
        <button
          onClick={() => setShowCreateNPC(!showCreateNPC)}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
        >
          Create Custom NPC
        </button>

        {showCreateNPC && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              placeholder="NPC Name"
              value={npcName}
              onChange={(e) => setNpcName(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white"
            />
            <textarea
              placeholder="NPC Identity/Personality"
              value={npcIdentity}
              onChange={(e) => setNpcIdentity(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white h-20"
            />
            <textarea
              placeholder="NPC Goals/Plans (optional)"
              value={npcPlan}
              onChange={(e) => setNpcPlan(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white h-16"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateNPC}
                className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
              >
                Create NPC
              </button>
              <button
                onClick={() => setShowCreateNPC(false)}
                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}