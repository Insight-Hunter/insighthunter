# BizForma Pack 6

Pack 6 introduces the shared platform hardening layer for BizForma.

## Included
- Modular Hono Worker routes
- Session and business route modules
- Workers AI calls for business name suggestions
- Workers AI calls for entity recommendations
- D1-backed document metadata model
- Browser Rendering PDF generation
- R2 storage for generated PDFs

## Main files
- `src/worker.ts`
- `api/ai/nameSuggestions.ts`
- `api/ai/entityRecommendation.ts`
- `api/documents.ts`
- `services/aiAdvisorService.ts`
- `services/documentService.ts`
- `services/pdfService.ts`
- `db/migrations/0007_pack6_documents_ai.sql`
