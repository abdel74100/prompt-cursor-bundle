const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const chalk = require('chalk');
const { getPromptDirectory } = require('./aiProviders');

/**
 * Default agent definitions
 */
const DEFAULT_AGENTS = {
  backend: {
    id: 'backend',
    name: 'Backend Agent',
    icon: '⚙️',
    description: 'Implements APIs, DB, WebSocket, business logic.',
    rules: '.prompt-rules/backend-rules.md',
    keywords: ['api', 'fastify', 'prisma', 'db', 'model', 'schema', 'controller', 
               'service', 'repository', 'middleware', 'route', 'endpoint',
               'nestjs', 'express', 'server', 'backend', 'gateway']
  },
  frontend: {
    id: 'frontend',
    name: 'Frontend Agent',
    icon: '🎨',
    description: 'Develops UI interfaces with React/Next.js.',
    rules: '.prompt-rules/frontend-rules.md',
    keywords: ['ui', 'component', 'page', 'react', 'next.js', 'tailwind',
               'frontend', 'form', 'modal', 'layout', 'style', 'css',
               'dashboard ui', 'booking ui', 'interface']
  },
  'frontend-passenger': {
    id: 'frontend-passenger',
    name: 'Frontend Passenger Agent',
    icon: '🚗',
    description: 'Develops Passenger interfaces.',
    rules: '.prompt-rules/frontend-passenger-rules.md',
    keywords: ['passenger', 'booking', 'ride request', 'passenger dashboard',
               'passenger ui', 'map', 'passenger app']
  },
  'frontend-driver': {
    id: 'frontend-driver',
    name: 'Frontend Driver Agent',
    icon: '🚕',
    description: 'Develops Driver interfaces and mobile responsive UI.',
    rules: '.prompt-rules/frontend-driver-rules.md',
    keywords: ['driver', 'driver dashboard', 'status', 'tracking',
               'driver ui', 'driver app', 'driver registration']
  },
  devops: {
    id: 'devops',
    name: 'DevOps Agent',
    icon: '☁️',
    description: 'Generates Docker, CI/CD, pipelines, AWS infrastructure.',
    rules: '.prompt-rules/devops-rules.md',
    keywords: ['docker', 'ci/cd', 'aws', 'deploy', 'kubernetes', 'terraform',
               'infrastructure', 'pipeline', 'monitoring', 'alerting',
               'production', 'staging', 'environment']
  },
  database: {
    id: 'database',
    name: 'Database Agent',
    icon: '🗄️',
    description: 'Handles database schema, migrations, seeds.',
    rules: '.prompt-rules/database-rules.md',
    keywords: ['database', 'schema', 'migration', 'seed', 'prisma',
               'postgresql', 'mongodb', 'mysql', 'redis', 'orm']
  },
  auth: {
    id: 'auth',
    name: 'Authentication Agent',
    icon: '🔐',
    description: 'Implements authentication and authorization.',
    rules: '.prompt-rules/auth-rules.md',
    keywords: ['auth', 'authentication', 'authorization', 'jwt', 'oauth',
               'login', 'register', 'session', 'token', 'guard', 'permission']
  },
  realtime: {
    id: 'realtime',
    name: 'Realtime Agent',
    icon: '⚡',
    description: 'Handles WebSocket, Redis pub/sub, streaming.',
    rules: '.prompt-rules/realtime-rules.md',
    keywords: ['websocket', 'redis', 'pub/sub', 'streaming', 'realtime',
               'socket.io', 'event', 'notification', 'live']
  },
  testing: {
    id: 'testing',
    name: 'Testing Agent',
    icon: '🧪',
    description: 'Creates unit tests, e2e tests, integration tests.',
    rules: '.prompt-rules/testing-rules.md',
    keywords: ['test', 'jest', 'cypress', 'playwright', 'e2e', 'unit',
               'integration', 'spec', 'coverage', 'mock']
  },
  architecture: {
    id: 'architecture',
    name: 'Architecture Agent',
    icon: '🏗️',
    description: 'Designs system architecture and patterns.',
    rules: '.prompt-rules/architecture-rules.md',
    keywords: ['architecture', 'pattern', 'design', 'structure', 'monorepo',
               'microservice', 'domain', 'layer', 'clean code']
  }
};

