FROM denoland/deno:2.7.7
WORKDIR /app
COPY deno.json deno.lock ./
RUN deno install --frozen
COPY . .
RUN deno cache src/main.ts
CMD ["deno", "task", "start"]
