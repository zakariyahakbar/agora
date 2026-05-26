# AGORA — The Autonomous Compute Economy

Built at OpenClaw Hackathon · Toronto Tech Week · May 2026

## Setup

```bash
npm install
npm run dev
```

## Video Background

Drop a cinematic dark video into `/public/bg-agora.mp4`

Free options (dark, cinematic, no attribution needed):
- https://mixkit.co/free-stock-video/dark-city-aerial (search "dark city night")
- https://www.pexels.com/search/videos/city%20night%20aerial/
- Any dark abstract/city/tech video works

## Deploy to Vercel

```bash
npx vercel
```

Or push to GitHub and import to vercel.com — it auto-detects Next.js.

## Stack

- Next.js 15
- Framer Motion
- DM Sans + Cormorant Garamond + DM Mono
- GOAT Network (ERC-8004 + x402)

## Design

Adapted from Trim.ai design system — same cinematic architecture:
- Fixed video background
- Scroll-snap sections (lock scroll, one section at a time)
- Glass morphism cards with backdrop-filter
- Film grain overlay
- Pill nav with live status
- Red dot nav indicators
