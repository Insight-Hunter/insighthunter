git add . 
git commit -m "agents deploy "
git push 

export CLOUDFLARE_ACCOUNT_ID="18c8e61a3669253dcfd0c7eec6be36a3"
export CLOUDFLARE_API_TOKEN="kAY9u88TaeuI9wByQkismZ2oGjBWqf5mVBhDTYNE"

# pnpm install apps/insighthunter-agents 

npx pnpm --filter @insighthunter/agents dev

npx pnpm --filter @insighthunter/agents deploy
# npx wrangler / create insighthunter-embeddings --dimensions=768 --metric=cosine
# npx wrangler vectorize create insighthunter-embeddings-staging --dimensions=768 --metric=cosine

# npx wrangler secret put OPENAI_API_KEY   # optional fallback
# npx wrangler deploy
