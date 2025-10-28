# Quick Start Guide

## ✅ What You Now Have

### 1. **Instagram Profile Research Tool**

**File:** `src/mastra/tools/instagram-profile-tool.ts`

**What it does:**

- Accesses Instagram profiles using authenticated session
- Extracts posts, hashtags, interests, engagement rates
- Analyzes visual content preferences
- Works for public profiles or ones you follow

**Setup required:**

1. Get your Instagram session ID (see SETUP.md)
2. Add to `.env`:
   ```bash
   INSTAGRAM_SESSION_ID=your_session_id_here
   ```

### 2. **Comprehensive Persona Research Workflow**

**File:** `src/mastra/workflows/persona-research-workflow.ts`

**What it does:**

- 6-step orchestrated research process
- Parallel processing for speed
- Structured, consistent output
- Generates AI-ready persona prompts

**Steps:**

1. Basic Discovery (find profiles)
2. Professional Research (LinkedIn, articles)
3. Social Media Deep Dive (Instagram, Twitter)
4. Community Research (Reddit, forums)
5. Data Synthesis (combine everything)
6. Prompt Generation (AI-ready output)

### 3. **Updated Agent with All Tools**

**File:** `src/mastra/agents/personaDataCollection-agent.ts`

**Available tools:**

- ✅ Brave Search
- ✅ Web Scraper
- ✅ Instagram Profile Research

---

## 🚀 Quick Usage

### Option 1: Use the Agent Directly

```typescript
import { mastra } from "./src/mastra";

const agent = mastra.getAgent("personaDataCollectionAgent");

// Research using all available tools
const result = await agent.generate(
  "Research John Doe, software engineer at Google. Check his Instagram @johndoe"
);

console.log(result.text);
```

**Best for:**

- Quick lookups
- Interactive conversations
- Testing

### Option 2: Use the Workflow

```typescript
import { mastra } from "./src/mastra";

const workflow = mastra.getWorkflow("personaResearchWorkflow");
const run = await workflow.createRunAsync();

const result = await run.start({
  inputData: {
    name: "John Doe",
    additionalContext: "Software Engineer at Google",
    purposeContext: "Recruiting outreach",
  },
});

console.log("Generated Persona Prompt:", result.personaPrompt);
console.log("Key Insights:", result.keyInsights);
console.log("Recommended Approach:", result.recommendedApproach);
```

**Best for:**

- Comprehensive research
- Batch processing
- Consistent output
- Production use

---

## 🎯 Your Questions Answered

### ❓ "Why use authenticated Instagram access?"

**Answer:** Being logged in gives you 10x more data:

| Not Logged In          | Logged In (Authenticated)   |
| ---------------------- | --------------------------- |
| ~12 recent posts       | All posts                   |
| Limited profile info   | Full biography, stats       |
| No comments visible    | Comments + engagement       |
| No stories             | Stories access              |
| Can't see semi-private | Can see profiles you follow |

### ❓ "How do workflows fit into this project?"

**Answer:** Workflows give you **structure and reliability**:

**Without Workflow** (just agent):

```
Agent tries to: search → find Instagram → scrape → analyze → synthesize
❌ Might skip steps
❌ Inconsistent depth
❌ Hard to debug
```

**With Workflow**:

```
Step 1: Basic Discovery      [Guaranteed]
Step 2: Professional ────┐
Step 3: Social Media ────┼─→ [Parallel, faster]
Step 4: Community        [Guaranteed]
Step 5: Synthesis        [Guaranteed]
Step 6: Output           [Consistent format]
```

### ❓ "Can I separate social media searches in the workflow?"

**Yes!** That's exactly what the workflow does. Look at Step 3:

```typescript
.then(async (context) => {
  // Run professional and social media research in PARALLEL
  const [professional, social] = await Promise.all([
    professionalResearchStep.execute({...}),
    socialMediaResearchStep.execute({...}),
  ]);

  return { ...professional, ...social };
})
```

---

## 📊 Expected Workflow Output

