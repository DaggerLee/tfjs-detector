<template>
  <div class="app">
    <header>
      <h1>🎯 Real-Time Object Detector</h1>
      <span class="subtitle">Powered by TensorFlow.js</span>
      <RouterLink to="/compare" class="compare-btn">⚡ Compare Models</RouterLink>
    </header>

    <main>
      <!-- 控制面板 -->
      <div class="controls card">
        <div class="control-group">
          <label>📷 Camera</label>
          <select v-model="selectedDeviceId" @change="restart">
            <option v-for="d in devices" :key="d.deviceId" :value="d.deviceId">
              {{ d.label || 'Camera ' + (devices.indexOf(d) + 1) }}
            </option>
          </select>
        </div>

        <div class="control-group">
          <label>🧠 Model</label>
          <select v-model="currentModel" @change="onModelChange">
            <option v-for="(v, k) in MODELS" :key="k" :value="k">{{ v.label }}</option>
          </select>
        </div>

        <div class="control-group">
          <label>🎚️ Confidence: {{ Math.round(confidence * 100) }}%</label>
          <input type="range" min="0.1" max="0.99" step="0.01" v-model.number="confidence" />
        </div>
      </div>

      <!-- 状态提示 -->
      <div v-if="isLoading" class="status loading">⏳ Loading model, please wait...</div>
      <div v-if="loadError" class="status error">❌ {{ loadError }}</div>
      <div v-if="cameraError" class="status error">❌ {{ cameraError }}</div>

      <!-- 视频 + Canvas 叠加层 -->
      <div class="video-container card">
        <video ref="videoEl" class="video" autoplay muted playsinline />
        <canvas ref="canvasEl" class="canvas" />
        <div class="stats-overlay">
          <span>⚡ {{ fps }} FPS</span>
          <span>🔍 {{ detections.length }} objects</span>
          <span>⏱️ {{ inferenceTime }}ms</span>
        </div>
      </div>

      <!-- 延迟折线图 -->
      <LatencyChart
        ref="chartRef"
        title="Inference Latency (ms) — last 30 frames"
        :series="[{ label: currentModel, color: '#00ff88' }]"
      />

      <!-- 检测结果列表 -->
      <div class="results card" v-if="detections.length > 0">
        <h3>Detected Objects</h3>
        <div class="result-item" v-for="(d, i) in detections" :key="i">
          <span class="label">{{ d.label }}</span>
          <div class="confidence-bar">
            <div class="bar-fill" :style="{ width: (d.score * 100) + '%' }"></div>
          </div>
          <span class="score">{{ Math.round(d.score * 100) }}%</span>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCamera } from '../composables/useCamera'
import { useDetector, MODELS } from '../composables/useDetector'
import LatencyChart from '../components/LatencyChart.vue'

const { devices, selectedDeviceId, error: cameraError, getCameras, startCamera, stopCamera } = useCamera()
const { isLoading, loadError, loadModel, detect } = useDetector()

const videoEl = ref(null)
const canvasEl = ref(null)
const chartRef = ref(null)
const currentModel = ref('COCO-SSD')
const confidence = ref(0.5)
const detections = ref([])
const fps = ref(0)
const inferenceTime = ref(0)

let animFrame = null
let lastTime = 0
let frameCount = 0

async function restart() {
  await startCamera(videoEl.value)
}

async function onModelChange() {
  await loadModel(currentModel.value)
}

function drawBoxes(preds) {
  const canvas = canvasEl.value
  const video = videoEl.value
  if (!canvas || !video) return
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  preds.forEach(p => {
    if (p.bbox) {
      const [x, y, w, h] = p.bbox
      ctx.strokeStyle = '#00ff88'
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, w, h)
      ctx.fillStyle = '#00ff88'
      ctx.font = 'bold 16px Arial'
      const text = `${p.label} ${Math.round(p.score * 100)}%`
      ctx.fillRect(x, y - 24, ctx.measureText(text).width + 10, 24)
      ctx.fillStyle = '#000'
      ctx.fillText(text, x + 4, y - 6)
    }

    // BlazeFace 面部关键点
    if (p.landmarks) {
      p.landmarks.forEach(([lx, ly]) => {
        ctx.beginPath()
        ctx.arc(lx, ly, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#ff6b6b'
        ctx.fill()
      })
    }
  })
}

async function loop(timestamp) {
  frameCount++
  if (timestamp - lastTime >= 1000) {
    fps.value = frameCount
    frameCount = 0
    lastTime = timestamp
  }

  if (videoEl.value && videoEl.value.readyState === 4) {
    const t0 = performance.now()
    const preds = await detect(videoEl.value, confidence.value)
    const ms = Math.round(performance.now() - t0)
    inferenceTime.value = ms
    detections.value = preds
    drawBoxes(preds)
    chartRef.value?.addPoints([ms])
  }

  animFrame = requestAnimationFrame(loop)
}

onMounted(async () => {
  await getCameras()
  await startCamera(videoEl.value)
  await loadModel(currentModel.value)
  animFrame = requestAnimationFrame(loop)
})

onUnmounted(() => {
  stopCamera()
  if (animFrame) cancelAnimationFrame(animFrame)
})
</script>

<style scoped>
.app { min-height: 100vh; background: #0f0f0f; color: #eee; font-family: 'Segoe UI', sans-serif; }
header { padding: 20px 40px; border-bottom: 1px solid #222; display: flex; align-items: center; gap: 16px; }
header h1 { font-size: 22px; margin: 0; }
.subtitle { color: #888; font-size: 14px; flex: 1; }
.compare-btn { padding: 8px 16px; border-radius: 20px; border: 1px solid #00ff88; color: #00ff88; text-decoration: none; font-size: 13px; transition: background 0.2s; }
.compare-btn:hover { background: #00ff8822; }
main { max-width: 900px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.card { background: #1a1a1a; border-radius: 12px; padding: 20px; border: 1px solid #2a2a2a; }
.controls { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-end; }
.control-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 160px; }
.control-group label { font-size: 13px; color: #aaa; }
.control-group select, .control-group input[type=range] { padding: 8px; border-radius: 6px; border: 1px solid #333; background: #111; color: #eee; font-size: 14px; }
.status { padding: 12px 16px; border-radius: 8px; font-size: 14px; }
.loading { background: #1a2a1a; color: #4caf50; }
.error { background: #2a1a1a; color: #f44336; }
.video-container { position: relative; overflow: hidden; padding: 0; aspect-ratio: 16/9; background: #000; }
.video { width: 100%; height: 100%; object-fit: cover; display: block; }
.canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.stats-overlay { position: absolute; top: 12px; right: 12px; display: flex; gap: 10px; }
.stats-overlay span { background: rgba(0,0,0,0.7); padding: 4px 10px; border-radius: 20px; font-size: 13px; color: #0f0; }
.results h3 { margin: 0 0 12px; font-size: 15px; color: #aaa; }
.result-item { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.label { min-width: 120px; font-size: 14px; }
.confidence-bar { flex: 1; height: 8px; background: #333; border-radius: 4px; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #00ff88, #00bcd4); border-radius: 4px; transition: width 0.2s; }
.score { min-width: 40px; text-align: right; font-size: 14px; color: #0f0; }
</style>
