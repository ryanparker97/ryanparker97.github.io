# The image `pnpm ci:local` runs CI's gates in: Playwright's Ubuntu 24.04 (noble) image, the same OS and
# browser fonts as CI's e2e runner, plus the Node and pnpm versions the repo pins.
# scripts/ci-local.ts builds it with an empty build context and `-f scripts/ci-local.Dockerfile`, and names it by these versions and this file.
ARG PW_VERSION
ARG NODE_MAJOR
ARG PNPM_VERSION

FROM node:${NODE_MAJOR}-bookworm-slim AS node

FROM mcr.microsoft.com/playwright:v${PW_VERSION}-noble
ARG PNPM_VERSION
# The base ships its own Node; replace it with the major from .nvmrc.
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
 && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
 && npm install -g pnpm@${PNPM_VERSION}
# No extra fonts on purpose: what the image ships is what `playwright install --with-deps` gives the runner.
