<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Project Best Practices

## Next.js v16 Best Practices

### App Router
- Use App Router for all new code (stable since Next.js 13.4)
- Components are Server Components by default - only add `'use client'` when needed
- App Router enables Server Components, layouts, streaming, and colocated data fetching

### Server Actions
- Use `'use server'` directive for server-side mutations
- Define in separate files or inline in Server Components
- Use `redirect()` from `next/navigation` for post-action navigation
- Support progressive enhancement (forms work without JS)

### Forms
- Use native `<form action={serverAction}>` pattern
- Use `useFormStatus` for pending states
- Use `useActionState` for form state management
- Bind additional arguments with `.bind(null, arg)`

### Data Fetching & Caching
- Use `next: { revalidate: seconds }` for time-based revalidation
- Use `cache: 'force-cache'` to opt into caching
- Use `cache: 'no-store'` to bypass cache
- Use React's `cache()` function for memoizing data fetching utilities
- Use `'server-only'` package to prevent client-side execution

### Streaming
- Use `<Suspense>` boundaries for progressive loading
- Leverage streaming server-rendering for faster TTFB

---

## Mastra v1 Beta Best Practices

### Requirements
- Node.js 22.13.0 or higher required
- Install all packages with `@beta` tag: `@mastra/core@beta`, `mastra@beta`, etc.
- Supports Zod v4: `npm install zod@^4`

### Agent Configuration
```typescript
import { Agent } from "@mastra/core/agent";

export const myAgent = new Agent({
  id: "my-agent",
  name: "My Agent",
  instructions: "You are a helpful assistant.",
  model: "openai/gpt-4.1",  // Format: provider/model
  tools: { myTool },
  memory: new Memory({...}),
});
```

### Instructions Formats
- String: `instructions: "You are a helpful assistant."`
- Array: `instructions: ["Line 1", "Line 2"]`
- System message with provider options for caching/reasoning

### Tools (V1 Signature)
```typescript
import { createTool } from "@mastra/core/tools";

export const myTool = createTool({
  id: "my-tool",
  description: "Tool description",
  inputSchema: z.object({ ... }),
  outputSchema: z.object({ ... }),
  execute: async (inputData, context) => {
    // inputData and context are separate parameters in V1
    return { ... };
  },
});
```

### Memory
```typescript
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";

// Configure storage on Mastra instance
export const mastra = new Mastra({
  storage: new LibSQLStore({
    id: 'mastra-storage',
    url: ":memory:",
  }),
});

// Use memory in agent calls
await agent.generate("Hello", {
  memory: {
    resource: "user-123",
    thread: "conversation-1",
  },
});
```

### Workflows
```typescript
import { createWorkflow, createStep } from "@mastra/core/workflows";

const step1 = createStep({
  id: "step-1",
  inputSchema: z.object({ ... }),
  outputSchema: z.object({ ... }),
  execute: async ({ inputData }) => ({ ... }),
});

export const myWorkflow = createWorkflow({
  id: "my-workflow",
  inputSchema: z.object({ ... }),
  outputSchema: z.object({ ... }),
})
  .then(step1)
  .commit();
```

### Workflow Control Flow
- Sequential: `.then(step1).then(step2)`
- Parallel: `.parallel([step1, step2])`
- Branching: `.branch([[condition, step], ...])`
- Data mapping: `.map(async ({ inputData }) => ({ ... }))`
- Loops: `.dountil()`, `.dowhile()`, `.foreach()`

### RequestContext (renamed from RuntimeContext)
```typescript
model: ({ requestContext }) => {
  const tier = requestContext.get("user-tier");
  return tier === "enterprise" ? "openai/gpt-4.1" : "openai/gpt-4.1-nano";
}
```

### Structured Output
```typescript
const response = await agent.generate("...", {
  structuredOutput: {
    schema: z.object({ ... }),
  },
});
console.log(response.object);
```

### Processors (Guardrails)
```typescript
import { ModerationProcessor, PIIDetector } from "@mastra/core/processors";

export const secureAgent = new Agent({
  inputProcessors: [new ModerationProcessor({ ... })],
  outputProcessors: [new PIIDetector({ ... })],
});
```

### Voice
```typescript
import { OpenAIVoice } from "@mastra/voice-openai";

export const voiceAgent = new Agent({
  voice: new OpenAIVoice(),
});

await agent.voice.speak("Hello!");
await agent.voice.listen(audioStream);
```

### Agent Networks
```typescript
export const routingAgent = new Agent({
  agents: { agent1, agent2 },
  workflows: { workflow1 },
  tools: { tool1 },
  memory: new Memory({...}), // Required
});

await routingAgent.network("Complex task");
```

---

## Key V1 Migration Changes

1. **Tool signatures**: `execute: async (inputData, context)` (separated parameters)
2. **Imports**: Use subpath imports from `@mastra/core`
3. **Pagination**: `page/perPage` instead of `offset/limit`
4. **RuntimeContext** renamed to **RequestContext**
5. **Observability**: New `@mastra/observability` package
6. **Storage methods**: `get*` renamed to `list*` pattern
7. **Voice packages**: `@mastra/speech-*` renamed to `@mastra/voice-*`