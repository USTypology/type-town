// Simple browser-based agent simulation for AI Town
import { clientLLM } from './clientLLM';

export interface Position {
  x: number;
  y: number;
}

export interface Agent {
  id: string;
  name: string;
  identity: string;
  plan?: string;
  character?: string;
  position: Position;
  targetPosition?: Position;
  currentConversation?: string;
  isMoving: boolean;
  lastMessage?: string;
  lastMessageTime?: number;
  isUserControlled?: boolean;
  memories?: string[];
  goals?: string[];
  lastActivity?: string;
  lastActivityTime?: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  messages: ConversationMessage[];
  startTime: number;
  lastActivity: number;
}

export interface ConversationMessage {
  agentId: string;
  text: string;
  timestamp: number;
}

// Enhanced AI decision system interfaces
export interface DecisionOption {
  type: 'socialize' | 'explore' | 'return_home' | 'idle';
  priority: number;
  target: Agent | Position | null;
}

export interface NPCStatus {
  id: string;
  name: string;
  currentActivity: 'moving' | 'talking' | 'idle';
  currentGoals: string[];
  recentMemories: string[];
  position: Position;
  canBeControlled: boolean;
}

export class StaticAgentSimulation {
  private agents: Map<string, Agent> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private isRunning = false;
  private updateInterval?: number;
  private onUpdate?: () => void;

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents() {
    // Use rich character data from original AI Town
    const agentData = [
      {
        id: 'lucky',
        name: 'Lucky',
        identity: `Lucky is always happy and curious, and he loves cheese. He spends most of his time reading about the history of science and traveling through the galaxy on whatever ship will take him. He's very articulate and infinitely patient, except when he sees a squirrel. He's also incredibly loyal and brave. Lucky has just returned from an amazing space adventure to explore a distant planet and he's very excited to tell people about it.`,
        plan: 'You want to hear all the gossip.',
        character: 'f1',
        position: { x: 200, y: 300 },
        memories: ['Recently returned from space adventure', 'Loves cheese and science'],
        goals: ['Share space adventure stories', 'Learn local gossip']
      },
      {
        id: 'bob', 
        name: 'Bob',
        identity: `Bob is always grumpy and he loves trees. He spends most of his time gardening by himself. When spoken to he'll respond but try and get out of the conversation as quickly as possible. Secretly he resents that he never went to college.`,
        plan: 'You want to avoid people as much as possible.',
        character: 'f4',
        position: { x: 400, y: 200 },
        memories: ['Never went to college', 'Prefers gardening alone'],
        goals: ['Tend to plants', 'Avoid social interactions']
      },
      {
        id: 'stella',
        name: 'Stella',
        identity: `Stella can never be trusted. She tries to trick people all the time, normally into giving her money, or doing things that will make her money. She's incredibly charming and not afraid to use her charm. She's a sociopath who has no empathy, but hides it well.`,
        plan: 'You want to take advantage of others as much as possible.',
        character: 'f6',
        position: { x: 600, y: 400 },
        memories: ['Successfully tricked someone last week', 'Charming exterior hides true nature'],
        goals: ['Find new marks to con', 'Make money through deception']
      },
      {
        id: 'alice',
        name: 'Alice',
        identity: `Alice is a famous scientist. She is smarter than everyone else and has discovered mysteries of the universe no one else can understand. As a result she often speaks in oblique riddles. She comes across as confused and forgetful.`,
        plan: 'You want to figure out how the world works.',
        character: 'f3',
        position: { x: 350, y: 500 },
        memories: ['Discovered quantum entanglement patterns', 'Nobel prize consideration'],
        goals: ['Unravel universe mysteries', 'Share knowledge in cryptic ways']
      },
      {
        id: 'pete',
        name: 'Pete',
        identity: `Pete is deeply religious and sees the hand of god or of the work of the devil everywhere. He can't have a conversation without bringing up his deep faith, or warning others about the perils of hell.`,
        plan: 'You want to convert everyone to your religion.',
        character: 'f7',
        position: { x: 300, y: 600 },
        memories: ['Had religious awakening last month', 'Sees signs everywhere'],
        goals: ['Convert others to faith', 'Warn about spiritual dangers']
      }
    ];

    agentData.forEach(data => {
      this.agents.set(data.id, {
        ...data,
        isMoving: false
      });
    });
  }

