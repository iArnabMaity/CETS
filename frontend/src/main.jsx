import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"

console.log("CETS Ecosystem Loaded - Build v2.4 (Premium Refined)");
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <SpeedInsights />
    <Analytics />
  </React.StrictMode>,
)