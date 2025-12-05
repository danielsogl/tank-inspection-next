## 1. Create Vehicle-Specific Agent

- [x] 1.1 Create `src/mastra/agents/tank-agent.ts` with Leopard2 tank-specific system prompt
- [x] 1.2 Define tank inspection domain knowledge in the system prompt (components, maintenance, specifications)

## 2. Create General Inspection Agent

- [x] 2.1 Create `src/mastra/agents/inspection-agent.ts` as the main routing agent
- [x] 2.2 Configure system prompt to handle general queries and delegate vehicle-specific questions
- [x] 2.3 Register the tank agent as a sub-agent using the `agents` property

## 3. Update Mastra Configuration

- [x] 3.1 Update `src/mastra/index.ts` to register the new agents
- [x] 3.2 Remove weather agent, weather tool, and weather workflow from registration

## 4. Create Inspection API Route

- [x] 4.1 Create `src/app/api/inspection/route.ts` with POST handler for the inspection agent
- [x] 4.2 Configure memory with thread ID `inspection-chat` and resource ID
- [x] 4.3 Implement GET endpoint to retrieve conversation history

## 5. Update Chat Panel Component

- [x] 5.1 Update `src/components/inspector/chat-panel.tsx` to use `/api/inspection` endpoint

## 6. Cleanup Old Demo Code

- [x] 6.1 Remove `src/app/chat/page.tsx` (demo page)
- [x] 6.2 Remove `src/app/api/chat/route.ts` (old route)
- [x] 6.3 Remove `src/mastra/agents/weather-agent.ts`
- [x] 6.4 Remove `src/mastra/tools/weather-tool.ts`
- [x] 6.5 Remove `src/mastra/workflows/weather-workflow.ts`

## 7. Testing and Validation

- [x] 7.1 Test general queries are handled by the inspection agent
- [x] 7.2 Test vehicle-specific queries are delegated to the tank agent
- [x] 7.3 Verify chat history persists correctly with memory
- [x] 7.4 Verify chat-panel.tsx works correctly with the new `/api/inspection` endpoint
