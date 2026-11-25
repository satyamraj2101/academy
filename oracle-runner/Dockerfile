FROM node:22-slim
# ffmpeg encodes the lesson videos and its subtitle filter needs fontconfig; fonts for captions come from the dejavu npm package.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fontconfig && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
COPY samples ./samples
# The Kokoro voice model (~90 MB) downloads on first use; keep it across restarts with a volume at /home/node/.cache.
USER node
CMD ["node", "src/index.mjs"]
