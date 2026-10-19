# 🎯 Real-Time Object Detector

A browser-based real-time object detection app powered by TensorFlow.js — no server required.

**[Live Demo →](https://daggerlee.github.io/tfjs-detector/)**

## Demo

### Single Model Mode
![Main Demo](public/demo-main.gif)

### Model Comparison Mode
![Compare Demo](public/demo-compare.gif)

## Features
- 📷 Multi-camera support — switch between available cameras in real time
- 🧠 Multi-model comparison — COCO-SSD (object detection) vs BlazeFace (face detection)
- ⚡ Split-screen benchmark — run both models simultaneously, compare latency side by side
- 📈 Real-time latency chart — live inference time history across last 30 frames
- 🎚️ Adjustable confidence threshold — filter detections dynamically
- 🟩 Bounding box + facial landmark overlay — live annotations on canvas

## Tech Stack
- **Frontend**: Vue 3, Vue Router
- **ML**: TensorFlow.js, COCO-SSD, BlazeFace
- **Visualization**: Chart.js
- **Deployment**: GitHub Pages

## Performance
- COCO-SSD: ~27 ms/frame inference (object detection)
- BlazeFace: ~33 ms/frame inference (face detection)
- Zero server dependency — all inference runs client-side in the browser

## Run Locally
```bash
npm install
npm run dev
```
Open http://localhost:5173
