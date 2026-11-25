FROM node:22-slim
# ffmpeg encodes the lesson videos and its subtitle filter needs fontconfig; the Inter fonts it draws with ship in assets/fonts.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fontconfig && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
# The voice engine would try to download GPU files (not used here, and they 404 on some platforms).
RUN npm install --omit=dev --onnxruntime-node-install-cuda=skip
COPY src ./src
COPY samples ./samples
COPY assets ./assets
# The Kokoro voice model (~90 MB) downloads on first use; keep it across restarts with a volume at /home/node/.cache.
USER node
CMD ["node", "src/index.mjs"]
