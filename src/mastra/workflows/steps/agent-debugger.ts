/**
 * Agent Debugger Utility
 *
 * Provides comprehensive debugging and validation for Mastra agent.generate() results.
 * Helps identify why agent calls might fail or produce unexpected results.
 */

import type { z } from "zod";

/**
 * Result from agent.generate() call
 * Based on Mastra Agent generate() return type
 */
export interface AgentGenerateResult<T = unknown> {
  object?: T;
  text?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
    cachedInputTokens?: number;
  };
  totalUsage?: unknown;
  finishReason?: string;
  steps?: Array<{
    stepType: string;
    finishReason?: string;
    toolCalls?: unknown[];
    toolResults?: unknown[];
    text?: string;
    usage?: unknown;
    content?: unknown;
    warnings?: unknown[];
  }>;
  warnings?: unknown[];
  error?: unknown;
  tripwire?: boolean;
  tripwireReason?: string;
  traceId?: string;
  providerMetadata?: unknown;
}

/**
 * Options for debugging agent results
 */
export interface DebugAgentOptions {
  stepName: string; // e.g., 'run-research', 'pnc-extraction'
  agentName: string; // e.g., 'marketResearch', 'pncMiner'
  maxSteps?: number; // For detecting step limit issues (default: 10)
  throwOnMissing?: boolean; // Whether to throw error if object is missing (default: true)
}

/**
 * Log diagnostic information about an agent.generate() result
 * Helps debug why agent calls might fail or behave unexpectedly
 */
export function logAgentDiagnostics<T>(
  result: AgentGenerateResult<T>,
  options: DebugAgentOptions
): void {
  const maxSteps = options.maxSteps ?? 10;

  // Log comprehensive diagnostic information
  console.log(`[${options.stepName}] Agent result:`, {
    hasObject: !!result.object,
    textLength: result.text?.length,
    usage: result.usage,
    finishReason: result.finishReason,
    stepsCount: result.steps?.length,
    error: result.error,
    warnings: result.warnings,
    tripwire: result.tripwire,
    tripwireReason: result.tripwireReason,
  });

  // Log step details for debugging
  if (result.steps && result.steps.length > 0) {
    console.log(`[${options.stepName}] Step breakdown:`);
    result.steps.forEach((step, i: number) => {
      console.log(`  Step ${i + 1}:`, {
        type: step.stepType,
        finishReason: step.finishReason,
        toolCalls: step.toolCalls?.length || 0,
        textLength: step.text?.length || 0,
        usage: step.usage,
      });
    });
  }

  // Check if we hit the step limit
  const hitStepLimit =
    (result.steps?.length ?? 0) >= maxSteps &&
    result.steps?.[result.steps.length - 1]?.finishReason === "tool-calls";

  if (hitStepLimit) {
    console.warn(
      `⚠️ [${options.stepName}] Agent hit maxSteps limit (${maxSteps}) while still making tool calls - synthesis was never reached`
    );
  }
}

/**
 * Validate and extract the object from an agent.generate() result
 * Throws detailed error if object is missing and throwOnMissing is true
 *
 * @returns The result.object if present, undefined otherwise
 * @throws Error with detailed context if object is missing and throwOnMissing is true
 */
export function validateAgentResult<T>(
  result: AgentGenerateResult<T>,
  options: DebugAgentOptions
): T | undefined {
  const maxSteps = options.maxSteps ?? 10;
  const throwOnMissing = options.throwOnMissing ?? true;

  if (!result.object) {
    // Log the actual text output when object is missing
    console.error(`[${options.stepName}] Debug: result.object is undefined`);
    console.error(`[${options.stepName}] Finish reason:`, result.finishReason);
    console.error(
      `[${options.stepName}] Steps taken:`,
      result.steps?.length,
      "/",
      maxSteps,
      "max"
    );
    console.error(
      `[${options.stepName}] Text output (first 1000 chars):`,
      result.text?.substring(0, 1000)
    );
    console.error(
      `[${options.stepName}] Last step finish reason:`,
      result.steps?.[result.steps.length - 1]?.finishReason
    );

    if (throwOnMissing) {
      // Check if we hit the step limit
      const hitStepLimit =
        (result.steps?.length ?? 0) >= maxSteps &&
        result.steps?.[result.steps.length - 1]?.finishReason === "tool-calls";

      // Provide detailed error message based on failure reason
      let errorDetail = "";
      if (hitStepLimit) {
        errorDetail = ` (hit ${maxSteps}-step limit before synthesis)`;
      } else if (result.finishReason === "length") {
        errorDetail = " (hit token limit)";
      } else if (result.error) {
        errorDetail = ` (error: ${result.error})`;
      } else if (result.tripwire) {
        errorDetail = ` (tripwire: ${result.tripwireReason})`;
      }

      throw new Error(
        `[${options.stepName}] ${options.agentName} agent did not return a valid object${errorDetail}`
      );
    }

    return undefined;
  }

  return result.object;
}

