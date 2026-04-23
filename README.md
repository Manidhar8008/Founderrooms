# FounderRooms 🚀

**Frictionless Voice & Knowledge Rooms for Founders.**

FounderRooms is a high-signal, drop-in audio space designed for technical and non-technical founders, solopreneurs, and digital transformation leaders. It bridges the gap between fleeting ad-hoc audio rooms and compounding community knowledge through an autonomous AI-driven transcription and execution layer.

## Core Features
* **Zero-Friction Audio:** Drop-in WebRTC voice rooms powered by Agora. No scheduling, no links—just click and talk.
* **Live AI Transcriber:** Native browser-based continuous speech-to-text integration captures high-level technical discussions in real-time.
* **The Execution Engine:** Convert room transcripts into actionable, highly formatted "Founder Execution Roadmaps" using the `/ai finalize` command.
* **Premium Aesthetic:** A futuristic, minimalist UI built with glass-morphism, deep navy gradients, and high-impact neon cyan accents.

## Tech Stack
* **Frontend:** React (Vite), Tailwind CSS, Shadcn UI
* **Backend & Auth:** Firebase (Authentication & Firestore Real-time Database)
* **Real-time Audio:** Agora WebRTC SDK
* **Hosting:** Vercel CI/CD Pipeline

## Local Setup
1. Clone the repository: `git clone https://github.com/yourusername/founderrooms.git`
2. Install dependencies: `npm install`
3. Create a `.env.local` file in the root directory and add your keys:
   ```env
   VITE_AGORA_APP_ID=your_agora_key
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
