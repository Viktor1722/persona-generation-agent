import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import {
  personaQualityScorer,
  problemSpecificityScorer,
  behavioralAccuracyScorer,
  personaBehaviorConsistencyScorer,
} from "../scorers/interview";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// Step 1: Generate Persona
const generatePersonaStep = createStep({
  id: "generate-persona",
  description: "Generate a detailed persona based on requirements",
  inputSchema: z.object({
    personaDescription: z.string(),
    industry: z.string(),
    context: z.string(),
    topic: z.string(),
    questionCount: z.number().default(10),
    interviewFocus: z.string(),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
  }),
  scorers: {
    personaQuality: {
      scorer: personaQualityScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
  },
  execute: async ({ inputData, mastra }) => {
    const {
      personaDescription,
      industry,
      context,
      topic,
      questionCount,
      interviewFocus,
    } = inputData;

    const personaAgent = mastra?.getAgent("personaAgent");

    if (!personaAgent) {
      throw new Error("Persona Agent not found");
    }

    // Create a comprehensive prompt for persona generation
    const personaPrompt = `Create a detailed persona for: ${personaDescription}

    Industry: ${industry}
    Context: ${context}

    Generate a complete persona profile following all guidelines.`;

    const response = await personaAgent.generate(personaPrompt);

    // Generate a unique ID for this persona
    const personaId = `persona-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Extract a brief summary (first few lines or overview section)
    const personaProfile = response.text;
    const lines = personaProfile.split("\n").filter((line) => line.trim());
    const summaryLines = lines.slice(0, 5).join(" ").substring(0, 200);
    const personaSummary = summaryLines + "...";

    return {
      personaId,
      personaProfile,
      personaSummary,
      topic,
      questionCount,
      interviewFocus,
      industry,
    };
  },
});

// Step 2: Generate Questions
const generateQuestionsStep = createStep({
  id: "generate-questions",
  description: "Generate Mom Test interview questions",
  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    topic: z.string(),
    questionCount: z.number(),
    interviewFocus: z.string(),
    industry: z.string(),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    questions: z.array(z.string()),
    topic: z.string(),
    questionCount: z.number(),
    industry: z.string(),
  }),
  scorers: {
    problemSpecificity: {
      scorer: problemSpecificityScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
  },
  execute: async ({ inputData, mastra }) => {
    const {
      topic,
      questionCount,
      interviewFocus,
      industry,
      personaId,
      personaProfile,
      personaSummary,
    } = inputData;

    const questionsAgent = mastra?.getAgent("questionsAgent");

    if (!questionsAgent) {
      throw new Error("Questions Agent not found");
    }

    const questionsPrompt = `Generate ${questionCount} Mom Test interview questions for:

Topic: ${topic}
Industry: ${industry}
Focus: ${interviewFocus}

Create questions that follow The Mom Test principles - focus on past behaviors, real experiences, and specific examples. Do not ask hypothetical or leading questions.`;

    const response = await questionsAgent.generate(questionsPrompt);

    // Parse the numbered list of questions
    const questionText = response.text;
    const lines = questionText.split("\n").filter((line) => line.trim());

    // Extract questions (lines that start with numbers or bullets)
    const questions = lines
      .filter((line) => {
        const trimmed = line.trim();
        return /^\d+[\.)]\s/.test(trimmed) || /^[-*]\s/.test(trimmed);
      })
      .map((line) => {
        // Remove numbering/bullets
        return line
          .trim()
          .replace(/^\d+[\.)]\s*/, "")
          .replace(/^[-*]\s*/, "")
          .trim();
      })
      .filter((q) => q.length > 0);

    // If parsing failed, split by newlines and take non-empty lines
    if (questions.length === 0) {
      const fallbackQuestions = lines
        .filter((line) => line.trim().length > 20 && line.includes("?"))
        .slice(0, questionCount);

      return {
        personaId,
        personaProfile,
        personaSummary,
        questions: fallbackQuestions,
        topic,
        questionCount,
        industry,
      };
    }

    return {
      personaId,
      personaProfile,
      personaSummary,
      questions: questions.slice(0, questionCount),
      topic,
      questionCount,
      industry,
    };
  },
});

// Step 3: Conduct Interview
const conductInterviewStep = createStep({
  id: "conduct-interview",
  description: "Have the persona answer each interview question",
  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    questions: z.array(z.string()),
    topic: z.string(),
    questionCount: z.number(),
    industry: z.string(),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    transcript: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    topic: z.string(),
    questionCount: z.number(),
    industry: z.string(),
    questions: z.array(z.string()),
  }),
  scorers: {
    behavioralAccuracy: {
      scorer: behavioralAccuracyScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
    intraInterviewConsistency: {
      scorer: personaBehaviorConsistencyScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
  },
  execute: async ({ inputData, mastra }) => {
    const {
      personaProfile,
      questions,
      personaId,
      personaSummary,
      topic,
      questionCount,
      industry,
    } = inputData;

    const interviewAgent = mastra?.getAgent("interviewAgent");

    if (!interviewAgent) {
      throw new Error("Interview Persona Agent not found");
    }

    const transcript: Array<{ question: string; answer: string }> = [];

    // Interview the persona with each question
    for (const question of questions) {
      const interviewPrompt = `You are embodying this persona:

        ${personaProfile}

        ---

        You are being interviewed. Here is the question:

        ${question}

        Answer as this persona would, naturally and authentically. Reference your specific situation, pain points, and experiences from the persona profile.`;

      const response = await interviewAgent.generate(interviewPrompt);

      transcript.push({
        question,
        answer: response.text,
      });
    }

    return {
      personaId,
      personaProfile,
      personaSummary,
      transcript,
      topic,
      questionCount,
      industry,
      questions,
    };
  },
});

// Step 4: Format Results
const formatResultsStep = createStep({
  id: "format-results",
  description: "Format the interview results with metadata",
  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    transcript: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    topic: z.string(),
    questionCount: z.number(),
    industry: z.string(),
    questions: z.array(z.string()),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    interviewId: z.string(),
    transcript: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    metadata: z.object({
      topic: z.string(),
      industry: z.string(),
      questionCount: z.number(),
      conductedAt: z.string(),
    }),
    questions: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const {
      personaId,
      personaProfile,
      personaSummary,
      transcript,
      topic,
      industry,
      questionCount,
      questions,
    } = inputData;

    const interviewId = `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const conductedAt = new Date().toISOString();

    return {
      personaId,
      personaProfile,
      personaSummary,
      interviewId,
      transcript,
      metadata: {
        topic,
        industry,
        questionCount,
        conductedAt,
      },
      questions,
    };
  },
});

// Step 5: Analyze Interview
const analyzeInterviewStep = createStep({
  id: "analyze-interview",
  description: "Analyze the interview to extract key insights",
  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    interviewId: z.string(),
    transcript: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    metadata: z.object({
      topic: z.string(),
      industry: z.string(),
      questionCount: z.number(),
      conductedAt: z.string(),
    }),
    questions: z.array(z.string()),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    interviewId: z.string(),
    transcript: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    metadata: z.object({
      topic: z.string(),
      industry: z.string(),
      questionCount: z.number(),
      conductedAt: z.string(),
    }),
    questions: z.array(z.string()),
    analysis: z.object({
      painPoints: z.array(z.string()),
      currentTools: z.array(
        z.object({
          tool: z.string(),
          usage: z.string(),
        })
      ),
      decisionCriteria: z.array(z.string()),
      buyingProcess: z.object({
        teamInvolved: z.array(z.string()),
        evaluationTimeline: z.string(),
        testingApproach: z.string(),
        trialPeriod: z.string(),
        budgetApproval: z.string(),
      }),
      behavioralPatterns: z.array(z.string()),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const {
      personaId,
      personaProfile,
      personaSummary,
      interviewId,
      transcript,
      metadata,
      questions,
    } = inputData;

    const questionsAgent = mastra?.getAgent("questionsAgent");

    if (!questionsAgent) {
      throw new Error("Questions Agent not found");
    }

    // Create a comprehensive analysis prompt
    const transcriptText = transcript
      .map((t, i) => `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer}`)
      .join("\n\n");

    const analysisPrompt = `Analyze this interview transcript and extract key insights. Provide a structured analysis in JSON format with the following sections:

1. painPoints: Array of specific pain points mentioned by the interviewee
2. currentTools: Array of objects with "tool" and "usage" describing their current tool stack
3. decisionCriteria: Array of criteria they use when evaluating new solutions
4. buyingProcess: Object with teamInvolved (array), evaluationTimeline, testingApproach, trialPeriod, budgetApproval
5. behavioralPatterns: Array of observable behavioral patterns

Interview Transcript:
${transcriptText}

Respond ONLY with valid JSON in this exact format:
{
  "painPoints": ["..."],
  "currentTools": [{"tool": "...", "usage": "..."}],
  "decisionCriteria": ["..."],
  "buyingProcess": {
    "teamInvolved": ["..."],
    "evaluationTimeline": "...",
    "testingApproach": "...",
    "trialPeriod": "...",
    "budgetApproval": "..."
  },
  "behavioralPatterns": ["..."]
}`;

    const response = await questionsAgent.generate(analysisPrompt);

    // Parse the JSON response
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (error) {
      // Fallback to default structure if parsing fails
      analysis = {
        painPoints: ["Analysis failed - see transcript for details"],
        currentTools: [],
        decisionCriteria: [],
        buyingProcess: {
          teamInvolved: [],
          evaluationTimeline: "Unknown",
          testingApproach: "Unknown",
          trialPeriod: "Unknown",
          budgetApproval: "Unknown",
        },
        behavioralPatterns: [],
      };
    }

    return {
      personaId,
      personaProfile,
      personaSummary,
      interviewId,
      transcript,
      metadata,
      questions,
      analysis,
    };
  },
});

// Step 6: Generate PDF Report
const generatePDFStep = createStep({
  id: "generate-pdf",
  description: "Generate a structured PDF report of the interview",
  inputSchema: z.object({
    personaId: z.string(),
    personaProfile: z.string(),
    personaSummary: z.string(),
    interviewId: z.string(),
    transcript: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    metadata: z.object({
      topic: z.string(),
      industry: z.string(),
      questionCount: z.number(),
      conductedAt: z.string(),
    }),
    questions: z.array(z.string()),
    analysis: z.object({
      painPoints: z.array(z.string()),
      currentTools: z.array(
        z.object({
          tool: z.string(),
          usage: z.string(),
        })
      ),
      decisionCriteria: z.array(z.string()),
      buyingProcess: z.object({
        teamInvolved: z.array(z.string()),
        evaluationTimeline: z.string(),
        testingApproach: z.string(),
        trialPeriod: z.string(),
        budgetApproval: z.string(),
      }),
      behavioralPatterns: z.array(z.string()),
    }),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaSummary: z.string(),
    interviewId: z.string(),
    transcript: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    metadata: z.object({
      topic: z.string(),
      industry: z.string(),
      questionCount: z.number(),
      conductedAt: z.string(),
    }),
    pdfPath: z.string(),
  }),
  execute: async ({ inputData }) => {
    const {
      personaId,
      personaProfile,
      personaSummary,
      interviewId,
      transcript,
      metadata,
      questions,
      analysis,
    } = inputData;

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), "interview-reports");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create PDF file path
    const pdfPath = path.join(outputDir, `${interviewId}.pdf`);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Helper function to add section title
    const addSectionTitle = (title: string) => {
      doc.fontSize(16).font("Helvetica-Bold").text(title, { underline: true });
      doc.moveDown(0.5);
    };

    // Helper function to add subsection title
    const addSubsectionTitle = (title: string) => {
      doc.fontSize(12).font("Helvetica-Bold").text(title);
      doc.moveDown(0.3);
    };

    // Helper function to add body text
    const addBodyText = (text: string) => {
      doc.fontSize(10).font("Helvetica").text(text);
      doc.moveDown(0.5);
    };

    // Title
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Synthetic Interview Report", { align: "center" });
    doc.moveDown(2);

    // Interview Metadata
    addSectionTitle("Interview Metadata");
    addBodyText(`Interview ID: ${interviewId}`);
    addBodyText(`Persona ID: ${personaId}`);
    addBodyText(`Conducted: ${new Date(metadata.conductedAt).toUTCString()}`);
    addBodyText(`Topic: ${metadata.topic}`);
    addBodyText(`Industry: ${metadata.industry}`);
    addBodyText(`Number of Questions: ${metadata.questionCount}`);
    doc.moveDown();

    // Interview Configuration
    addSectionTitle("Interview Configuration");
    addSubsectionTitle("Target Persona");
    addBodyText(`Description: ${personaSummary}`);
    doc.moveDown();

    // Generated Persona Profile
    addSectionTitle("Generated Persona Profile");

    // Split persona profile into sections
    const profileSections = personaProfile.split("\n\n");
    for (const section of profileSections) {
      if (section.trim()) {
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }

        // Check if it's a heading (starts with #)
        if (section.trim().startsWith("#")) {
          const heading = section.trim().replace(/^#+\s*/, "");
          addSubsectionTitle(heading);
        } else {
          addBodyText(section.trim());
        }
      }
    }
    doc.moveDown();

    // Interview Transcript
    doc.addPage();
    addSectionTitle("Interview Transcript");

    transcript.forEach((item, index) => {
      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
      }

      addSubsectionTitle(`Q${index + 1}: ${item.question}`);
      addBodyText(item.answer);
      doc.moveDown(0.5);
    });

    // Key Insights Summary
    doc.addPage();
    addSectionTitle("Key Insights Summary");

    // Pain Points
    addSubsectionTitle("Pain Points Identified");
    analysis.painPoints.forEach((point) => {
      addBodyText(`• ${point}`);
    });
    doc.moveDown();

    // Current Tools
    if (analysis.currentTools.length > 0) {
      addSubsectionTitle("Current Tool Stack");
      analysis.currentTools.forEach((tool) => {
        addBodyText(`• ${tool.tool}: ${tool.usage}`);
      });
      doc.moveDown();
    }

    // Decision Criteria
    if (analysis.decisionCriteria.length > 0) {
      addSubsectionTitle("Decision-Making Criteria");
      analysis.decisionCriteria.forEach((criteria, index) => {
        addBodyText(`${index + 1}. ${criteria}`);
      });
      doc.moveDown();
    }

    // Buying Process
    addSubsectionTitle("Buying Process");
    if (analysis.buyingProcess.teamInvolved.length > 0) {
      addBodyText(
        `Team involved: ${analysis.buyingProcess.teamInvolved.join(", ")}`
      );
    }
    addBodyText(
      `Evaluation timeline: ${analysis.buyingProcess.evaluationTimeline}`
    );
    addBodyText(`Testing approach: ${analysis.buyingProcess.testingApproach}`);
    addBodyText(`Trial period: ${analysis.buyingProcess.trialPeriod}`);
    addBodyText(`Budget approval: ${analysis.buyingProcess.budgetApproval}`);
    doc.moveDown();

    // Behavioral Patterns
    if (analysis.behavioralPatterns.length > 0) {
      addSubsectionTitle("Behavioral Patterns");
      analysis.behavioralPatterns.forEach((pattern) => {
        addBodyText(`• ${pattern}`);
      });
    }

    // Finalize PDF
    doc.end();

    // Wait for the PDF to be written
    await new Promise<void>((resolve, reject) => {
      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });

    console.log(`PDF report generated: ${pdfPath}`);

    return {
      personaId,
      personaSummary,
      interviewId,
      transcript,
      metadata,
      pdfPath,
    };
  },
});

