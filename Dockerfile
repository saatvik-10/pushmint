FROM oven/bun:1.4.2

WORKDIR /app

COPY uploadService/package.json uploadService/bun.lock ./uploadService/
RUN cd uploadService && bun install --frozen-lockfile

COPY deployService/package.json deployService/bun.lock ./deployService/
RUN cd deployService && bun install --frozen-lockfile

COPY reqHandler/package.json reqHandler/bun.lock ./reqHandler/
RUN cd reqHandler && bun install --frozen-lockfile

COPY uploadService ./uploadService
COPY deployService ./deployService
COPY reqHandler ./reqHandler

RUN cd deployService && bun run build \
    && cd ../reqHandler && bun run build \
    && cd ../uploadService && bun run build

WORKDIR /app/uploadService
EXPOSE 3000
CMD ["bun", "run", "start"]
