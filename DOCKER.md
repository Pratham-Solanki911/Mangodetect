# Docker Deployment Guide for Mango Guard

This guide will help you build and deploy the Mango Guard application using Docker.

## Prerequisites

- Docker installed on your system ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose (usually comes with Docker Desktop)
- A valid Gemini API key ([Get API Key](https://aistudio.google.com/app/apikey))

## Quick Start with Docker Compose

The easiest way to run the application is using Docker Compose:

### 1. Set up environment variables

Create a `.env` file in the project root with your API key:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

### 2. Build and run the container

```bash
docker-compose up -d
```

This will:
- Build the Docker image
- Start the container in detached mode
- Expose the application on port 3001

### 3. Access the application

Open your browser and navigate to:
```
http://localhost:3001
```

### 4. View logs

```bash
docker-compose logs -f
```

### 5. Stop the container

```bash
docker-compose down
```

## Manual Docker Commands

If you prefer to use Docker directly without Docker Compose:

### Build the image

```bash
docker build -t mango-guard:latest .
```

### Run the container

```bash
docker run -d \
  --name mango-guard-app \
  -p 3001:3001 \
  -e GEMINI_API_KEY=your_api_key_here \
  --restart unless-stopped \
  mango-guard:latest
```

### View logs

```bash
docker logs -f mango-guard-app
```

### Stop and remove the container

```bash
docker stop mango-guard-app
docker rm mango-guard-app
```

## Docker Image Details

### Multi-stage Build

The Dockerfile uses a multi-stage build approach:

1. **Stage 1 (frontend-builder)**: Builds the React frontend using Vite
2. **Stage 2 (production)**: Creates a minimal production image with:
   - Node.js 20 Alpine (lightweight)
   - Production dependencies only
   - Built frontend files
   - Express backend server

### Image Size

The final image is optimized for size (~150-200MB) using:
- Alpine Linux base image
- Multi-stage builds to exclude build tools
- Production-only dependencies

### Security Features

- Non-root user (nodejs:nodejs)
- Minimal attack surface (Alpine base)
- Health checks configured
- No unnecessary packages

## Health Check

The container includes a built-in health check that runs every 30 seconds:

```bash
# Check container health status
docker ps

# Manually test health endpoint
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | Yes | - | Your Google Gemini API key |
| `PORT` | No | 3001 | Port the server listens on |
| `NODE_ENV` | No | production | Node environment |

## Troubleshooting

### Container fails to start

1. Check if the API key is set correctly:
   ```bash
   docker logs mango-guard-app
   ```

2. Verify the `.env` file exists and contains the API key

3. Check if port 3001 is already in use:
   ```bash
   lsof -i :3001  # On Linux/Mac
   netstat -ano | findstr :3001  # On Windows
   ```

### Cannot access the application

1. Verify the container is running:
   ```bash
   docker ps
   ```

2. Check container logs for errors:
   ```bash
   docker logs mango-guard-app
   ```

3. Test the health endpoint:
   ```bash
   curl http://localhost:3001/health
   ```

### Out of memory errors

Increase Docker memory limits in Docker Desktop settings or using compose resource limits.

## Production Deployment

### Using Docker Hub

1. Tag your image:
   ```bash
   docker tag mango-guard:latest yourusername/mango-guard:v1.0.0
   ```

2. Push to Docker Hub:
   ```bash
   docker push yourusername/mango-guard:v1.0.0
   ```

3. Pull and run on production server:
   ```bash
   docker pull yourusername/mango-guard:v1.0.0
   docker run -d -p 3001:3001 -e GEMINI_API_KEY=xxx yourusername/mango-guard:v1.0.0
   ```

### Using a reverse proxy (Nginx)

For production, it's recommended to use a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Security Considerations

**Important**: The chatbot feature requires `VITE_GEMINI_API_KEY` to be exposed to the client browser. For production:

1. **Option 1**: Disable the chatbot by not setting `VITE_GEMINI_API_KEY`
2. **Option 2**: Implement proper API key rotation and monitoring
3. **Option 3**: Use a separate backend proxy for chatbot functionality

The image analysis feature is secure as it uses the backend server API key.

## Advanced Usage

### Custom build arguments

```bash
docker build \
  --build-arg NODE_VERSION=20 \
  -t mango-guard:custom \
  .
```

### Volume mounting for logs

```bash
docker run -d \
  -p 3001:3001 \
  -e GEMINI_API_KEY=xxx \
  -v $(pwd)/logs:/app/logs \
  mango-guard:latest
```

### Running in development mode

For development, it's better to use the local setup:

```bash
npm run dev
```

Docker is primarily for production deployments.

## Support

For issues or questions:
- Check the [main README](./README.md)
- Open an issue on GitHub
- Review Docker logs for error messages
