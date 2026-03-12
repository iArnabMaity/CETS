import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// 1. Import the Analytics helper
import { SpeedInsights } from "@vercel/speed-insights/next"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {/* 2. Add the component here */}
    <SpeedInsights />
  </React.StrictMode>,
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)