// Create the workflow by chaining steps
export const syntheticInterviewWorkflowNew = createWorkflow({
  id: "synthetic-interview-workflow-new",
  description:
    "Generate persona, create questions, conduct synthetic interview, and generate PDF report",
  inputSchema: z.object({
    // Persona generation inputs
    personaDescription: z
      .string()
      .describe(
        "Description of the persona (e.g., 'non-technical SME business owner')"
      ),
    industry: z.string().describe("Industry context"),
    context: z
      .string()
      .describe("Additional context about persona's situation"),

    // Question generation inputs
    topic: z
      .string()
      .describe("Topic of the interview (e.g., 'financial software')"),
    questionCount: z
      .number()
      .default(10)
      .describe("Number of questions to generate"),
    interviewFocus: z
      .string()
      .describe(
        "Specific focus for questions (e.g., 'pain points with current accounting processes')"
      ),
  }),
  outputSchema: z.object({
    personaId: z.string(),
    personaSummary: z.string(),
    interviewId: z.string(),
    transcript: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ),
    metadata: z.object({
      topic: z.string(),
      industry: z.string(),
      questionCount: z.number(),
      conductedAt: z.string(),
    }),
    pdfPath: z.string(),
  }),
})
  .then(generatePersonaStep)
  .then(generateQuestionsStep)
  .then(conductInterviewStep)
  .then(formatResultsStep)
  .then(analyzeInterviewStep)
  .then(generatePDFStep)
  .commit();

// Export the workflow
export default syntheticInterviewWorkflowNew;
