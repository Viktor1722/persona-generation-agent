# Synthetic Interview System - Usage Guide

## Overview

The Synthetic Interview System generates realistic user personas, creates Mom Test interview questions, and conducts automated interviews where the persona authentically answers each question. This creates synthetic interview data for user research without requiring real participants.

## Architecture

The system consists of three agents orchestrated by a workflow:

### Agents

1. **Persona Agent** (`personaAgent`) - Generates detailed, realistic user personas
2. **Questions Agent** (`questionsAgent`) - Creates Mom Test interview questions
3. **Interview Persona Agent** (`interviewPersonaAgent`) - Roleplays as the persona and answers questions

### Workflow

**Synthetic Interview Workflow** (`syntheticInterviewWorkflow`) - Orchestrates the entire process:

- Step 1: Generate Persona
- Step 2: Generate Questions
- Step 3: Conduct Interview
- Step 4: Format Results

## How to Use

### Basic Usage

```typescript
import { mastra } from "./src/mastra/index";

// Get the workflow
const workflow = mastra.getWorkflow("syntheticInterviewWorkflow");

// Create a run instance
const run = await workflow.createRunAsync();

// Execute the workflow
const result = await run.start({
  inputData: {
    // Persona requirements
    personaDescription:
      "non-technical business owner of a small-to-medium enterprise",
    industry: "Retail/E-commerce",
    context: "Running a growing online boutique with 5-10 employees",

    // Interview requirements
    topic: "financial software for business management",
    questionCount: 10,
    interviewFocus: "pain points with current accounting processes",
  },
});

console.log(result);
```

### Using the Test Script

A ready-to-use test script is provided at `test-synthetic-interview.ts`:

```bash
npx tsx test-synthetic-interview.ts
```

### Input Parameters

| Parameter            | Type   | Description                       | Example                                          |
| -------------------- | ------ | --------------------------------- | ------------------------------------------------ |
| `personaDescription` | string | Description of the persona type   | "non-technical SME business owner"               |
| `industry`           | string | Industry context                  | "Retail/E-commerce"                              |
| `context`            | string | Additional persona context        | "Running an online boutique with 5-10 employees" |
| `topic`              | string | Interview topic                   | "financial software"                             |
| `questionCount`      | number | Number of questions (default: 10) | 8                                                |
| `interviewFocus`     | string | Specific focus area               | "pain points with accounting"                    |

### Output Structure

The workflow returns a structured interview result:

```typescript
{
  personaId: string,              // Unique identifier for the persona
  personaSummary: string,         // Brief overview of the persona
  interviewId: string,            // Unique identifier for this interview
  transcript: [                   // Array of Q&A pairs
    {
      question: string,           // The question asked
      answer: string              // Persona's authentic answer
    },
    // ... more Q&A pairs
  ],
  metadata: {
    topic: string,                // Interview topic
    industry: string,             // Industry context
    questionCount: number,        // Number of questions asked
    conductedAt: string          // ISO timestamp
  }
}
```

## Example Output

```json
{
  "personaId": "persona-1234567890-abc123",
  "personaSummary": "Sarah, 42, Owner of a boutique retail store...",
  "interviewId": "interview-1234567890-def456",
  "transcript": [
    {
      "question": "Tell me about the last time you struggled with your accounting process.",
      "answer": "Honestly, just last week I spent three hours trying to reconcile our credit card statements. I kept finding discrepancies and couldn't figure out where they came from. It was so frustrating I almost threw my laptop across the room."
    },
    {
      "question": "What do you currently do to track your business expenses?",
      "answer": "Right now I'm using spreadsheets and it's a nightmare. I have one for inventory, another for expenses, and they don't talk to each other. Sometimes I forget to update them for days and then I'm scrambling to remember what I bought."
    }
    // ... more Q&A pairs
  ],
  "metadata": {
    "topic": "financial software",
    "industry": "Retail/E-commerce",
    "questionCount": 8,
    "conductedAt": "2025-10-31T12:34:56.789Z"
  }
}
```

## Data Persistence

