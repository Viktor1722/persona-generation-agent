import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { questionsAgent } from "./agents/questions-agent";
import { personaAgent } from "./agents/persona-agent";
import { interviewAgent } from "./agents/interview-agent";
import { researchAgent } from "./agents/research-agent";
import { syntheticInterviewWorkflowNew } from "./workflows/synthetic-interview-workflow-new";
import { syntheticInterviewWorkflow } from "./workflows/synthetic-interview-workflow";
import { multiInterviewConsistencyScorer } from "./scorers/interview";

export const mastra = new Mastra({
  agents: { questionsAgent, personaAgent, interviewAgent, researchAgent },
  workflows: { syntheticInterviewWorkflowNew, syntheticInterviewWorkflow },
  scorers: {
    multiInterviewConsistencyScorer,
  },
  storage: new LibSQLStore({
    url: "file:mastra.db",
  }),

  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),

  // AI Tracing configuration for debugging
  observability: {
    default: {
      enabled: true,
    },
  },

  telemetry: {
    enabled: false,
  },
});
