# Persona Generation Agent - Setup Guide

This guide explains how to set up authenticated social media access and use workflows for comprehensive persona research.

## 📋 Table of Contents

1. [Instagram Authentication Setup](#instagram-authentication-setup)
2. [Understanding Workflows](#understanding-workflows)
3. [Using the Persona Research Workflow](#using-the-persona-research-workflow)
4. [Tool Overview](#tool-overview)

---

## 🔐 Instagram Authentication Setup

### Why Authenticate?

When logged into Instagram, you can access:

- ✅ Full profiles (even semi-private ones you follow)
- ✅ All posts (not just 12 recent)
- ✅ Comments and engagement data
- ✅ Stories
- ✅ Hashtags and location tags
- ✅ Follower/following lists
- ✅ Tagged photos

### How to Get Your Instagram Session ID

#### Method 1: Using Browser Developer Tools (Recommended)

1. **Open Instagram in your browser** (Chrome, Firefox, Safari)
2. **Log in to your account**
3. **Open Developer Tools**:
   - Chrome/Edge: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - Firefox: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
   - Safari: Enable Developer Menu in Preferences, then press `Cmd+Option+I`

4. **Navigate to the Application/Storage tab**:
   - Chrome/Edge: Click "Application" tab → "Cookies" → "https://www.instagram.com"
   - Firefox: Click "Storage" tab → "Cookies" → "https://www.instagram.com"
   - Safari: Click "Storage" tab → "Cookies" → "https://www.instagram.com"

5. **Find the `sessionid` cookie**:
   - Look for a cookie named `sessionid`
   - Copy its **Value** (it's a long string like: `1234567890%3A...`)

6. **Add to your `.env` file**:
   ```bash
   INSTAGRAM_SESSION_ID=your_copied_session_id_here
   ```

#### Security Notes

⚠️ **IMPORTANT**:

- **Never commit your `.env` file** to Git (it's already in `.gitignore`)
- **Keep your session ID private** - it's like a password
- **Session IDs expire** - you may need to refresh it periodically
- **Use a dedicated research account** if possible, not your personal account

### Testing Instagram Tool

Once configured, test the tool:

```typescript
import { mastra } from "./src/mastra";

const agent = mastra.getAgent("personaDataCollectionAgent");

const result = await agent.generate(
  "Research the Instagram profile of username: natgeo"
);

console.log(result.text);
```

---

## 🔄 Understanding Workflows

### What are Mastra Workflows?

Workflows are **multi-step processes** that orchestrate complex tasks. Think of them as pipelines where:

- Each step performs a specific task
- Steps can run sequentially or in parallel
- Data flows from one step to the next
- Steps can use tools, agents, and APIs

### Why Use Workflows for Persona Research?

**Without Workflow** (using just an agent):

- ❌ Agent tries to do everything at once
- ❌ May forget to check certain platforms
- ❌ Hard to track progress
- ❌ Inconsistent results

**With Workflow**:

- ✅ Structured, step-by-step process
- ✅ Ensures all sources are checked
- ✅ Parallel processing for speed
- ✅ Consistent, comprehensive results
- ✅ Easy to debug and improve

### Persona Research Workflow Architecture

```
Input: Person's Name + Context
         |
         ↓
   [Step 1: Basic Discovery]
   - Brave search for profiles
   - Find social media presence
         |
         ↓
    [Step 2 & 3: Parallel]
    ├─→ Professional Research ──┐
    │   - LinkedIn              │
    │   - Articles/Publications │
    │                           │
    └─→ Social Media Research ──┤
        - Instagram  │
        - Twitter analysis      │
                                │
         ↓←─────────────────────┘
   [Step 4: Community Research]
   - Reddit activity
   - Forum participation
         |
         ↓
   [Step 5: Data Synthesis]
   - LLM combines all data
   - Creates coherent profile
         |
         ↓
   [Step 6: Prompt Generation]
   - Generate AI-ready persona
   - Extract key insights
         |
         ↓
   Output: Complete Persona Profile
```

---

## 🚀 Using the Persona Research Workflow

### Basic Usage

```typescript
import { mastra } from "./src/mastra";

async function researchPerson() {
  const workflow = mastra.getWorkflow("personaResearchWorkflow");

  const run = await workflow.createRunAsync();

  const result = await run.start({
    inputData: {
      name: "Jane Smith",
      additionalContext: "Software Engineer at Google",
      purposeContext: "Recruiting outreach",
    },
  });

  console.log("Persona Prompt:", result.personaPrompt);
  console.log("Key Insights:", result.keyInsights);
  console.log("Recommended Approach:", result.recommendedApproach);
}

researchPerson();
```

### Advanced Usage: Monitoring Progress

```typescript
import { mastra } from "./src/mastra";

async function researchWithProgress() {
  const workflow = mastra.getWorkflow("personaResearchWorkflow");

  const run = await workflow.createRunAsync();

  // Subscribe to events
  run.on("stepComplete", (step) => {
    console.log(`✅ Completed: ${step.id}`);
  });

  run.on("stepError", (error) => {
    console.error(`❌ Error: ${error.stepId} - ${error.message}`);
  });

  const result = await run.start({
    inputData: {
      name: "John Doe",
      additionalContext: "CEO at TechCorp",
    },
  });

  return result;
}
```

### Using Workflow via API

If you're running Mastra as a server:

```bash
POST http://localhost:4111/api/workflows/personaResearchWorkflow/execute

{
  "inputData": {
    "name": "Jane Smith",
    "additionalContext": "Product Manager at Meta",
    "purposeContext": "Sales outreach"
  }
}
```

---

## 🛠 Tool Overview

### Current Tools

| Tool                     | Purpose                                     | Auth Required | Rate Limit         |
| ------------------------ | ------------------------------------------- | ------------- | ------------------ |
| **braveSearchTool**      | Web search for profiles, articles, mentions | API Key       | 1 req/sec          |
| **webScraperTool**       | Extract content from public web pages       | No            | Respect robots.txt |
| **instagramProfileTool** | Deep Instagram profile analysis             | Session ID    | Be reasonable      |

### Planned Tools

- **redditSearchTool** - Reddit user history and activity
- **linkedInScraperTool** - LinkedIn profile extraction
- **twitterProfileTool** - Twitter/X account analysis
- **githubProfileTool** - GitHub contribution analysis

---

## 🎯 Workflow vs Agent: When to Use What?

### Use the **Agent** directly when:

- ✅ Quick, ad-hoc research
- ✅ Single source lookup
- ✅ Testing tools
- ✅ Interactive conversations

### Use the **Workflow** when:

- ✅ Comprehensive research needed
- ✅ Multiple sources must be checked
- ✅ Consistent output format required
- ✅ Batch processing multiple people
- ✅ Integration with other systems

---

## 📊 Example Outputs

### Agent Output (Conversational)

```
Based on my research, Jane Smith is a Senior Software Engineer at Google...
She's active on Twitter where she posts about React and web performance...
Her Instagram shows interests in hiking and photography...
```

### Workflow Output (Structured)

```json
{
  "personaPrompt": "Jane Smith is a...",
  "keyInsights": [
    "Strong technical background in web technologies",
    "Active in open source community",
    "Values work-life balance (hiking posts)",
    "Engaged with React and TypeScript communities",
    "Advocates for accessibility in web design"
  ],
  "recommendedApproach": "Technical, detail-oriented communication...",
  "fullProfile": {
    "professional": {...},
    "personal": {...},
    "communication": {...}
  }
}
```

---

## 🔧 Troubleshooting

### Instagram Tool Returns "Not Authenticated"

- Check that `INSTAGRAM_SESSION_ID` is in your `.env`
- Verify the session ID is still valid (log in again if needed)
- Ensure no extra spaces or quotes in the `.env` value

### Brave Search Rate Limited

- The tool has built-in rate limiting (1 req/sec)
- If you're on paid tier, update the RateLimiter parameter:
  ```typescript
  const rateLimiter = new RateLimiter(3); // 3 requests per second
  ```

### Workflow Fails at Specific Step

- Check the logs for that step
- Test the step independently
- Verify all tools used by that step are working

---

## 🚀 Next Steps

1. **Set up Instagram authentication** (above)
2. **Test individual tools** in the Playground
3. **Run the workflow** on a test person
4. **Refine the workflow steps** based on your needs
5. **Add more tools** (Reddit, Twitter, LinkedIn)

---

## 📚 Resources

- [Mastra Workflows Documentation](https://docs.mastra.ai/workflows)
- [Mastra Tools Documentation](https://docs.mastra.ai/tools)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)
- [Brave Search API](https://brave.com/search/api/)

---

**Need Help?**

- Open an issue on GitHub
- Check Mastra Discord
- Review example implementations
