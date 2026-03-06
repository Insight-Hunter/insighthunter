#!/bin/bash
ROOT="apps/insighthunter-auth"

mkdir -p $ROOT/src/{routes,middleware,services,db/migrations,lib,types}
mkdir -p $ROOT/tests/{routes,services,fixtures}

# src
echo "." > $ROOT/src/index.ts

# routes
echo "." > $ROOT/src/routes/login.ts
echo "." > $ROOT/src/routes/register.ts
echo "." > $ROOT/src/routes/logout.ts
echo "." > $ROOT/src/routes/refresh.ts
echo "." > $ROOT/src/routes/verify.ts
echo "." > $ROOT/src/routes/roles.ts

# middleware
echo "." > $ROOT/src/middleware/cors.ts
echo "." > $ROOT/src/middleware/rateLimit.ts
echo "." > $ROOT/src/middleware/validate.ts

# services
echo "." > $ROOT/src/services/authService.ts
echo "." > $ROOT/src/services/tokenService.ts
echo "." > $ROOT/src/services/sessionService.ts
echo "." > $ROOT/src/services/roleService.ts
echo "." > $ROOT/src/services/emailService.ts

# db
echo "." > $ROOT/src/db/schema.sql
echo "." > $ROOT/src/db/migrations/0001_init.sql
echo "." > $ROOT/src/db/migrations/0002_sessions.sql
echo "." > $ROOT/src/db/migrations/0003_roles.sql
echo "." > $ROOT/src/db/queries.ts

# lib
echo "." > $ROOT/src/lib/jwt.ts
echo "." > $ROOT/src/lib/hash.ts
echo "." > $ROOT/src/lib/cache.ts
echo "." > $ROOT/src/lib/analytics.ts
echo "." > $ROOT/src/lib/logger.ts

# types
echo "." > $ROOT/src/types/env.ts
echo "." > $ROOT/src/types/auth.ts
echo "." > $ROOT/src/types/index.ts

# tests
echo "." > $ROOT/tests/routes/login.test.ts
echo "." > $ROOT/tests/routes/register.test.ts
echo "." > $ROOT/tests/services/tokenService.test.ts
echo "." > $ROOT/tests/fixtures/mockUser.ts

# config
echo "." > $ROOT/wrangler.jsonc
echo "." > $ROOT/package.json
echo "." > $ROOT/tsconfig.json
echo "." > $ROOT/README.md

echo "✅ insighthunter-auth scaffolded"