/**
 * Default rules templates for each agent
 */
const DEFAULT_RULES_TEMPLATES = {
  backend: `# Backend Rules – Default Template

## Base Stack
- Fastify / NestJS / Express
- Prisma ORM
- PostgreSQL
- Zod / class-validator
- JWT Auth

## File Structure
\`\`\`
src/
 ├─ modules/
 ├─ routes/
 ├─ schemas/
 ├─ services/
 ├─ repositories/
 └─ middleware/
\`\`\`

## Principles
- No business logic in routes/controllers
- Systematic validation with schemas
- Services must be testable
- Use dependency injection
- Repository pattern for data access
- Proper error handling with custom exceptions

## Conventions
- camelCase for variables and functions
- PascalCase for classes and interfaces
- kebab-case for file names
- Prefix interfaces with 'I'
`,

  frontend: `# Frontend Rules – Default Template

## Base Stack
- React / Next.js
- TypeScript
- Tailwind CSS
- Shadcn/UI components
- React Query / SWR for data fetching

## File Structure
\`\`\`
src/
 ├─ components/
 │   ├─ ui/
 │   └─ features/
 ├─ pages/ or app/
 ├─ hooks/
 ├─ lib/
 ├─ styles/
 └─ types/
\`\`\`

## Principles
- Component composition over inheritance
- Custom hooks for reusable logic
- Responsive design first
- Accessibility (a11y) compliance
- Performance optimization (lazy loading, memoization)

## Conventions
- PascalCase for components
- camelCase for hooks (useXxx)
- One component per file
- Collocate tests with components
`,

  'frontend-passenger': `# Frontend Passenger Rules

## Scope
- Passenger-facing interfaces only
- Booking flow
- Ride tracking
- Payment integration UI
- Map components

## Specific Patterns
- Real-time ride status updates
- Location-based UI components
- Mobile-first responsive design
- Optimistic UI updates

## Key Components
- BookingForm
- RideTracker
- PaymentForm
- MapView
- RideHistory
`,

  'frontend-driver': `# Frontend Driver Rules

## Scope
- Driver-facing interfaces only
- Driver dashboard
- Ride acceptance flow
- Navigation integration
- Earnings display

## Specific Patterns
- Background location tracking
- Push notification handling
- Offline-first capabilities
- Real-time status sync

## Key Components
- DriverDashboard
- RideRequestCard
- NavigationView
- EarningsChart
- AvailabilityToggle
`,

  devops: `# DevOps Rules – Default Template

## Infrastructure Stack
- Docker / Docker Compose
- AWS (ECS, RDS, S3, CloudFront)
- Terraform
- GitHub Actions CI/CD

## File Structure
\`\`\`
infra/
 ├─ docker/
 ├─ terraform/
 ├─ k8s/
 └─ scripts/
.github/
 └─ workflows/
\`\`\`

## Principles
- Infrastructure as Code (IaC)
- Environment parity (dev/staging/prod)
- Secret management (AWS Secrets Manager)
- Zero-downtime deployments
- Monitoring and alerting

## Conventions
- Separate configs per environment
- Use multi-stage Docker builds
- Tag images with git SHA
- Document all infrastructure decisions
`,

  database: `# Database Rules – Default Template

## Stack
- PostgreSQL (primary)
- Redis (caching, sessions)
- Prisma ORM

## Schema Conventions
- UUID for primary keys
- Timestamps (createdAt, updatedAt)
- Soft deletes when appropriate
- Proper indexing strategy

## Principles
- Normalize when possible
- Denormalize for performance when needed
- Use migrations for all schema changes
- Seed data for development
- Backup strategy defined

## Naming
- snake_case for columns
- Singular table names
- Prefix junction tables with both entity names
`,

  auth: `# Authentication Rules – Default Template

## Stack
- JWT (access + refresh tokens)
- bcrypt for password hashing
- OAuth2 for social login

## Security Principles
- Short-lived access tokens (15min)
- Long-lived refresh tokens (7 days)
- Secure cookie storage
- Rate limiting on auth endpoints
- Password complexity requirements

## Implementation
- Stateless authentication
- Role-based access control (RBAC)
- Permission guards on routes
- Audit logging for auth events
`,

  realtime: `# Realtime Rules – Default Template

## Stack
- Socket.io / WebSocket
- Redis Pub/Sub
- Redis GEO for location

## Patterns
- Room-based messaging
- Presence detection
- Reconnection handling
- Message acknowledgment

## Events
- Namespace separation by feature
- Event versioning
- Payload validation
- Error event handling

## Scaling
- Redis adapter for multi-instance
- Connection pooling
- Heartbeat mechanism
`,

  testing: `# Testing Rules – Default Template

## Stack
- Jest (unit tests)
- Cypress / Playwright (e2e)
- Testing Library
- MSW (API mocking)

## Coverage Requirements
- Minimum 80% coverage
- Critical paths 100% covered
- Integration tests for APIs
- E2E for user flows

## Patterns
- Arrange-Act-Assert
- Test isolation
- Mock external services
- Factories for test data

## Conventions
- \`*.test.ts\` for unit tests
- \`*.spec.ts\` for integration tests
- \`*.e2e.ts\` for e2e tests
`,

  architecture: `# Architecture Rules – Default Template

## Principles
- Clean Architecture
- SOLID principles
- Domain-Driven Design (DDD)
- Event-driven when appropriate

## Structure
- Clear layer separation
- Dependency inversion
- Bounded contexts
- Aggregates and entities

## Documentation
- Architecture Decision Records (ADR)
- System diagrams
- API documentation
- Data flow diagrams
`
};

