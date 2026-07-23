# Minimal image for the HTTP/1.1 forward proxy.
# The proxy uses only Node.js built-in modules, so no dependency install is needed.
FROM node:22-alpine

# Run as the built-in non-root user shipped with the node image.
WORKDIR /app

# Copy only the files the server actually needs at runtime.
COPY package.json proxy.js config.js ./

ENV PROXY_HOST=0.0.0.0 \
    PROXY_PORT=8080

EXPOSE 8080

USER node

CMD ["node", "proxy.js"]
