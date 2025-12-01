# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Mastra-based persona generation agent that creates realistic user personas through AI-powered research, generates interview questions following "The Mom Test" principles, and conducts synthetic interviews. The system uses multiple specialized agents working together in a workflow to produce authentic, research-backed personas with interview transcripts.

**Core Purpose**: Generate high-quality user personas backed by real web research, then conduct realistic interviews as those personas to gather product feedback.

## Development Commands

```bash
# Development mode (starts Mastra dev server with hot reload)
npm run dev

# Build the project
npm run build

# Start production server
npm start
```

## Environment Variables

Required environment variables in `.env`:
- `OPENAI_API_KEY` - OpenAI API key for GPT models
- `BRAVE_API_KEY` - Brave Search API for research agent
- `ANTHROPIC_API_KEY` - Anthropic API key (if using Claude models)
- `PERPLEXITY_API_KEY` - Optional for additional research capabilities

## Architecture

### Framework: Mastra
This project uses the [Mastra framework](https://mastra.dev), an AI agent orchestration system that provides:
- **Agent System**: AI agents with instructions, tools, memory, and scorers
- **Workflow Engine**: Declarative workflows with steps, branching, and state management
- **Scorers**: Quality evaluation system that runs on agent/step outputs
- **Storage**: LibSQL database for persistent storage of agent memory and workflow state
- **Observability**: Built-in tracing and logging for debugging agent behavior

### Core Components

**1. Agents** (`src/mastra/agents/`)
- **researchAgent**: Digital ethnographer that searches web for authentic user data
  - Uses Brave Search tool to find real user voices on Reddit, forums, reviews
  - Targets: vernacular/language, pain points, professional reality, lifestyle
  - Model: GPT-4o-mini
  - Output: Structured research report with findings and sources

- **personaAgent**: Creates/refines detailed user personas following UX research principles
  - Generates personas with 7 sections: Overview, Psychological Traits, Behavior Patterns, Frustrations, Goals, Decision Making, Tech Attitude
  - Enforces specificity (concrete behaviors vs. generic traits)
  - Model: GPT-4o-mini
  - Has strict guard rails to refuse non-persona requests

- **questionsAgent**: Generates "Mom Test" interview questions
  - Focuses on past behaviors, not hypothetical futures
  - Avoids leading questions
  - Model: GPT-5-mini (note: may need to be updated to valid model)

- **interviewAgent**: Embodies the persona during interviews
  - CRITICAL: Agent doesn't act as assistant, it IS the persona
  - Answers authentically using persona's voice, frustrations, experiences
  - Model: GPT-4o

**2. Main Workflow** (`src/mastra/workflows/synthetic-interview-workflow.ts`)

The workflow executes in this sequence:

1. **researchStep** - Research agent gathers web data about persona type
2. **reviewResearchStep** - (Currently minimal, just passes data through)
3. **generatePersonaStep** - Persona agent creates initial persona from research
4. **checkPersonaScoreStep** - Evaluates persona quality with personaQualityScorer
5. **Branch based on quality score**:
   - If score < 0.95 → **refinePersonaStep** (regenerates with scorer feedback)
   - If score >= 0.95 → **useOriginalPersonaStep** (uses as-is)
6. **generateQuestionsStep** - Questions agent generates interview questions
7. **conductInterviewStep** - Interview agent answers all questions as the persona
8. **formatResultsStep** - Packages transcript and metadata into final output

**Key workflow features**:
- Uses `.branch()` for conditional persona refinement
- Each step has inputSchema/outputSchema validated via Zod
- Scorers run within steps and their results drive branching logic
- Tracing context passed through for observability

**3. Scorers** (`src/mastra/scorers/interview/`)

Quality evaluation system that analyzes agent outputs:

- **personaQualityScorer**: Evaluates persona on 3 dimensions (completeness, suitability, specificity)
  - Used in generatePersonaStep to determine if refinement needed
  - Returns structured feedback with scores and improvement suggestions

- **behavioralAccuracyScorer**: Checks if interview answers match persona behaviors
- **personaBehaviorConsistencyScorer**: Validates consistency within interview
- **multiInterviewConsistencyScorer**: Checks consistency across multiple interviews
- **prebuiltScorers**: Mastra-provided scorers (hallucination, faithfulness, prompt alignment, answer relevancy)

Scorers are attached to steps/agents with sampling config (e.g., `type: "ratio", rate: 1` = score everything).

**4. Tools** (`src/mastra/tools/`)

- **braveSearchTool**: Web search via Brave API
  - Includes rate limiter (1100ms between requests) with retry logic
  - Supports web and news search types
  - Returns structured results with title, URL, description, relevance

- **agent-debugger**: Utility for validating and debugging agent structured outputs

**5. Database & Storage**

- Uses LibSQL (SQLite-compatible) for storage
- Database file: `.mastra/mastra.db`
- Stores agent memory, workflow runs, and tracing data
- Each agent configured with memory backed by LibSQLStore

**6. Entry Point** (`src/mastra/index.ts`)

Instantiates the Mastra framework with:
- All agents registered
- Workflows registered
- Scorers registered
- Storage and logging configuration
- Observability enabled for tracing

## Key Patterns & Conventions

### Agent Design
- Agents have strict instructions enforcing their role boundaries
- Use `generate()` for agent execution, optionally with `maxSteps` for tool-heavy agents
- Structured output via Zod schema passed to `generate({ output: Schema })`
- Memory is session-based, stored in LibSQL

### Workflow Steps
- Each step is a `createStep()` with id, description, schemas, execute function
- Steps receive `{ inputData, mastra, tracingContext }` in execute
- Get agents via `mastra?.getAgent(name)`
- Update tracing with `tracingContext.currentSpan?.update({ metadata })`
- Scorers can be attached to steps with sampling config
- For scorers used in branching logic, run them manually in `execute()` to include results in output

### Workflow Branching (CRITICAL)
- `.branch()` wraps output in an object keyed by the step ID that executed
- Example: If `refinePersonaStep` (id: "refine-persona") runs, next step receives:
  ```typescript
  {
    "refine-persona": { personaId, personaProfile, ... }
  }
  ```
- **All steps in a branch MUST have identical inputSchema and outputSchema**
- Next step after branch must either:
  1. Have inputSchema with optional fields for each possible branch step ID, OR
  2. Be an unwrapping/normalizing step (see `prepareForQuestionsStep` as example)
- The workflow uses `prepareForQuestionsStep` after the branch to unwrap the nested data structure back to flat fields

### Scorer Integration
- Scorers evaluate input→output quality
- Attach via `scorers: { name: { scorer, sampling } }` in step/agent config
- Scorer results available in workflow runs but not in step outputs unless manually included
- Use `await scorer.run({ input, output })` for manual scoring

### Error Handling
- Agents throw descriptive errors when not found
- Research step validates structured output with agent-debugger utility
- Rate limiting handled in braveSearchTool with exponential backoff

### Structured Output Validation
- Use Zod schemas for all input/output
- Agent outputs validated with `debugAndValidateAgentResult()` and `validateAgentSchema()` utilities
- Provides detailed error messages for debugging schema mismatches

## Common Development Workflows

### Adding a New Agent
1. Create agent file in `src/mastra/agents/`
2. Define with instructions, model, tools (optional), memory, scorers (optional)
3. Register in `src/mastra/index.ts` in the `agents` object
4. Use in workflow steps via `mastra?.getAgent('agentName')`

### Adding a New Workflow Step
1. Create step file in `src/mastra/workflows/steps/`
2. Define inputSchema, outputSchema, execute function
3. Use `createStep()` from `@mastra/core/workflows`
4. Chain into workflow with `.then(stepName)` or `.branch([conditions, steps])`

### Adding a New Scorer
1. Create scorer file in `src/mastra/scorers/interview/`
2. Define scoring logic using Mastra scorer API
3. Export from `index.ts`
4. Attach to agent or step with sampling configuration

### Debugging Agent Behavior
- Enable observability in mastra config (already enabled)
- Check `.mastra/mastra.db` for agent runs and traces
- Use console.log statements in step execute functions
- Use agent-debugger utility for structured output validation
- Review scorer results to understand quality issues

## Model Configuration

Current models in use:
- Research Agent: `openai/gpt-4o-mini`
- Persona Agent: `openai/gpt-4o-mini`
- Questions Agent: `openai/gpt-5-mini` (NOTE: Verify this is a valid model name)
- Interview Agent: `openai/gpt-4o`

Models specified in agent definitions can be changed by updating the `model` field.

## Important Notes

- **API Rate Limits**: Brave Search is rate-limited to ~1 request/second. The rate limiter is configured in braveSearchTool.
- **Workflow State**: Workflows maintain state between steps. Each step's output becomes input to next step.
- **Agent Memory**: Agents have memory across calls within the same session. Memory is persisted to LibSQL.
- **Scorer Sampling**: Set sampling rate to control which runs get scored (useful for cost/performance)
- **Branching Logic**: Branch conditions are async functions that receive workflow state. Return true to take that branch.
- **TypeScript**: Project uses ES2022 modules with strict TypeScript. No emit, types checked only.

## Project Structure

```
src/mastra/
├── agents/           # AI agent definitions
├── workflows/        # Workflow orchestration
│   └── steps/       # Individual workflow steps
├── scorers/         # Quality evaluation scorers
│   └── interview/   # Interview-specific scorers
└── tools/           # Reusable tools for agents
```