/**
 * Agent Manager - handles agents configuration and task mapping
 */
class AgentManager {
  constructor(projectDir, aiProvider = 'cursor') {
    this.projectDir = projectDir;
    this.aiProvider = aiProvider;
    this.promptDir = getPromptDirectory(aiProvider);
    this.agents = new Map();
    this.tasksMap = new Map();
  }

  /**
   * Get default agent definitions
   */
  static getDefaultAgents() {
    return DEFAULT_AGENTS;
  }

  /**
   * Get default rules template for an agent
   */
  static getDefaultRulesTemplate(agentId) {
    return DEFAULT_RULES_TEMPLATES[agentId] || DEFAULT_RULES_TEMPLATES.backend;
  }

  /**
   * Initialize agents from config or defaults
   */
  async initializeAgents(agentIds = null) {
    // Try to load existing config
    const configLoaded = await this.loadConfig();
    
    if (!configLoaded) {
      // Use default agents or specified ones
      const ids = agentIds || Object.keys(DEFAULT_AGENTS);
      for (const id of ids) {
        if (DEFAULT_AGENTS[id]) {
          this.agents.set(id, { ...DEFAULT_AGENTS[id] });
        }
      }
    }
    
    return this.agents;
  }

  /**
   * Detect required agents from project idea
   */
  static detectAgentsFromIdea(ideaContent) {
    const content = ideaContent.toLowerCase();
    const detectedAgents = new Set();
    
    // Always include backend
    detectedAgents.add('backend');
    
    // Check for frontend patterns
    if (content.includes('ui') || content.includes('interface') || 
        content.includes('dashboard') || content.includes('react') ||
        content.includes('next.js') || content.includes('frontend')) {
      detectedAgents.add('frontend');
    }
    
    // Check for passenger/driver specific (ride-sharing apps)
    if (content.includes('passenger') || content.includes('booking') ||
        content.includes('ride request')) {
      detectedAgents.add('frontend-passenger');
    }
    if (content.includes('driver') || content.includes('driver dashboard') ||
        content.includes('driver app')) {
      detectedAgents.add('frontend-driver');
    }
    
    // Check for database
    if (content.includes('database') || content.includes('postgresql') ||
        content.includes('mongodb') || content.includes('prisma') ||
        content.includes('schema')) {
      detectedAgents.add('database');
    }
    
    // Check for auth
    if (content.includes('auth') || content.includes('login') ||
        content.includes('jwt') || content.includes('oauth') ||
        content.includes('authentication')) {
      detectedAgents.add('auth');
    }
    
    // Check for realtime
    if (content.includes('websocket') || content.includes('realtime') ||
        content.includes('socket') || content.includes('real-time') ||
        content.includes('pub/sub') || content.includes('streaming')) {
      detectedAgents.add('realtime');
    }
    
    // Check for devops
    if (content.includes('docker') || content.includes('deploy') ||
        content.includes('ci/cd') || content.includes('aws') ||
        content.includes('kubernetes') || content.includes('infrastructure')) {
      detectedAgents.add('devops');
    }
    
    // Check for testing
    if (content.includes('test') || content.includes('cypress') ||
        content.includes('jest') || content.includes('e2e')) {
      detectedAgents.add('testing');
    }
    
    return Array.from(detectedAgents);
  }

