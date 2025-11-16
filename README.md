## Run Locally

**Prerequisites:** Node.js (v16 or higher)

### Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy the example environment file:
     ```bash
     cp .env.example .env.local
     ```
   - Edit `.env.local` and set your Gemini API key:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ```

3. **Run the application:**

   **Option A: Run backend and frontend separately (recommended for development)**

   Terminal 1 - Start the backend server:
   ```bash
   npm run server
   ```

   Terminal 2 - Start the frontend:
   ```bash
   npm run dev
   ```

   **Option B: Run both together**
   ```bash
   npm run dev:all
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Security Architecture

This application uses a secure architecture to protect your API key:

- **Image Analysis**: Uses a backend proxy server that keeps the API key secure on the server side
- **Chatbot Feature**: Currently requires a client-side API key (less secure). This is disabled by default.
  - To enable the chatbot, add `VITE_GEMINI_API_KEY` to your `.env.local` file
  - ⚠️ **Warning**: This exposes your API key to the browser. Only use for development/testing.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Your Google Gemini API key (backend) |
| `PORT` | No | Backend server port (default: 3001) |
| `VITE_API_URL` | No | Backend API URL (default: http://localhost:3001) |
| `VITE_GEMINI_API_KEY` | No | Client-side API key for chatbot (not recommended for production) |

### Production Deployment

For production deployments:
1. Deploy the backend server with `GEMINI_API_KEY` set in environment variables
2. Deploy the frontend with `VITE_API_URL` pointing to your backend server
3. Do **not** set `VITE_GEMINI_API_KEY` in production (disables chatbot feature)