/**
 * Convenience function that combines logging and validation
 * Use this in workflow steps for complete debugging
 *
 * @returns The result.object if present
 * @throws Error if object is missing and throwOnMissing is true
 */
export function debugAndValidateAgentResult<T>(
  result: AgentGenerateResult<T>,
  options: DebugAgentOptions
): T {
  // Log diagnostics first
  logAgentDiagnostics(result, options);

  // Then validate and extract object
  const object = validateAgentResult(result, options);

  if (!object && (options.throwOnMissing ?? true)) {
    // Error will be thrown by validateAgentResult
    throw new Error("Unexpected: validateAgentResult should have thrown");
  }

  return object as T;
}

/**
 * Validate result.object against a Zod schema with detailed error logging
 * Call this after debugAndValidateAgentResult if you need schema validation
 *
 * @returns The validated and typed object
 * @throws Error with detailed schema validation information
 */
export function validateAgentSchema<T extends z.ZodType>(
  object: unknown,
  schema: T,
  options: DebugAgentOptions
): z.infer<T> {
  try {
    // Validate the object against the schema
    const parseResult = schema.safeParse(object);

    if (!parseResult.success) {
      console.error(
        `[${options.stepName}] Schema validation failed for ${options.agentName} result:`
      );
      console.error(
        `[${options.stepName}] Validation errors:`,
        JSON.stringify(parseResult.error.format(), null, 2)
      );
      console.error(
        `[${options.stepName}] Actual object structure:`,
        JSON.stringify(object, null, 2)
      );
      console.error(
        `[${options.stepName}] Object keys:`,
        Object.keys(object || {})
      );

      // Extract specific field errors
      const fieldErrors = parseResult.error.issues.map((issue) => {
        const baseError = {
          path: issue.path.join("."),
          message: issue.message,
        };
        // Type guard for issues that have expected/received properties
        if ("expected" in issue && "received" in issue) {
          return {
            ...baseError,
            expected: issue.expected,
            received: issue.received,
          };
        }
        return baseError;
      });
      console.error(
        `[${options.stepName}] Field-specific errors:`,
        fieldErrors
      );

      throw new Error(
        `[${options.stepName}] ${options.agentName} agent returned invalid structure. ` +
          `First error: ${fieldErrors[0]?.path} - ${fieldErrors[0]?.message}`
      );
    }

    return parseResult.data;
  } catch (error) {
    console.error(
      `[${options.stepName}] Error processing ${options.agentName} result:`,
      error
    );
    throw error;
  }
}

/**
 * Example usage in a workflow step:
 *
 * ```typescript
 * import { debugAndValidateAgentResult, validateAgentSchema } from '../../../lib/agent-debugger';
 * import { ResearchReport } from '../../../agents/schema';
 *
 * const result = await agent.generate(...);
 *
 * // Debug and validate that object exists
 * const rawObject = debugAndValidateAgentResult(result, {
 *     stepName: 'run-research',
 *     agentName: 'marketResearch',
 *     maxSteps: 15,
 * });
 *
 * // Validate against schema
 * const validatedReport = validateAgentSchema(rawObject, ResearchReport, {
 *     stepName: 'run-research',
 *     agentName: 'marketResearch',
 * });
 *
 * return { report: validatedReport };
 * ```
 */