  /**
   * Map tasks to agents based on keywords
   */
  mapTasksToAgents(instructions) {
    const mapping = {};
    
    for (const instruction of instructions) {
      const content = `${instruction.name || ''} ${instruction.content || ''}`.toLowerCase();
      let bestMatch = null;
      let bestScore = 0;
      
      for (const [agentId, agent] of this.agents) {
        let score = 0;
        
        for (const keyword of agent.keywords || []) {
          if (content.includes(keyword.toLowerCase())) {
            score += keyword.length;
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = agentId;
        }
      }
      
      // Default to backend if no match
      mapping[instruction.path || instruction.name] = bestMatch || 'backend';
    }
    
    this.tasksMap = new Map(Object.entries(mapping));
    return mapping;
  }

  /**
   * Auto-map from implementation plan and instructions
   */
  async autoMapFromProject() {
    const mapping = {};
    const instructionsDir = path.join(this.projectDir, this.promptDir, 'workflow', 'Instructions');
    
    try {
      const files = await fs.readdir(instructionsDir);
      
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        
        const filePath = path.join(instructionsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const relativePath = `instructions/${file}`;
        
        // Find best matching agent
        let bestMatch = null;
        let bestScore = 0;
        
        for (const [agentId, agent] of this.agents) {
          let score = 0;
          const contentLower = content.toLowerCase();
          
          for (const keyword of agent.keywords || []) {
            const regex = new RegExp(keyword.toLowerCase(), 'g');
            const matches = contentLower.match(regex);
            if (matches) {
              score += matches.length * keyword.length;
            }
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = agentId;
          }
        }
        
        mapping[relativePath] = bestMatch || 'backend';
      }
    } catch (error) {
      // Instructions dir may not exist yet
    }
    
    this.tasksMap = new Map(Object.entries(mapping));
    return mapping;
  }

  /**
   * Generate tasks-map.json content
   */
  generateTasksMapJson() {
    const map = {};
    for (const [taskPath, agentId] of this.tasksMap) {
      map[taskPath] = agentId;
    }
    return map;
  }

  /**
   * Get tasks for a specific agent
   */
  getTasksForAgent(agentId) {
    const tasks = [];
    for (const [taskPath, assignedAgent] of this.tasksMap) {
      if (assignedAgent === agentId) {
        tasks.push(taskPath);
      }
    }
    return tasks;
  }

  /**
   * Get tasks grouped by step number
   */
  getTasksByStep() {
    const byStep = {};
    
    for (const [taskPath, agentId] of this.tasksMap) {
      const match = taskPath.match(/step(\d+)/i);
      const stepNum = match ? parseInt(match[1]) : 0;
      
      if (!byStep[stepNum]) {
        byStep[stepNum] = {};
      }
      
      if (!byStep[stepNum][agentId]) {
        byStep[stepNum][agentId] = [];
      }
      
      byStep[stepNum][agentId].push(taskPath);
    }
    
    return byStep;
  }

  /**
   * Generate agent prompt for a task
   */
  async generateAgentPrompt(agentId, taskPath, options = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    // Load rules file
    let rulesContent = '';
    const rulesPath = path.join(this.projectDir, agent.rules);
    try {
      rulesContent = await fs.readFile(rulesPath, 'utf-8');
    } catch (error) {
      rulesContent = AgentManager.getDefaultRulesTemplate(agentId);
    }
    
    // Load spec file
    let specContent = '';
    const specPath = path.join(this.projectDir, this.promptDir, 'docs', 'spec.md');
    try {
      specContent = await fs.readFile(specPath, 'utf-8');
    } catch (error) {
      specContent = '(spec.md not found)';
    }
    
    // Load task file
    let taskContent = '';
    const fullTaskPath = path.join(this.projectDir, this.promptDir, 'workflow', 'Instructions', path.basename(taskPath));
    try {
      taskContent = await fs.readFile(fullTaskPath, 'utf-8');
    } catch (error) {
      taskContent = `(Task file not found: ${taskPath})`;
    }
    
    // Generate prompt
    const prompt = `🚀 START

Tu es l'agent : ${agent.icon} ${agent.name.toUpperCase()}

🎯 Mission :
Implémenter les tâches du fichier :
${taskPath}

📘 Règles ${agent.name} :
${rulesContent}

📐 Architecture générale :
${specContent.substring(0, 2000)}${specContent.length > 2000 ? '\n...(truncated)' : ''}

📄 Tâches à implémenter :
${taskContent}

🧱 Contraintes :
- Respecter strictement les règles ${agent.name}
- Utiliser la stack définie
- Retourner exclusivement le code et les fichiers modifiés
- Commenter en anglais
- Code propre et maintenable

🏁 END`;

    return prompt;
  }

  /**
   * Generate assignments markdown
   */
  generateAssignmentsMarkdown() {
    const byStep = this.getTasksByStep();
    const lines = [];
    
    lines.push('# 🤖 Agent Assignments\n');
    lines.push('> Auto-generated mapping of tasks to agents\n');
    lines.push('---\n');
    
    const sortedSteps = Object.keys(byStep).map(Number).sort((a, b) => a - b);
    
    for (const stepNum of sortedSteps) {
      lines.push(`## Étape ${stepNum}\n`);
      
      const agents = byStep[stepNum];
      for (const [agentId, tasks] of Object.entries(agents)) {
        const agent = this.agents.get(agentId) || DEFAULT_AGENTS[agentId];
        const icon = agent ? agent.icon : '📦';
        
        lines.push(`### ${icon} ${agentId}`);
        for (const task of tasks) {
          lines.push(`- ${task}`);
        }
        lines.push('');
      }
      
      lines.push('---\n');
    }
    
    // Summary
    lines.push('## 📊 Résumé\n');
    lines.push('| Agent | Nombre de tâches |');
    lines.push('|-------|------------------|');
    
    const agentCounts = {};
    for (const agentId of this.tasksMap.values()) {
      agentCounts[agentId] = (agentCounts[agentId] || 0) + 1;
    }
    
    for (const [agentId, count] of Object.entries(agentCounts)) {
      const agent = this.agents.get(agentId) || DEFAULT_AGENTS[agentId];
      const icon = agent ? agent.icon : '📦';
      lines.push(`| ${icon} ${agentId} | ${count} |`);
    }
    
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Create agents directory structure
   */
  async createDirectoryStructure() {
    const created = [];
    
    // .prompt-config/
    const configDir = path.join(this.projectDir, '.prompt-config');
    await fs.mkdir(configDir, { recursive: true });
    created.push(configDir);
    
    // .prompt-rules/
    const rulesDir = path.join(this.projectDir, '.prompt-rules');
    await fs.mkdir(rulesDir, { recursive: true });
    created.push(rulesDir);
    
    // .prompt-agents/
    const agentsDir = path.join(this.projectDir, this.promptDir, 'agents');
    await fs.mkdir(agentsDir, { recursive: true });
    created.push(agentsDir);
    
    // .prompt-agents/run/
    const runDir = path.join(agentsDir, 'run');
    await fs.mkdir(runDir, { recursive: true });
    created.push(runDir);
    
    // .prompt-agents/templates/
    const templatesDir = path.join(agentsDir, 'templates');
    await fs.mkdir(templatesDir, { recursive: true });
    created.push(templatesDir);
    
    return created;
  }

  /**
   * Generate rules files for all agents
   */
  async generateRulesFiles() {
    const rulesDir = path.join(this.projectDir, '.prompt-rules');
    await fs.mkdir(rulesDir, { recursive: true });
    
    const created = [];
    
    for (const [agentId, agent] of this.agents) {
      const rulesPath = path.join(this.projectDir, agent.rules);
      const rulesContent = AgentManager.getDefaultRulesTemplate(agentId);
      
      // Only create if doesn't exist
      if (!fsSync.existsSync(rulesPath)) {
        await fs.writeFile(rulesPath, rulesContent, 'utf-8');
        created.push(rulesPath);
      }
    }
    
    return created;
  }

  /**
   * Save agents configuration
   */
  async saveConfig() {
    const configDir = path.join(this.projectDir, '.prompt-config');
    await fs.mkdir(configDir, { recursive: true });
    
    const agentsConfig = {
      agents: Array.from(this.agents.values())
    };
    
    const configPath = path.join(configDir, 'agents.json');
    await fs.writeFile(configPath, JSON.stringify(agentsConfig, null, 2), 'utf-8');
    
    return configPath;
  }

  /**
   * Save tasks map
   */
  async saveTasksMap() {
    const agentsDir = path.join(this.projectDir, this.promptDir, 'agents');
    await fs.mkdir(agentsDir, { recursive: true });
    
    const mapPath = path.join(agentsDir, 'tasks-map.json');
    const mapContent = this.generateTasksMapJson();
    await fs.writeFile(mapPath, JSON.stringify(mapContent, null, 2), 'utf-8');
    
    return mapPath;
  }

  /**
   * Load agents configuration
   */
  async loadConfig() {
    try {
      const configPath = path.join(this.projectDir, '.prompt-config', 'agents.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);
      
      if (config.agents && Array.isArray(config.agents)) {
        for (const agent of config.agents) {
          this.agents.set(agent.id, agent);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Load tasks map
   */
  async loadTasksMap() {
    try {
      const mapPath = path.join(this.projectDir, this.promptDir, 'agents', 'tasks-map.json');
      const content = await fs.readFile(mapPath, 'utf-8');
      const map = JSON.parse(content);
      
      this.tasksMap = new Map(Object.entries(map));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get agent choices for CLI
   */
  static getAgentChoices() {
    return Object.entries(DEFAULT_AGENTS).map(([id, agent]) => ({
      name: `${agent.icon} ${agent.name} - ${agent.description}`,
      value: id,
      short: agent.name
    }));
  }

  /**
   * Generate agents.json content
   */
  generateAgentsJson() {
    return {
      agents: Array.from(this.agents.values())
    };
  }
}

module.exports = AgentManager;
