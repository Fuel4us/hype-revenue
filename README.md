# 🌊 Hyperliquid Revenue Dashboard

A real-time charting dashboard for tracking [Hyperliquid](https://hyperliquid.xyz)'s Annualized Protocol Revenue across multiple timeframes.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-F38020?style=flat&logo=Cloudflare&logoColor=white)

## 🚀 Live Demo

**[https://hype.kindachill.xyz](https://hype.kindachill.xyz)**

## ✨ Features

- **Multi-Timeframe Analysis:** Calculates and visualizes 7, 14, 30, 60, 90, 180, and 360-day moving averages of annualized revenue.
- **Interactive Chart:** Built with Recharts for responsive, hoverable data exploration.
- **Custom UI Controls:** Toggle up to 4 timeframes simultaneously to compare trends without clutter.
- **Sleek Dark Mode:** Aqua & Aquamarine palette designed for modern crypto dashboards.
- **Real-Time Data:** Fetches directly from the Hyperliquid Info API.

## 🛠 Tech Stack

- **Frontend:** React (Vite)
- **Styling:** Tailwind CSS
- **Charting:** Recharts
- **Deployment:** Cloudflare Pages (`wrangler`)

## 📦 Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Fuel4us/hype-revenue.git
    cd hype-revenue
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run locally:**
    ```bash
    npm run dev
    ```

## ☁️ Deployment

This project is configured for Cloudflare Pages.

1.  **Login to Cloudflare:**
    ```bash
    npx wrangler login
    ```

2.  **Deploy:**
    ```bash
    npm run build
    npx wrangler pages deploy dist --project-name=hype-revenue
    ```

## 🔒 Security Note

Originally deployed with strict IP-whitelist access via Cloudflare WAF, now open to the public. The codebase itself is entirely frontend-focused and safe for public hosting.

---

*Built with 🦎 by [OpenClaw](https://github.com/openclaw/openclaw)*