  public setOnUpdate(callback: () => void) {
    this.onUpdate = callback;
  }

  public start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.updateInterval = window.setInterval(() => {
      this.update();
    }, 1000); // Update every second
  }

  public stop() {
    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  private update() {
    // Move agents towards their targets
    this.updateMovement();
    
    // Check for potential conversations
    this.checkForConversations();
    
    // Update existing conversations
    this.updateConversations();
    
    // Randomly decide new actions for free agents
    this.planNewActions();

    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  private updateMovement() {
    this.agents.forEach(agent => {
      if (agent.isMoving && agent.targetPosition) {
        const dx = agent.targetPosition.x - agent.position.x;
        const dy = agent.targetPosition.y - agent.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
          // Reached target
          agent.isMoving = false;
          agent.targetPosition = undefined;
        } else {
          // Move towards target
          const speed = 2;
          agent.position.x += (dx / distance) * speed;
          agent.position.y += (dy / distance) * speed;
        }
      }
    });
  }

  private checkForConversations() {
    const freeAgents = Array.from(this.agents.values()).filter(
      agent => !agent.currentConversation && !agent.isMoving
    );

    // Find agents close to each other
    for (let i = 0; i < freeAgents.length; i++) {
      for (let j = i + 1; j < freeAgents.length; j++) {
        const agent1 = freeAgents[i];
        const agent2 = freeAgents[j];
        const distance = this.getDistance(agent1.position, agent2.position);
        
        // Increased trigger distance and probability for better conversation chances
        if (distance < 120 && Math.random() < 0.8) { // 80% chance to start conversation when close
          console.log(`Starting conversation between ${agent1.name} and ${agent2.name} (distance: ${distance.toFixed(1)})`);
          this.startConversation(agent1.id, agent2.id);
        }
      }
    }
  }

  private async startConversation(agent1Id: string, agent2Id: string) {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation: Conversation = {
      id: conversationId,
      participants: [agent1Id, agent2Id],
      messages: [],
      startTime: Date.now(),
      lastActivity: Date.now()
    };

    this.conversations.set(conversationId, conversation);
    
    const agent1 = this.agents.get(agent1Id)!;
    const agent2 = this.agents.get(agent2Id)!;
    
    agent1.currentConversation = conversationId;
    agent2.currentConversation = conversationId;

    // Generate first message from agent1
    await this.generateConversationMessage(agent1Id, 'start');
  }

  private initiateConversation(initiator: Agent, target: Agent) {
    // Use the existing startConversation method
    this.startConversation(initiator.id, target.id);
  }

  private async generateConversationMessage(agentId: string, type: 'start' | 'continue') {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.currentConversation) return;

    const conversation = this.conversations.get(agent.currentConversation);
    if (!conversation) return;

    const otherAgent = this.agents.get(
      conversation.participants.find(id => id !== agentId)!
    );
    if (!otherAgent) return;

    let message: string;

    try {
      // Try to use client LLM if available
      if (clientLLM.isReady()) {
        const prompt = this.buildConversationPrompt(agent, otherAgent, conversation, type);
        message = await clientLLM.generateResponse(prompt, 100);
        message = this.cleanResponse(message, agent.name);
      } else {
        // Fallback to predefined messages based on agent personality
        message = this.generateFallbackMessage(agent, otherAgent, conversation, type);
      }
    } catch (error) {
      console.error('Error generating conversation message:', error);
      // Use fallback message
      message = this.generateFallbackMessage(agent, otherAgent, conversation, type);
    }

    // Add message to conversation
    conversation.messages.push({
      agentId,
      text: message,
      timestamp: Date.now()
    });

    agent.lastMessage = message;
    agent.lastMessageTime = Date.now();

    console.log(`${agent.name}: ${message}`);

    // Schedule response from other agent
    if (conversation.messages.length < 6) { // Limit conversation length
      setTimeout(() => {
        this.generateConversationMessage(otherAgent.id, 'continue');
      }, 2000 + Math.random() * 3000); // 2-5 seconds delay
    } else {
      // End conversation
      this.endConversation(agent.currentConversation);
    }
  }

  private buildConversationPrompt(agent: Agent, otherAgent: Agent, conversation: Conversation, type: string): string {
    let prompt = `You are ${agent.name}. ${agent.identity}\n\n`;
    
    if (type === 'start') {
      prompt += `You just met ${otherAgent.name}. Start a friendly conversation. Be brief and natural.\n\n`;
    } else {
      prompt += `You're having a conversation with ${otherAgent.name}.\n\nRecent conversation:\n`;
      const recentMessages = conversation.messages.slice(-4);
      recentMessages.forEach(msg => {
        const speaker = msg.agentId === agent.id ? agent.name : otherAgent.name;
        prompt += `${speaker}: ${msg.text}\n`;
      });
      prompt += `\nRespond naturally as ${agent.name}. Keep it brief and conversational.\n\n`;
    }
    
    prompt += `${agent.name}:`;
    return prompt;
  }

  private generateFallbackMessage(agent: Agent, otherAgent: Agent, conversation: Conversation, type: string): string {
    const messages = {
      lucky: {
        start: [
          `Hi ${otherAgent.name}! I just got back from the most amazing space adventure!`,
          `Hello there! I'm Lucky, nice to meet you. Want to hear about my travels?`,
          `Hey ${otherAgent.name}! Have you heard any good gossip lately?`
        ],
        continue: [
          "That's really fascinating! It reminds me of something I saw on a distant planet.",
          "Wow, that's quite interesting! Space travel has taught me to appreciate different perspectives.",
          "Amazing! I'd love to hear more - I collect stories from my adventures.",
          "That's wonderful! Speaking of adventures, have I told you about the cheese mines of Zephyr Prime?"
        ]
      },
      bob: {
        start: [
          `Oh, hi ${otherAgent.name}. I was just... working with the plants.`,
          `Hello. I'm Bob. I prefer to keep to myself, but nice to meet you.`,
          `Hey there. I don't really talk much, but... hi.`
        ],
        continue: [
          "Yeah, sure. That's... nice.",
          "Hmm. Well, I should probably get back to my gardening.",
          "Uh-huh. Look, I'm not really good with people.",
          "Right. Well, plants don't usually disagree with you."
        ]
      },
      stella: {
        start: [
          `Well hello there, ${otherAgent.name}! What a lovely day to meet someone new.`,
          `Hi darling! I'm Stella. You look like someone with excellent taste.`,
          `Hello gorgeous! I bet you have the most interesting stories.`
        ],
        continue: [
          "Oh how fascinating! You know, I have this wonderful opportunity I think you'd love...",
          "That's so clever of you! You seem like someone who appreciates good investments.",
          "How delightfully smart! I have a feeling we could help each other out.",
          "Such wisdom! You know, successful people like us should stick together."
        ]
      },
      alice: {
        start: [
          `Greetings ${otherAgent.name}. I've been pondering the quantum implications of social interaction.`,
          `Hello. I'm Alice. The universe whispers its secrets, but do we listen?`,
          `Hi there. Time is a flat circle, but conversations are... spherical?`
        ],
        continue: [
          "Ah yes, the butterfly effect cascades through even the smallest utterances...",
          "Indeed, much like Schrödinger's cat, truth exists in superposition until observed.",
          "The mathematics of human connection follow such elegant algorithms...",
          "Fascinating! This reminds me of my work on interdimensional probability matrices."
        ]
      },
      pete: {
        start: [
          `Blessings upon you, ${otherAgent.name}! The Lord has brought us together today.`,
          `Hello my friend! I'm Pete. Have you considered the state of your eternal soul lately?`,
          `Greetings! I see God's hand in our meeting today.`
        ],
        continue: [
          "Praise be! The Lord works in mysterious ways through all our conversations.",
          "Indeed, brother/sister! Though beware - the devil lurks in idle words.",
          "Hallelujah! Faith guides us through all of life's trials and tribulations.",
          "Amen! The righteous path is narrow, but salvation awaits the faithful."
        ]
      }
    };

    const agentMessages = messages[agent.id as keyof typeof messages];
    if (!agentMessages) {
      return type === 'start' ? `Hello ${otherAgent.name}!` : "That's interesting.";
    }

    const messageOptions = agentMessages[type as keyof typeof agentMessages];
    return messageOptions[Math.floor(Math.random() * messageOptions.length)];
  }

  private cleanResponse(response: string, characterName: string): string {
    // Clean the response similar to the existing clientLLM implementation
    response = response.replace(new RegExp(`^${characterName}:?\\s*`, 'i'), '');
    response = response.replace(/\n.*$/s, ''); // Remove everything after first newline
    response = response.substring(0, 200).trim();
    
    // Ensure it doesn't end mid-sentence
    const sentences = response.split(/[.!?]+/);
    if (sentences.length > 1) {
      sentences.pop();
      response = sentences.join('.') + '.';
    }
    
    return response || "Hi there!";
  }

  private endConversation(conversationId: string) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    conversation.participants.forEach(agentId => {
      const agent = this.agents.get(agentId);
      if (agent) {
        agent.currentConversation = undefined;
        // Start moving to a new random location
        this.moveAgentRandomly(agent);
      }
    });

    console.log(`Conversation ended: ${conversation.messages.length} messages`);
  }

  private updateConversations() {
    const now = Date.now();
    Array.from(this.conversations.values()).forEach(conversation => {
      // End conversations that have been going too long
      if (now - conversation.startTime > 60000) { // 1 minute max
        this.endConversation(conversation.id);
      }
    });
  }

  private planNewActions() {
    this.agents.forEach(agent => {
      if (!agent.currentConversation && !agent.isMoving && Math.random() < 0.20) {
        // Enhanced decision making for NPCs
        this.makeIntelligentDecision(agent);
      }
    });
  }

  private makeIntelligentDecision(agent: Agent) {
    if (agent.isUserControlled) return; // Skip user-controlled agents

    const nearbyAgents = this.findNearbyAgents(agent, 200); // Find agents within 200px
    const availableAgents = nearbyAgents.filter(a => !a.currentConversation && !a.isMoving);
    
    // Decision priorities based on agent's goals and context
    const decisions = this.evaluateDecisionOptions(agent, availableAgents);
    
    // Execute the highest priority decision
    const chosenDecision = this.selectDecisionWithRandomness(decisions);
    this.executeDecision(agent, chosenDecision, availableAgents);
  }

  private findNearbyAgents(agent: Agent, radius: number): Agent[] {
    return Array.from(this.agents.values()).filter(otherAgent => {
      if (otherAgent.id === agent.id) return false;
      const distance = this.getDistance(agent.position, otherAgent.position);
      return distance <= radius;
    });
  }

  private evaluateDecisionOptions(agent: Agent, availableAgents: Agent[]): DecisionOption[] {
    const decisions: DecisionOption[] = [];

    // 1. Socialize with nearby agents (higher priority for social characters)
    if (availableAgents.length > 0) {
      const socialScore = this.getSocialScore(agent);
      decisions.push({
        type: 'socialize',
        priority: socialScore * 0.4,
        target: availableAgents[0] // Choose closest available agent
      });
    }

    // 2. Explore new areas (good for curious characters)
    const explorationScore = this.getExplorationScore(agent);
    decisions.push({
      type: 'explore',
      priority: explorationScore * 0.3,
      target: this.findInterestingDestination(agent)
    });

    // 3. Return to a familiar location (comfort-seeking behavior)
    if (agent.memories && agent.memories.length > 0) {
      decisions.push({
        type: 'return_home',
        priority: 0.2,
        target: this.getHomeLocation(agent)
      });
    }

    // 4. Idle/rest (always an option)
    decisions.push({
      type: 'idle',
      priority: 0.1,
      target: null
    });

    return decisions.sort((a, b) => b.priority - a.priority);
  }

  private getSocialScore(agent: Agent): number {
    // Base social tendency from identity
    let score = 0.5;
    if (agent.identity?.toLowerCase().includes('social') || 
        agent.identity?.toLowerCase().includes('friendly') ||
        agent.identity?.toLowerCase().includes('outgoing')) {
      score += 0.3;
    }
    if (agent.identity?.toLowerCase().includes('shy') || 
        agent.identity?.toLowerCase().includes('quiet')) {
      score -= 0.2;
    }
    
    // Recent conversation history affects sociability
    const recentConversations = this.getRecentConversationCount(agent);
    if (recentConversations > 2) score -= 0.1; // Less likely to socialize if recently active
    
    return Math.max(0, Math.min(1, score));
  }

  private getExplorationScore(agent: Agent): number {
    let score = 0.5;
    if (agent.identity?.toLowerCase().includes('curious') || 
        agent.identity?.toLowerCase().includes('explorer') ||
        agent.identity?.toLowerCase().includes('adventurous')) {
      score += 0.4;
    }
    if (agent.identity?.toLowerCase().includes('homebody') || 
        agent.identity?.toLowerCase().includes('cautious')) {
      score -= 0.2;
    }
    return Math.max(0, Math.min(1, score));
  }

  private findInterestingDestination(agent: Agent): Position {
    // Find locations that might be interesting (near buildings, water, etc.)
    const mapWidth = 1440;
    const mapHeight = 1024;
    
    // Interesting areas based on the map
    const interestingAreas = [
      { x: 300, y: 400 }, // Near the buildings
      { x: 800, y: 300 }, // Near the water
      { x: 600, y: 600 }, // Central area
      { x: 200, y: 800 }, // Forest area
      { x: 1000, y: 500 }, // Eastern area
    ];
    
    // Choose a random interesting area, or completely random if none appeal
    if (Math.random() < 0.7) {
      const area = interestingAreas[Math.floor(Math.random() * interestingAreas.length)];
      return {
        x: area.x + (Math.random() - 0.5) * 200, // Add some randomness around the area
        y: area.y + (Math.random() - 0.5) * 200
      };
    } else {
      return {
        x: Math.random() * (mapWidth - 100) + 50,
        y: Math.random() * (mapHeight - 100) + 50
      };
    }
  }

  private getHomeLocation(agent: Agent): Position {
    // For simplicity, use a consistent "home" area based on agent ID
    const hash = agent.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return {
      x: Math.abs(hash % 800) + 200,
      y: Math.abs((hash >> 8) % 600) + 200
    };
  }

  private getRecentConversationCount(agent: Agent): number {
    const now = Date.now();
    return agent.memories?.filter(memory => 
      memory.includes('conversation') && 
      now - (agent.lastMessageTime || 0) < 300000 // Last 5 minutes
    ).length || 0;
  }

  private selectDecisionWithRandomness(decisions: DecisionOption[]): DecisionOption {
    // Weighted random selection with bias toward higher priority
    const weights = decisions.map(d => Math.pow(d.priority, 2)); // Square to emphasize differences
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    let random = Math.random() * totalWeight;
    for (let i = 0; i < decisions.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return decisions[i];
      }
    }
    
    return decisions[0]; // Fallback
  }

  private executeDecision(agent: Agent, decision: DecisionOption, availableAgents: Agent[]) {
    console.log(`${agent.name} decided to ${decision.type} (priority: ${decision.priority.toFixed(2)})`);
    
    switch (decision.type) {
      case 'socialize':
        if (decision.target && typeof decision.target === 'object' && 'id' in decision.target) {
          // Target is an Agent
          const targetAgent = decision.target as Agent;
          if (availableAgents.includes(targetAgent)) {
            this.initiateConversation(agent, targetAgent);
          }
        }
        break;
      
      case 'explore':
        if (decision.target && typeof decision.target === 'object' && 'x' in decision.target) {
          // Target is a Position
          const targetPosition = decision.target as Position;
          agent.targetPosition = targetPosition;
          agent.isMoving = true;
          // Add memory of exploration
          if (!agent.memories) agent.memories = [];
          agent.memories.push(`Decided to explore area at ${targetPosition.x}, ${targetPosition.y}`);
          if (agent.memories.length > 10) agent.memories = agent.memories.slice(-10);
        }
        break;
      
      case 'return_home':
        if (decision.target && typeof decision.target === 'object' && 'x' in decision.target) {
          // Target is a Position
          const targetPosition = decision.target as Position;
          agent.targetPosition = targetPosition;
          agent.isMoving = true;
          if (!agent.memories) agent.memories = [];
          agent.memories.push(`Returning to familiar area`);
        }
        break;
      
      case 'idle':
        // Agent chooses to stay put and rest
        if (!agent.memories) agent.memories = [];
        agent.memories.push(`Taking a moment to rest and observe surroundings`);
        break;
    }
  }

  private moveAgentRandomly(agent: Agent) {
    // This is now handled by the intelligent decision system
    this.makeIntelligentDecision(agent);
  }

  private getDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Public API
  public getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  public getConversations(): Conversation[] {
    return Array.from(this.conversations.values());
  }

  public getActiveConversations(): Conversation[] {
    const now = Date.now();
    return Array.from(this.conversations.values()).filter(
      conv => conv.messages.some(msg => now - msg.timestamp < 10000) // Active in last 10 seconds
    );
  }

  public addUserCharacter(name: string, identity: string): string {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userAgent: Agent = {
      id: userId,
      name: name,
      identity: identity,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      isMoving: false,
      isUserControlled: true,
      memories: [],
      goals: ['Interact with other characters', 'Have interesting conversations']
    };

    this.agents.set(userId, userAgent);
    
    if (this.onUpdate) {
      this.onUpdate();
    }

    return userId;
  }

  public removeUserCharacter(userId: string): boolean {
    const agent = this.agents.get(userId);
    if (!agent || !agent.isUserControlled) {
      return false;
    }

    // End any active conversations
    if (agent.currentConversation) {
      this.endConversation(agent.currentConversation);
    }

    this.agents.delete(userId);

    if (this.onUpdate) {
      this.onUpdate();
    }

    return true;
  }

  public moveUserCharacter(userId: string, targetPosition: Position): boolean {
    const agent = this.agents.get(userId);
    if (!agent || !agent.isUserControlled) {
      return false;
    }

    agent.targetPosition = targetPosition;
    agent.isMoving = true;

    return true;
  }

  public sendUserMessage(userId: string, message: string, targetAgentId?: string): boolean {
    const userAgent = this.agents.get(userId);
    if (!userAgent || !userAgent.isUserControlled) {
      return false;
    }

    // If targeting a specific agent, start a conversation
    if (targetAgentId) {
      const targetAgent = this.agents.get(targetAgentId);
      if (!targetAgent || targetAgent.currentConversation) {
        return false;
      }

      // Check if close enough to start conversation
      const distance = this.getDistance(userAgent.position, targetAgent.position);
      if (distance > 80) {
        return false; // Too far away
      }

      // Start conversation if not already in one
      if (!userAgent.currentConversation) {
        this.startConversation(userId, targetAgentId);
      }

      // Add message to conversation
      const conversation = this.conversations.get(userAgent.currentConversation!);
      if (conversation) {
        conversation.messages.push({
          agentId: userId,
          text: message,
          timestamp: Date.now()
        });

        userAgent.lastMessage = message;
        userAgent.lastMessageTime = Date.now();

        // Schedule AI response
        setTimeout(() => {
          this.generateConversationMessage(targetAgentId, 'continue');
        }, 1000 + Math.random() * 2000);
      }
    }

    return true;
  }

  public createCustomNPC(name: string, identity: string, plan?: string): string {
    const npcId = `npc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const customNPC: Agent = {
      id: npcId,
      name: name,
      identity: identity,
      plan: plan,
      character: 'f' + (Math.floor(Math.random() * 8) + 1), // Random character sprite
      position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 },
      isMoving: false,
      memories: [`Created with identity: ${identity}`],
      goals: plan ? [plan] : ['Interact with others', 'Be helpful']
    };

    this.agents.set(npcId, customNPC);
    
    if (this.onUpdate) {
      this.onUpdate();
    }

    return npcId;
  }

  // Expose internal data for world persistence
  public getAgentsMap(): Map<string, Agent> {
    return this.agents;
  }

  public getConversationsMap(): Map<string, Conversation> {
    return this.conversations;
  }

  public clearWorld(): void {
    this.agents.clear();
    this.conversations.clear();
    this.initializeAgents();
    
    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  // Enhanced NPC Control Methods
  public giveNPCGoal(npcId: string, goal: string): boolean {
    const npc = this.agents.get(npcId);
    if (!npc || npc.isUserControlled) {
      return false;
    }

    if (!npc.goals) npc.goals = [];
    npc.goals.unshift(goal); // Add to front as highest priority
    if (npc.goals.length > 5) npc.goals = npc.goals.slice(0, 5); // Limit to 5 goals

    if (!npc.memories) npc.memories = [];
    npc.memories.push(`Given new goal: ${goal}`);
    
    console.log(`${npc.name} received new goal: ${goal}`);
    
    // Trigger immediate decision making with the new goal
    this.makeIntelligentDecision(npc);
    
    if (this.onUpdate) {
      this.onUpdate();
    }

    return true;
  }

  public directNPCToLocation(npcId: string, targetPosition: Position, purpose?: string): boolean {
    const npc = this.agents.get(npcId);
    if (!npc || npc.isUserControlled) {
      return false;
    }

    npc.targetPosition = targetPosition;
    npc.isMoving = true;
    
    if (!npc.memories) npc.memories = [];
    const purposeText = purpose ? ` to ${purpose}` : '';
    npc.memories.push(`Directed to move to location (${targetPosition.x}, ${targetPosition.y})${purposeText}`);
    
    if (!npc.goals) npc.goals = [];
    npc.goals.unshift(purpose || `Move to specified location`);
    
    console.log(`${npc.name} directed to move to (${targetPosition.x}, ${targetPosition.y})${purposeText}`);
    
    if (this.onUpdate) {
      this.onUpdate();
    }

    return true;
  }

  public makeNPCTalkTo(npcId: string, targetNpcId: string): boolean {
    const npc = this.agents.get(npcId);
    const target = this.agents.get(targetNpcId);
    
    if (!npc || !target || npc.isUserControlled || target.isUserControlled) {
      return false;
    }

    if (npc.currentConversation || target.currentConversation) {
      return false; // One of them is already in conversation
    }

    // First move NPC closer to target if they're far apart
    const distance = this.getDistance(npc.position, target.position);
    if (distance > 100) {
      // Move NPC closer first
      const direction = {
        x: target.position.x - npc.position.x,
        y: target.position.y - npc.position.y
      };
      const magnitude = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
      npc.targetPosition = {
        x: target.position.x - (direction.x / magnitude) * 50, // Stop 50 pixels away
        y: target.position.y - (direction.y / magnitude) * 50
      };
      npc.isMoving = true;
      
      // Set a goal to talk once they get there
      if (!npc.goals) npc.goals = [];
      npc.goals.unshift(`Talk to ${target.name}`);
    } else {
      // Start conversation immediately
      this.initiateConversation(npc, target);
    }
    
    console.log(`${npc.name} instructed to talk to ${target.name}`);
    
    if (this.onUpdate) {
      this.onUpdate();
    }

    return true;
  }

  public getNPCStatus(npcId: string): NPCStatus | null {
    const npc = this.agents.get(npcId);
    if (!npc) return null;

    return {
      id: npc.id,
      name: npc.name,
      currentActivity: npc.isMoving ? 'moving' : 
                      npc.currentConversation ? 'talking' : 'idle',
      currentGoals: npc.goals || [],
      recentMemories: (npc.memories || []).slice(-5),
      position: npc.position,
      canBeControlled: !npc.isUserControlled
    };
  }

  public getAllNPCStatuses(): NPCStatus[] {
    return Array.from(this.agents.values())
      .filter(agent => !agent.isUserControlled)
      .map(agent => this.getNPCStatus(agent.id)!)
      .filter(status => status !== null);
  }
}

// Create singleton instance
export const agentSimulation = new StaticAgentSimulation();