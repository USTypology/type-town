import React, { useEffect, useState } from 'react';
import { Stage } from '@pixi/react';
import { agentSimulation, Agent, Conversation } from '../lib/staticAgentSimulation';
import { clientLLM } from '../lib/clientLLM';
import { worldPersistence } from '../lib/worldPersistence';
import UserControls from './UserControls';
import WorldManager from './WorldManager';
import { PixiStaticMap } from './PixiStaticMap';
import { Character } from './Character';
import { WorldMap } from '../lib/staticTypes';
import * as gentleMap from '../../data/gentle.js';
import { data as f1SpritesheetData } from '../../data/spritesheets/f1';
import { data as f2SpritesheetData } from '../../data/spritesheets/f2';
import { data as f3SpritesheetData } from '../../data/spritesheets/f3';
import { data as f4SpritesheetData } from '../../data/spritesheets/f4';
import { data as f5SpritesheetData } from '../../data/spritesheets/f5';
import { data as f6SpritesheetData } from '../../data/spritesheets/f6';

// Character sprite mapping
export const characterSpriteSheets = {
  'f1': { data: f1SpritesheetData, url: '/assets/32x32folk.png' },
  'f2': { data: f2SpritesheetData, url: '/assets/32x32folk.png' },
  'f3': { data: f3SpritesheetData, url: '/assets/32x32folk.png' },
  'f4': { data: f4SpritesheetData, url: '/assets/32x32folk.png' },
  'f5': { data: f5SpritesheetData, url: '/assets/32x32folk.png' },
  'f6': { data: f6SpritesheetData, url: '/assets/32x32folk.png' },
};

// World map configuration based on gentle.js data
export const worldMapConfig: WorldMap = {
  bgTiles: gentleMap.bgtiles,
  objectTiles: gentleMap.objmap || [[]],
  decorTiles: [[]],
  width: gentleMap.screenxtiles,
  height: gentleMap.screenytiles,
  tileSize: gentleMap.tiledim,
  tilesheetUrl: gentleMap.tilesetpath,
  tilesPerRow: Math.floor(gentleMap.tilesetpxw / gentleMap.tiledim),
  animatedSprites: gentleMap.animatedsprites || [],
  tileSetDimX: gentleMap.tilesetpxw,
  tileSetDimY: gentleMap.tilesetpxh,
  tileDim: gentleMap.tiledim,
  tileSetUrl: '/assets/gentle-obj.png', // Fix the asset path
};