### Personas

Each generated persona is saved with:

- Unique persona ID
- Full persona profile (detailed description)
- Industry and context
- Creation timestamp

Personas can be reused for multiple interviews in future enhancements.

### Interviews

Each interview is saved with:

- Unique interview ID
- Reference to persona ID
- Complete Q&A transcript
- Metadata (topic, industry, question count, timestamp)

## Using Mastra Dev Server

You can test and run the workflow using the Mastra development server:

```bash
npm run dev
```

Then access the Mastra Playground UI where you can:

- Select the `syntheticInterviewWorkflow`
- Input your parameters
- Run the workflow
- View the results in a structured format
- See execution details for each step

## Future Enhancements

The current implementation supports single persona, single interview. Future versions will include:

### Batch Processing

Run multiple personas through the same interview questions:

```typescript
// Future feature
const results = await workflow.batch({
  personas: [
    { description: "SME owner", industry: "Retail" },
    { description: "Enterprise CFO", industry: "Finance" },
    { description: "Startup founder", industry: "Tech" },
  ],
  questionCount: 10,
  topic: "financial software",
});
```

### Interactive Follow-ups

Dynamic question generation based on previous answers:

```typescript
// Future feature
const result = await run.start({
  inputData: {
    /* ... */
  },
  interactiveMode: true, // Enable dynamic follow-ups
  maxFollowUps: 3, // Up to 3 follow-up questions per answer
});
```

### Persona Reuse

Interview existing personas with new questions:

```typescript
// Future feature
const result = await run.start({
  inputData: {
    personaId: "persona-1234567890-abc123", // Use existing persona
    topic: "inventory management software",
    questionCount: 8,
  },
});
```

## Troubleshooting

### Common Issues

**Workflow not found:**

```
Error: Workflow "syntheticInterviewWorkflow" not found
```

Solution: Ensure you've imported and started the Mastra dev server or built the project.

**Agent not found:**

```
Error: Persona Agent not found
```

Solution: Check that all agents are properly registered in `src/mastra/index.ts`.

**Questions parsing fails:**
The questions agent output is parsed to extract numbered or bulleted lists. If parsing fails, it falls back to extracting lines containing question marks.

**Network errors during build:**
The build process may fail due to network issues when installing dependencies in the output directory. This doesn't affect the code compilation - the bundling completes successfully.

## API Key Requirements

Ensure you have the following API keys configured in your `.env` file:

```bash
OPENAI_API_KEY=your_openai_api_key
```

The system uses:

- `openai/gpt-4o` for the Interview Persona Agent
- `openai/gpt-5-nano` for the Persona Agent
- `openai/gpt-5-mini` for the Questions Agent

## File Structure

```
src/mastra/
├── agents/
│   ├── persona-agent.ts              # Generates user personas
│   ├── questions-agent.ts            # Generates Mom Test questions
│   ├── interview-persona-agent.ts    # Roleplays as persona
│   └── personaDataCollection-agent.ts # (Existing) Research agent
├── workflows/
│   ├── synthetic-interview-workflow.ts # Main interview orchestration
│   └── persona-research-workflow.ts    # (Existing) Research workflow
└── index.ts                            # Mastra configuration

test-synthetic-interview.ts             # Test script
```

## Best Practices

1. **Persona Description**: Be specific about the persona's role, experience level, and constraints
2. **Context**: Include relevant situational details (company size, responsibilities, challenges)
3. **Interview Focus**: Narrow down to specific pain points or decision-making areas
4. **Question Count**: Start with 8-12 questions for a focused interview
5. **Topic**: Keep topics specific to get more authentic responses

## Support

For issues or questions:

1. Check the TypeScript compilation: `npx tsc --noEmit`
2. Review the Mastra logs when running `npm run dev`
3. Inspect the workflow output structure
4. Verify all agents are properly configured

## Credits

Built with:

- [Mastra](https://mastra.ai) - Workflow orchestration framework
- [Zod](https://zod.dev) - Schema validation
- OpenAI GPT models - LLM capabilities
