import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";

/**
 * Persona Research Workflow
 *
 * This workflow orchestrates a comprehensive research process to build
 * detailed persona profiles. It separates concerns into distinct steps:
 *
 * 1. Basic Discovery - Find the person across platforms
 * 2. Professional Research - LinkedIn, company info, articles
 * 3. Social Media Deep Dive - Instagram, Twitter, Facebook
 * 4. Community Activity - Reddit, forums, discussions
 * 5. Synthesis - Combine all data into coherent persona
 * 6. Prompt Generation - Create AI-ready persona description
 */

// Step 1: Basic Discovery
const basicDiscoveryStep = createStep({
  id: "basic-discovery",
  description: "Find basic information and social media presence",
  inputSchema: z.object({
    name: z.string().describe("Person's full name"),
    additionalContext: z
      .string()
      .optional()
      .describe("Company, location, or other identifying info"),
  }),
  outputSchema: z.object({
    foundProfiles: z.object({
      linkedin: z.string().optional(),
      twitter: z.string().optional(),
      instagram: z.string().optional(),
      github: z.string().optional(),
      reddit: z.string().optional(),
    }),
    basicInfo: z.object({
      currentRole: z.string().optional(),
      company: z.string().optional(),
      location: z.string().optional(),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const { name, additionalContext } = inputData!;

    // Use Brave search to find profiles
    const searchQuery = additionalContext
      ? `${name} ${additionalContext}`
      : name;

    // Search for each platform
    const searches = [
      `${searchQuery} LinkedIn`,
      `${searchQuery} Twitter`,
      `${searchQuery} Instagram`,
      `${searchQuery} GitHub`,
      `${searchQuery} Reddit`,
    ];

    // In a real implementation, you'd call the brave search tool here
    // For now, returning structure
    return {
      foundProfiles: {
        linkedin: undefined,
        twitter: undefined,
        instagram: undefined,
        github: undefined,
        reddit: undefined,
      },
      basicInfo: {
        currentRole: undefined,
        company: undefined,
        location: undefined,
      },
    };
  },
});

// Step 2: Professional Research
const professionalResearchStep = createStep({
  id: "professional-research",
  description: "Deep dive into professional background and achievements",
  inputSchema: z.object({
    name: z.string(),
    linkedinUrl: z.string().optional(),
    company: z.string().optional(),
  }),
  outputSchema: z.object({
    professionalProfile: z.object({
      currentRole: z.string().optional(),
      previousRoles: z.array(z.string()),
      skills: z.array(z.string()),
      education: z.array(z.string()),
      achievements: z.array(z.string()),
      publications: z.array(z.string()),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const { name, linkedinUrl, company } = inputData!;

    // Use web scraper tool for LinkedIn
    // Use Brave search for articles, publications, etc.

    return {
      professionalProfile: {
        currentRole: undefined,
        previousRoles: [],
        skills: [],
        education: [],
        achievements: [],
        publications: [],
      },
    };
  },
});

// Step 3: Social Media Deep Dive
const socialMediaResearchStep = createStep({
  id: "social-media-research",
  description: "Analyze social media activity for interests and personality",
  inputSchema: z.object({
    instagramUsername: z.string().optional(),
    twitterUsername: z.string().optional(),
  }),
  outputSchema: z.object({
    socialProfile: z.object({
      interests: z.array(z.string()),
      hobbies: z.array(z.string()),
      values: z.array(z.string()),
      communicationStyle: z.string(),
      topHashtags: z.array(z.string()),
      engagementTopics: z.array(z.string()),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const { instagramUsername, twitterUsername } = inputData!;

    // Use Instagram profile tool
    // Use Twitter API or scraper
    // Analyze content for patterns

    return {
      socialProfile: {
        interests: [],
        hobbies: [],
        values: [],
        communicationStyle: "Unknown",
        topHashtags: [],
        engagementTopics: [],
      },
    };
  },
});

// Step 4: Community Activity Research
const communityResearchStep = createStep({
  id: "community-research",
  description: "Research community involvement and discussions",
  inputSchema: z.object({
    name: z.string(),
    redditUsername: z.string().optional(),
  }),
  outputSchema: z.object({
    communityProfile: z.object({
      activeSubreddits: z.array(z.string()),
      discussionTopics: z.array(z.string()),
      expertise: z.array(z.string()),
      helpfulnessScore: z.number(),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const { name, redditUsername } = inputData!;

    // Use Reddit API tool
    // Analyze post history and comments

    return {
      communityProfile: {
        activeSubreddits: [],
        discussionTopics: [],
        expertise: [],
        helpfulnessScore: 0,
      },
    };
  },
});

// Step 5: Data Synthesis
const dataSynthesisStep = createStep({
  id: "data-synthesis",
  description: "Combine all research into coherent persona profile",
  inputSchema: z.object({
    basicInfo: z.any(),
    professionalProfile: z.any(),
    socialProfile: z.any(),
    communityProfile: z.any(),
  }),
  outputSchema: z.object({
    personaProfile: z.object({
      overview: z.string(),
      professional: z.object({
        background: z.string(),
        expertise: z.array(z.string()),
        currentFocus: z.string(),
      }),
      personal: z.object({
        interests: z.array(z.string()),
        values: z.array(z.string()),
        lifestyle: z.string(),
      }),
      communication: z.object({
        style: z.string(),
        preferredTopics: z.array(z.string()),
        engagement: z.string(),
      }),
      psychographics: z.object({
        personality: z.string(),
        motivations: z.array(z.string()),
        painPoints: z.array(z.string()),
      }),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const { basicInfo, professionalProfile, socialProfile, communityProfile } =
      inputData!;

    // Use an LLM to synthesize all data into coherent profile
    const agent = mastra?.getAgent("personaDataCollectionAgent");

    if (!agent) {
      throw new Error("Agent not found");
    }

    const synthesisPrompt = `
      Based on the following research data, create a comprehensive persona profile:
      
      Basic Info: ${JSON.stringify(basicInfo, null, 2)}
      Professional: ${JSON.stringify(professionalProfile, null, 2)}
      Social: ${JSON.stringify(socialProfile, null, 2)}
      Community: ${JSON.stringify(communityProfile, null, 2)}
      
      Create a coherent persona profile that includes:
      1. Overall overview of the person
      2. Professional background and expertise
      3. Personal interests and values
      4. Communication style and preferences
      5. Personality traits and motivations
      
      Format as structured JSON matching the PersonaProfile schema.
    `;

    const response = await agent.generate(synthesisPrompt);

    // Parse the response and structure it
    // In real implementation, you'd use structured output

    return {
      personaProfile: {
        overview: "Synthesized overview would go here",
        professional: {
          background: "",
          expertise: [],
          currentFocus: "",
        },
        personal: {
          interests: [],
          values: [],
          lifestyle: "",
        },
        communication: {
          style: "",
          preferredTopics: [],
          engagement: "",
        },
        psychographics: {
          personality: "",
          motivations: [],
          painPoints: [],
        },
      },
    };
  },
});

// Step 6: Prompt Generation
const promptGenerationStep = createStep({
  id: "prompt-generation",
  description: "Generate AI-ready persona prompt for use with LLMs",
  inputSchema: z.object({
    personaProfile: z.any(),
    purposeContext: z
      .string()
      .optional()
      .describe("What the persona will be used for (e.g., marketing, sales)"),
  }),
  outputSchema: z.object({
    personaPrompt: z.string(),
    keyInsights: z.array(z.string()),
    recommendedApproach: z.string(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { personaProfile, purposeContext } = inputData!;

    const agent = mastra?.getAgent("personaDataCollectionAgent");

    if (!agent) {
      throw new Error("Agent not found");
    }

    const promptGenerationPrompt = `
      Create a detailed persona prompt that can be used with an LLM.
      
      Persona Data: ${JSON.stringify(personaProfile, null, 2)}
      Purpose: ${purposeContext || "General use"}
      
      Generate:
      1. A comprehensive persona prompt describing this person
      2. 5-7 key insights about the person
      3. Recommended approach for engaging with them
      
      The prompt should be detailed enough to capture their personality,
      communication style, interests, and professional background.
    `;

    const response = await agent.generate(promptGenerationPrompt);

    return {
      personaPrompt: response.text,
      keyInsights: [
        "Key insight 1",
        "Key insight 2",
        "Key insight 3",
        "Key insight 4",
        "Key insight 5",
      ],
      recommendedApproach:
        "Recommended approach for engaging with this persona",
    };
  },
});

// Create the workflow by chaining steps
export const personaResearchWorkflow = createWorkflow({
  id: "persona-research-workflow",
  description: "Comprehensive persona research and prompt generation workflow",
  inputSchema: z.object({
    name: z.string().describe("Person's full name"),
    additionalContext: z
      .string()
      .optional()
      .describe("Additional identifying information"),
    purposeContext: z
      .string()
      .optional()
      .describe("What the persona will be used for"),
  }),
  outputSchema: z.object({
    personaPrompt: z.string(),
    keyInsights: z.array(z.string()),
    recommendedApproach: z.string(),
    fullProfile: z.any(),
  }),
})
  .then(basicDiscoveryStep)
  .then(async (context) => {
    // Run professional and social media research in parallel
    const [professional, social] = await Promise.all([
      professionalResearchStep.execute({
        inputData: {
          name: context.inputData?.name!,
          linkedinUrl: context.outputData?.foundProfiles?.linkedin,
          company: context.outputData?.basicInfo?.company,
        },
        mastra: context.mastra,
      }),
      socialMediaResearchStep.execute({
        inputData: {
          instagramUsername: context.outputData?.foundProfiles?.instagram,
          twitterUsername: context.outputData?.foundProfiles?.twitter,
        },
        mastra: context.mastra,
      }),
    ]);

    return {
      ...context.outputData,
      professionalProfile: professional.professionalProfile,
      socialProfile: social.socialProfile,
    };
  })
  .then(communityResearchStep)
  .then(dataSynthesisStep)
  .then(promptGenerationStep);

// Commit the workflow
personaResearchWorkflow.commit();
