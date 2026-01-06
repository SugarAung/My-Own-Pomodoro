# My Own Pomodoro 🍅

A calm, customizable Pomodoro timer built for **focus without pressure**.

This project is not about productivity guilt, points, or streaks.  
It’s about **showing up**, working gently, and taking breaks that actually help.

## ✨ Purpose

Most Pomodoro apps feel rigid or stressful.  
This app is designed to feel:

- Gentle  
- Non-judgmental  
- Flexible  
- Personal  

Key ideas behind this project:

- No punishment for stopping early  
- No forced rewards or points  
- Encouraging messages instead of pressure  
- Break reminders that feel human  
- Custom mode that truly belongs to the user  

You can use it:

- As a classic Pomodoro timer  
- As a soft focus companion  
- Or as a fully custom flow that fits your day  

## 🧠 Core Features

### Modes
- **Soft**: 20–5 with gentle pacing  
- **Normal**: 25–5 (classic)  
- **Hard**: 50–10 deep focus  
- Long break every 4 focus sessions (not shown to the user)

### Custom Mode
- User-defined focus & break durations  
- Optional custom long-break reminders  
- Synced across devices when logged in  

### Break Reminders
- Short breaks: small pop-up tips (water, posture, breathing)  
- Long breaks: meaningful reminders (stretch, rest, step away)  
- User-defined reminders are used **only in Custom mode**  

### Sound & Ambience
- Optional gentle sounds  
- Rain / night / white noise  
- Plays only when appropriate (focus or always)

### Keyboard Shortcuts
- **Space** → Start / Pause  
- **R** → Reset  
- **S** → Skip  
- **M** → Minimal mode  

### UI
- Minimal mode for distraction-free focus  
- Dashboard mode with full controls  

### Sync (Optional)
- Guest mode works fully  
- Sign in with email to sync Custom mode via Supabase  

## 🛠 Tech Stack

- **Frontend**: React + TypeScript  
- **Build Tool**: Vite  
- **State**: React hooks  
- **Audio**: Web Audio API  
- **Auth & Sync**: Supabase (optional)  
- **Storage**: LocalStorage (guest mode)

## 📁 Project Structure

```
web/
├── src/
│   ├── auth/          # Login & sync UI
│   ├── components/    # UI components (Toast, LongBreakPrompt)
│   ├── core/          # Timer logic, sound, keyboard, storage
│   ├── data/          # Default reminders (short tips + long break ideas)
│   ├── lib/           # Supabase client & helpers
│   ├── types/         # Shared TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig*.json
```

## 🚀 Getting Started (Local)

1. Clone the repository

   ```bash
   git clone https://github.com/SugarAung/My-Own-Pomodoro.git
   cd My-Own-Pomodoro/web
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Environment variables (optional)

   Create a file `web/.env` with:

   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   If you don't add these, the app still works fully in guest mode (sync will simply be disabled).

4. Run the app

   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173)

## 🌍 Deployment (Free)

This project works well with:

- Vercel
- Netlify
- Cloudflare Pages

Basic steps:

1. Push the repo to GitHub
2. Import the repository into your platform
3. Add environment variables (if using Supabase)
4. Deploy

No backend server required.

## 🧘 Philosophy

This app is intentionally designed to:

- Let users stop without guilt
- Encourage rest, not optimization
- Avoid addictive mechanics
- Respect human energy

If you didn't finish a session — it doesn't count, and that's okay.

## 📜 License

No license yet.  
This project is currently shared for learning and personal use.

## 🙌 Final Note

This project grew slowly, with care, testing, and intention.

If it helps even one person feel calmer while working — it has already succeeded.