```json
{
  "personaPrompt": "John Doe is a Senior Software Engineer at Google with 8 years of experience in web technologies. He's passionate about React, TypeScript, and web performance. Outside of work, John enjoys hiking, photography, and contributing to open-source projects. His communication style is technical yet approachable, and he values transparency and collaboration. When reaching out, focus on technical challenges, career growth opportunities, and work-life balance.",

  "keyInsights": [
    "Strong expertise in React and modern web frameworks",
    "Active open-source contributor (12 GitHub projects)",
    "Values work-life balance (frequent hiking posts)",
    "Engaged with web performance community",
    "Prefers direct, technical communication"
  ],

  "recommendedApproach": "Lead with technical challenges and opportunities for impact. Mention specific technologies he works with. Be direct and transparent about role expectations. Highlight work-life balance and company culture.",

  "fullProfile": {
    "professional": {
      "currentRole": "Senior Software Engineer",
      "company": "Google",
      "skills": ["React", "TypeScript", "Node.js", "GraphQL"],
      "achievements": [
        "Led migration to React 18",
        "Reduced bundle size by 40%"
      ]
    },
    "personal": {
      "interests": ["Hiking", "Photography", "Open Source"],
      "values": ["Transparency", "Collaboration", "Quality"],
      "lifestyle": "Active outdoors, values family time"
    },
    "communication": {
      "style": "Technical, direct, approachable",
      "preferredTopics": [
        "Web performance",
        "React patterns",
        "Team collaboration"
      ],
      "engagement": "Responds well to technical discussions and data-driven arguments"
    }
  }
}
```

---

## 🔑 Environment Variables Needed

Update your `.env` file:

```bash
# Existing
OPENAI_API_KEY=sk-...
BRAVE_API_KEY=BSA...

# New (optional, for Instagram)
INSTAGRAM_SESSION_ID=your_session_id_here

# Future (when you add these)
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
```

---

## 🛠 Testing in Mastra Playground

1. Start the dev server:

   ```bash
   npm run dev
   ```

2. Open Playground:

   ```
   http://localhost:4111/
   ```

3. **Test Individual Tools:**
   - Go to "Tools" tab
   - Select `instagramProfileTool`
   - Input: `{ "username": "natgeo" }`
   - Click "Execute"

4. **Test Workflow:**
   - Go to "Workflows" tab
   - Select `personaResearchWorkflow`
   - Input:
     ```json
     {
       "name": "Example Person",
       "additionalContext": "Software Engineer"
     }
     ```
   - Click "Execute"
   - Watch steps complete in real-time!

---

## 🎨 Customizing the Workflow

### Add More Parallel Steps

```typescript
.then(async (context) => {
  const [prof, social, github, reddit] = await Promise.all([
    professionalStep.execute({...}),
    socialStep.execute({...}),
    githubStep.execute({...}),    // Add this
    redditStep.execute({...}),    // Add this
  ]);

  return { ...prof, ...social, ...github, ...reddit };
})
```

### Change Step Order

```typescript
// Original: Basic → Professional → Social → Community
// Modified: Basic → Social → Community → Professional

workflow
  .then(basicDiscoveryStep)
  .then(socialMediaStep) // Moved earlier
  .then(communityStep) // Moved earlier
  .then(professionalStep) // Moved later
  .then(synthesisStep);
```

---

## 🚨 Important Notes

### Instagram Authentication

- **Session IDs expire** - if tool stops working, refresh it
- **Don't share session IDs** - treat like a password
- **Use responsibly** - don't spam requests
- **Consider dedicated account** - for research, not personal

### Rate Limits

- **Brave Search:** 1 req/sec (current setting)
- **Instagram:** No official limit, be reasonable
- **Web Scraper:** Respect robots.txt

### Privacy & Ethics

- ✅ Only research public information
- ✅ Respect privacy settings
- ✅ Don't access private content without permission
- ✅ Use for legitimate business purposes
- ❌ Don't scrape private profiles
- ❌ Don't use for harassment or stalking

---

## 📈 Next Steps

1. ✅ **Test Instagram tool** with a public profile
2. ✅ **Run workflow** on test person
3. ⬜ **Add Reddit tool** (see TODO)
4. ⬜ **Add LinkedIn scraper** (see TODO)
5. ⬜ **Integrate with your app** (API or direct)

---

## 💡 Pro Tips

### Tip 1: Batch Processing

```typescript
const people = [
  { name: "Person 1", context: "Engineer" },
  { name: "Person 2", context: "Designer" },
  { name: "Person 3", context: "Manager" },
];

for (const person of people) {
  const workflow = mastra.getWorkflow("personaResearchWorkflow");
  const run = await workflow.createRunAsync();

  const result = await run.start({
    inputData: person,
  });

  // Save result to database
  await db.personas.create(result);
}
```

### Tip 2: Error Handling

```typescript
const run = await workflow.createRunAsync();

run.on("stepError", async (error) => {
  console.error(`Step ${error.stepId} failed: ${error.message}`);

  // Optionally retry or skip
  if (error.stepId === "social-media-research") {
    console.log("Continuing without social media data...");
  }
});
```

### Tip 3: Caching Results

```typescript
// Check cache first
const cached = await db.personas.findOne({ name: "John Doe" });

if (cached && !isExpired(cached.createdAt)) {
  return cached;
}

// Otherwise, run workflow
const result = await workflow.execute({...});
await db.personas.create(result);
```

---

**Ready to start?** Head to SETUP.md for detailed Instagram setup! 🚀
