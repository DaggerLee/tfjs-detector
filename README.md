# 🎯 Real-Time Object Detector

A browser-based real-time object detection app powered by TensorFlow.js — no server required.

**[Live Demo →](https://daggerlee.github.io/tfjs-detector/)**

## Features
- 📷 Multi-camera support — switch between available cameras in real time
- 🧠 Multi-model comparison — toggle between COCO-SSD and MobileNet
- 🎚️ Adjustable confidence threshold — filter detections by confidence level
- ⚡ Real-time performance stats — FPS counter and per-frame inference time (ms)
- 🟩 Bounding box overlay — live annotations drawn on canvas

## Tech Stack
- **Frontend**: Vue 3, Vue Router
- **ML**: TensorFlow.js, COCO-SSD, MobileNet
- **Deployment**: GitHub Pages

## Performance
- ~45 ms/frame inference on modern laptops (COCO-SSD)
- Zero server dependency — all inference runs client-side in the browser

## Run Locally
```bash
npm install
npm run dev
```
Open http://localhost:5173

## Background
This project extends my work at Google Maps, where I ported a server-side R-CNN 
road sign detection pipeline to TensorFlow.js for a mobile web feature. This demo 
applies the same client-side inference approach to real-time multi-model object detection.