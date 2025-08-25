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
  messages: { agentId: string; text: string; timestamp: number }[];
  startTime: number;
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
      startTime: Date.now()
    };

    this.conversations.set(conversationId, conversation);
    
    const agent1 = this.agents.get(agent1Id)!;
    const agent2 = this.agents.get(agent2Id)!;
    
    agent1.currentConversation = conversationId;
    agent2.currentConversation = conversationId;

    // Generate first message from agent1
    await this.generateConversationMessage(agent1Id, 'start');
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
      if (!agent.currentConversation && !agent.isMoving && Math.random() < 0.15) {
        // 15% chance to start moving randomly (increased from 10%)
        console.log(`${agent.name} is starting to move to a new location`);
        this.moveAgentRandomly(agent);
      }
    });
  }

  private moveAgentRandomly(agent: Agent) {
    // Map dimensions: 45 tiles × 32px/tile = 1440px width, 32 tiles × 32px/tile = 1024px height
    const mapWidth = 1440;
    const mapHeight = 1024;
    agent.targetPosition = {
      x: Math.random() * (mapWidth - 100) + 50, // Add some margin from edges
      y: Math.random() * (mapHeight - 100) + 50
    };
    agent.isMoving = true;
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
}

// Create singleton instance
export const agentSimulation = new StaticAgentSimulation();