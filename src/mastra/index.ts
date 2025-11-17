import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { questionsAgent } from "./agents/questions-agent";
import { personaAgent } from "./agents/persona-agent";
import { interviewAgent } from "./agents/interview-agent";
import { syntheticInterviewWorkflow } from "./workflows/synthetic-interview-workflow";

export const mastra = new Mastra({
  agents: { questionsAgent, personaAgent, interviewAgent },
  workflows: { syntheticInterviewWorkflow },

  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false,
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: false },
  },
});