export default function SimpleAgentWorld() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [llmReady, setLLMReady] = useState(false);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [userCharacterId, setUserCharacterId] = useState<string>();
  const [showConversationLog, setShowConversationLog] = useState(false);

  useEffect(() => {
    // Initialize world persistence
    const initPersistence = async () => {
      try {
        await worldPersistence.initialize();
        console.log('World persistence initialized');
      } catch (error) {
        console.error('Failed to initialize world persistence:', error);
      }
    };
    initPersistence();

    // Initialize LLM
    const initLLM = async () => {
      try {
        await clientLLM.initialize();
        setLLMReady(true);
      } catch (error) {
        console.error('Failed to initialize LLM:', error);
      }
    };
    initLLM();

    // Set up simulation update callback
    agentSimulation.setOnUpdate(() => {
      setAgents([...agentSimulation.getAgents()]);
      setConversations([...agentSimulation.getActiveConversations()]);
    });

    return () => {
      agentSimulation.stop();
    };
  }, []);

  const startSimulation = () => {
    agentSimulation.start();
    setIsSimulationRunning(true);
  };

  const stopSimulation = () => {
    agentSimulation.stop();
    setIsSimulationRunning(false);
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!userCharacterId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    agentSimulation.moveUserCharacter(userCharacterId, { x, y });
  };

  const handleUserCharacterCreated = (userId: string) => {
    setUserCharacterId(userId);
  };

  const handleUserCharacterRemoved = () => {
    setUserCharacterId(undefined);
  };

  const handleWorldLoaded = () => {
    setAgents([...agentSimulation.getAgents()]);
    setConversations([...agentSimulation.getActiveConversations()]);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-brown-800 text-white p-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">AI Town - Live Simulation</h2>
          <p className="text-sm opacity-80">
            Agents using {clientLLM.isReady() ? '✅ Client-side LLM (DistilGPT-2)' : '🤖 Fallback AI (Personality-based responses)'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <WorldManager 
            agents={agents}
            conversations={conversations}
            onWorldLoaded={handleWorldLoaded}
          />
          {!isSimulationRunning ? (
            <button
              onClick={startSimulation}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Start Simulation
            </button>
          ) : (
            <button
              onClick={stopSimulation}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Stop Simulation
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-4 gap-4 p-4 min-h-0">
        {/* PIXI Agent World Map */}
        <div 
          className="xl:col-span-3 rounded-lg relative overflow-hidden bg-sky-200 flex items-center justify-center" 
          style={{ minHeight: '500px' }}
        >
          <div className="w-full h-full max-w-full max-h-full flex items-center justify-center">
            <Stage
              width={Math.min(720, worldMapConfig.width * worldMapConfig.tileSize)}
              height={Math.min(480, worldMapConfig.height * worldMapConfig.tileSize)}
              options={{ 
                backgroundColor: 0x87CEEB, 
                antialias: false,
                resolution: 1,
              }}
            >
            {/* Render the world map */}
            <PixiStaticMap map={worldMapConfig} />
            
            {/* Render agents as PIXI characters */}
            {agents.map(agent => {
              const characterSheet = characterSpriteSheets[agent.character as keyof typeof characterSpriteSheets];
              if (!characterSheet) {
                return null;
              }
              
              return (
                <Character
                  key={agent.id}
                  textureUrl={characterSheet.url}
                  spritesheetData={characterSheet.data}
                  x={agent.position.x}
                  y={agent.position.y}
                  orientation={0}
                  isMoving={agent.isMoving}
                  isThinking={false}
                  isSpeaking={!!agent.currentConversation}
                  isViewer={agent.id === userCharacterId}
                  onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                />
              );
            })}
            </Stage>
          </div>

          {/* HTML overlay for agent info (positioned absolutely) */}
          <div className="absolute inset-0 pointer-events-none">
            {agents.map(agent => (
              <div
                key={`${agent.id}-info`}
                className="absolute pointer-events-none"
                style={{
                  left: `${agent.position.x}px`,
                  top: `${agent.position.y - 40}px`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                {/* Agent name */}
                <div className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {agent.name} {agent.isUserControlled ? '(You)' : ''}
                  {agent.isMoving && (
                    <div className="text-green-300">→ moving</div>
                  )}
                  {agent.currentConversation && (
                    <div className="text-blue-300">💬 chatting</div>
                  )}
                </div>

                {/* Show last message as speech bubble */}
                {agent.lastMessage && agent.lastMessageTime && Date.now() - agent.lastMessageTime < 10000 && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 bg-white border-2 border-gray-300 rounded-lg p-2 text-sm shadow-lg max-w-xs mt-2">
                    <div className="text-gray-800">{agent.lastMessage}</div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Loading/Error state overlay */}
          {agents.length === 0 && !isSimulationRunning && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
              <div className="text-center p-6 bg-brown-800 rounded-lg">
                <h3 className="text-xl font-bold mb-2">Welcome to Type Town!</h3>
                <p className="mb-4">Click "Start Simulation" to populate the world with AI agents</p>
                <p className="text-sm text-gray-300">Or create a character to join the simulation yourself</p>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel - Split between Agent Info and User Controls */}
        <div className="space-y-4 min-w-0">
          {/* User Controls */}
          <UserControls 
            userCharacterId={userCharacterId}
            agents={agents}
            onUserCharacterCreated={handleUserCharacterCreated}
            onUserCharacterRemoved={handleUserCharacterRemoved}
          />

          {/* Agent Info Panel */}
          <div className="bg-brown-800 text-white rounded-lg p-4">
            {selectedAgent ? (
              <div>
                <h3 className="text-xl font-bold mb-3">
                  {selectedAgent.name} {selectedAgent.isUserControlled ? '(You)' : ''}
                </h3>
                <p className="text-sm opacity-80 mb-4">{selectedAgent.identity}</p>
                
                <div className="space-y-2">
                  <div>
                    <strong>Status:</strong> {
                      selectedAgent.currentConversation ? 'In conversation' :
                      selectedAgent.isMoving ? 'Moving' : 'Idle'
                    }
                  </div>
                  <div>
                    <strong>Position:</strong> ({Math.round(selectedAgent.position.x)}, {Math.round(selectedAgent.position.y)})
                  </div>
                  {selectedAgent.plan && (
                    <div>
                      <strong>Goals:</strong>
                      <div className="text-sm text-gray-300">{selectedAgent.plan}</div>
                    </div>
                  )}
                  {selectedAgent.memories && selectedAgent.memories.length > 0 && (
                    <div>
                      <strong>Memories:</strong>
                      <div className="text-sm text-gray-300">
                        {selectedAgent.memories.slice(0, 3).join(' • ')}
                      </div>
                    </div>
                  )}
                  {selectedAgent.lastMessage && (
                    <div>
                      <strong>Last Said:</strong>
                      <div className="bg-gray-700 p-2 rounded text-sm mt-1">
                        "{selectedAgent.lastMessage}"
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-xl font-bold mb-3">World Statistics</h3>
                <div className="space-y-2">
                  <div>Total Characters: {agents.length}</div>
                  <div>AI Characters: {agents.filter(a => !a.isUserControlled).length}</div>
                  <div>Human Players: {agents.filter(a => a.isUserControlled).length}</div>
                  <div>Active Conversations: {conversations.length}</div>
                  <div>Moving: {agents.filter(a => a.isMoving).length}</div>
                  <div>Idle: {agents.filter(a => !a.isMoving && !a.currentConversation).length}</div>
                </div>

                {conversations.length > 0 && (
                  <>
                    <h4 className="text-lg font-semibold mt-4 mb-2">Recent Conversations</h4>
                    <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                      {conversations.map(conv => {
                        const recentMsg = conv.messages[conv.messages.length - 1];
                        if (!recentMsg) return null;
                        const speaker = agents.find(a => a.id === recentMsg.agentId);
                        return (
                          <div key={conv.id} className="bg-gray-700 p-2 rounded">
                            <div className="font-semibold">{speaker?.name}:</div>
                            <div className="text-gray-300">"{recentMsg.text.substring(0, 60)}..."</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {!isSimulationRunning && (
                  <div className="mt-4 p-3 bg-yellow-900 rounded">
                    <p className="text-sm">
                      Click "Start Simulation" to see AI characters come to life! 
                      {userCharacterId ? ' Click on the map to move around.' : ' Create a character to join them!'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conversation Log Toggle */}
          <button
            onClick={() => setShowConversationLog(!showConversationLog)}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            {showConversationLog ? 'Hide' : 'Show'} Full Conversation Log
          </button>

          {/* Full Conversation Log */}
          {showConversationLog && (
            <div className="bg-gray-800 text-white rounded-lg p-4 max-h-60 overflow-y-auto">
              <h4 className="font-bold mb-3">All Conversations</h4>
              {conversations.map(conv => (
                <div key={conv.id} className="mb-4 border-b border-gray-700 pb-2">
                  <div className="text-sm text-gray-400 mb-2">
                    Conversation between {conv.participants.map(id => agents.find(a => a.id === id)?.name).join(' & ')}
                  </div>
                  {conv.messages.map((msg, idx) => {
                    const speaker = agents.find(a => a.id === msg.agentId);
                    return (
                      <div key={idx} className="text-sm mb-1">
                        <span className="font-semibold">{speaker?.name}:</span> {msg.text}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-gray-800 text-white p-2 text-sm flex justify-between">
        <div>
          LLM Status: {clientLLM.isReady() ? '🟢 Ready (HF Transformers)' : '🟡 Fallback Mode'}
        </div>
        <div>
          Simulation: {isSimulationRunning ? '🟢 Running' : '🔴 Stopped'}
        </div>
      </div>
    </div>
  );
}