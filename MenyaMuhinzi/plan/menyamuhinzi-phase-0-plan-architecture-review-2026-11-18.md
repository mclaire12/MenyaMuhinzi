# MenyaMuhinzi — Phase 0 plan (architecture review)

The brief asks to start with Phase 0 and wait for your review before building. This is that review.

## Technology: what the brief asks vs. what runs here

| Brief asks for | What we will use | Why |
|---|---|---|
| React / Next.js, TypeScript, Tailwind, React Hook Form, Zod, TanStack Query | TanStack Start (React 19 + TypeScript), Tailwind v4, React Hook Form, Zod, TanStack Query | Matches the brief directly |
| NestJS REST API + Swagger | TanStack server functions + REST routes under `/api/public/*` (USSD/IVR webhooks), with typed Zod contracts | NestJS cannot run on this platform; same separation and validation |
| PostgreSQL + pgvector + migrations | Lovable Cloud (managed PostgreSQL with pgvector, migrations, row-level security) | Matches the brief |
| Auth + RBAC | Lovable Cloud auth (phone/email sign-in) + separate `user_roles` table with 4 roles | Secure roles, no privilege escalation |
| S3 storage | Lovable Cloud file storage (buckets for images, audio, video, documents) | S3-compatible |
| Python FastAPI AI service (LLM, RAG, TTS, ASR, translation) | Lovable AI (built-in, no API keys) called from server functions; RAG over pgvector | Python services cannot run here |
| Redis + BullMQ jobs | Database job table processed by server functions | No Redis on this platform |
| Docker, Nginx | Not needed — hosting is managed | |
| USSD / IVR provider | Webhook routes ready for Africa's Talking (or MTN/Airtel), plus a built-in USSD & IVR simulator | Real provider needs your account later |

## Modules
Public site · Auth & profiles · Course catalogue (Tomato, Cabbage, Carrot) · Lesson player (Soma / Reba / Umva) · Progress & resume · Assessments · AI Learning Assistant (RAG, Kinyarwanda) · Facilitator studio (AI course drafting, review/approval, groups, reports) · Admin (users, knowledge hub, glossary, AI settings, USSD/IVR, analytics, audit log) · USSD/IVR channel.

## Roles
| Capability | Farmer | Facilitator | Admin |
|---|---|---|---|
| Learn, enroll, take quizzes, ask AI | yes | yes | yes |
| Draft / edit courses with AI | – | yes | yes |
| Approve & publish | – | agronomist reviewer | yes |
| Manage groups & see farmer reports | – | own groups | all |
| Users, knowledge hub, AI, telecom, audit | – | – | yes |
Basic-phone farmers are normal farmer records identified by phone number.

## Core data (first migration)
profiles, user_roles, vegetables, courses, course_modules, lessons, lesson_media, enrollments, lesson_progress, learning_activity (channel: web/ussd/ivr), assessments, questions, options, attempts, knowledge_documents, document_chunks (vector), glossary_terms, content_reviews, ai_conversations, ai_messages, farmer_groups, group_members, ussd_sessions, ivr_calls, audit_logs. Seeded with the 3 courses in Kinyarwanda.

## Build order (each phase reviewed with you)
1. Design system + public site + sign-in + 3 dashboards layouts
2. Database, roles, courses, lessons, progress, quizzes
3. Farmer learning experience end-to-end
4. AI assistant + knowledge hub (RAG)
5. Facilitator studio + admin tools
6. USSD/IVR webhooks + simulator
7. Tests, PROJECT_STATUS.md, docs

## Risks / outside dependencies
- Kinyarwanda quality of AI text and speech needs agronomist review.
- USSD short code and IVR number need a telecom provider account (Africa's Talking or similar) — you supply it at Phase 6.
- Phone OTP by SMS needs an SMS provider; until then sign-in uses phone + password.
