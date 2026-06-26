# Sandbox for the skills-next evals.
#
# The agent runs entirely inside this container, so it cannot reach the host repo
# or secrets — only what we bake in: the BUILT skill tree, the eval (spec, tasks,
# fixtures), and the runner. The build context is a minimal staging dir assembled
# by run-docker.sh (skills/, eval/, run.sh, container-entry.sh) — NOT the repo.
FROM node:22-bookworm-slim

# python3: waza's `code` grader runtime. rsync/curl: the runner + waza install.
# git: handy for any skill that shells out.
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash curl ca-certificates rsync python3 git \
    && rm -rf /var/lib/apt/lists/*

# Install the linux waza binary (bundles the Copilot CLI; extracted on first use).
RUN curl -fsSL https://raw.githubusercontent.com/microsoft/waza/main/install.sh | bash
ENV PATH="/root/bin:/usr/local/bin:${PATH}"

WORKDIR /app
COPY skills/ /app/skills/
COPY eval/ /app/eval/
COPY run.sh container-entry.sh /app/
RUN chmod +x /app/run.sh /app/container-entry.sh

ENTRYPOINT ["/app/container-entry.sh"]
