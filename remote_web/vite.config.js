import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudApiPlugin } from './server/cloudPlugin.js'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
    // Legacy local keys are read on the server only during migration.
    env.GEMINI_API_KEY ||= env.VITE_GEMINI_API_KEY;
    env.WEATHER_API_KEY ||= env.VITE_WEATHER_API_KEY;
    return {
        plugins: [react(), cloudApiPlugin(env)],
        server: { watch: { ignored: ['**/firmware/**', '**/.docx_work/**'] } },
    };
})
