# Preflight MCP server.
#
# Why the Playwright base image: the scanner drives a real browser, so the
# container must ship one. `mcr.microsoft.com/playwright` includes Chromium plus
# every system library it needs, which is the part people get wrong when they
# start from `node:22-slim`.
#
# Pinned, not floating: a base that moves under us is a scanner whose
# measurements change for reasons unrelated to the pages it tests.
FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /app

# Dependencies first, so a source change does not invalidate the install layer.
COPY package.json package-lock.json ./
# --ignore-scripts: the postinstall of some deps tries to fetch browsers we
# already have, and running package scripts as root in a build is a habit that
# eventually bites.
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY action.yml ./

# Chromium from the image, not a system Chrome: `channel: 'chrome'` is the local
# default because a developer has one, and it does not exist here.
ENV PREFLIGHT_CHANNEL=chromium
ENV NODE_ENV=production
ENV PORT=8080
# One process, four concurrent scans. See the cap in src/lib/scan.ts.
ENV PREFLIGHT_MAX_CONCURRENT=4

# Non-root. The Playwright image creates `pwuser` for exactly this; running
# Chromium as root is the failure mode that makes people reach for
# --no-sandbox, and it should be avoided rather than papered over.
RUN mkdir -p /app/data && chown -R pwuser:pwuser /app
USER pwuser

EXPOSE 8080

# Health, not liveness: if the process is up but /health does not answer, the
# orchestrator should restart it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# tsx runs the TypeScript directly, same as the CLI: one implementation, no
# compiled copy that drifts from the source the tests exercise.
CMD ["npx", "tsx", "src/lib/mcp-cli.ts", "--http"]
