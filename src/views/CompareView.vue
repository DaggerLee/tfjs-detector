<template>
  <div class="app">
    <header>
      <RouterLink to="/" class="back-btn">← Back</RouterLink>
      <h1>⚡ Model Comparison</h1>
      <span class="subtitle">COCO-SSD vs BlazeFace — real-time latency benchmark</span>
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
          <label>🎚️ Confidence: {{ Math.round(confidence * 100) }}%</label>
          <input type="range" min="0.1" max="0.99" step="0.01" v-model.number="confidence" />
        </div>
      </div>

      <!-- 状态提示 -->
      <div v-if="isLoadingCoco || isLoadingFace" class="status loading">
        ⏳ Loading models{{ isLoadingCoco ? ' (COCO-SSD)' : '' }}{{ isLoadingFace ? ' (BlazeFace)' : '' }}...
      </div>
      <div v-if="cocoError" class="status error">❌ COCO-SSD: {{ cocoError }}</div>
      <div v-if="faceError" class="status error">❌ BlazeFace: {{ faceError }}</div>
      <div v-if="cameraError" class="status error">❌ {{ cameraError }}</div>

      <!-- 隐藏的 video 元素，共享给两个 canvas -->
      <video ref="videoEl" class="hidden-video" autoplay muted playsinline />

      <!-- 分屏对比 -->
      <div class="split-screen">
        <!-- COCO-SSD 左侧 -->
        <div class="panel card">
          <div class="panel-header">
            <span class="model-tag coco">COCO-SSD</span>
            <div class="panel-stats">
              <span>🔍 {{ cocoDetections.length }} objects</span>
              <span>⏱️ {{ cocoTime }}ms</span>
            </div>
          </div>
          <div class="canvas-wrap">
            <canvas ref="cocoCanvas" class="panel-canvas" />
          </div>
        </div>

        <!-- BlazeFace 右侧 -->
        <div class="panel card">
          <div class="panel-header">
            <span class="model-tag face">BlazeFace</span>
            <div class="panel-stats">
              <span>👤 {{ faceDetections.length }} faces</span>
              <span>⏱️ {{ faceTime }}ms</span>
            </div>
          </div>
          <div class="canvas-wrap">
            <canvas ref="faceCanvas" class="panel-canvas" />
          </div>
        </div>
      </div>

      <!-- 双线延迟图 -->
      <LatencyChart
        ref="chartRef"
        title="Inference Latency Comparison — last 30 frames"
        :series="[
          { label: 'COCO-SSD', color: '#00ff88' },
          { label: 'BlazeFace', color: '#00bcd4' }
        ]"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCamera } from '../composables/useCamera'
import { useDetector } from '../composables/useDetector'
import LatencyChart from '../components/LatencyChart.vue'

const { devices, selectedDeviceId, error: cameraError, getCameras, startCamera, stopCamera } = useCamera()

// 两个独立的检测器实例
const coco = useDetector()
const face = useDetector()

const isLoadingCoco = coco.isLoading
const isLoadingFace = face.isLoading
const cocoError = coco.loadError
const faceError = face.loadError

const videoEl = ref(null)
const cocoCanvas = ref(null)
const faceCanvas = ref(null)
const chartRef = ref(null)
const confidence = ref(0.5)
const cocoDetections = ref([])
const faceDetections = ref([])
const cocoTime = ref(0)
const faceTime = ref(0)

let animFrame = null

async function restart() {
  await startCamera(videoEl.value)
}

function drawToCanvas(canvas, video, preds, color) {
  if (!canvas || !video) return
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  preds.forEach(p => {
    if (p.bbox) {
      const [x, y, w, h] = p.bbox
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, w, h)
      ctx.fillStyle = color
      ctx.font = 'bold 14px Arial'
      const text = `${p.label} ${Math.round(p.score * 100)}%`
      ctx.fillRect(x, y - 22, ctx.measureText(text).width + 8, 22)
      ctx.fillStyle = '#000'
      ctx.fillText(text, x + 4, y - 5)
    }

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

async function loop() {
  if (videoEl.value && videoEl.value.readyState === 4) {
    const [cocoResult, faceResult] = await Promise.all([
      (async () => {
        const t0 = performance.now()
        const preds = await coco.detect(videoEl.value, confidence.value)
        return { preds, ms: Math.round(performance.now() - t0) }
      })(),
      (async () => {
        const t0 = performance.now()
        const preds = await face.detect(videoEl.value, confidence.value)
        return { preds, ms: Math.round(performance.now() - t0) }
      })()
    ])

    cocoDetections.value = cocoResult.preds
    cocoTime.value = cocoResult.ms
    faceDetections.value = faceResult.preds
    faceTime.value = faceResult.ms

    drawToCanvas(cocoCanvas.value, videoEl.value, cocoResult.preds, '#00ff88')
    drawToCanvas(faceCanvas.value, videoEl.value, faceResult.preds, '#00bcd4')

    chartRef.value?.addPoints([cocoResult.ms, faceResult.ms])
  }

  animFrame = requestAnimationFrame(loop)
}

onMounted(async () => {
  await getCameras()
  await startCamera(videoEl.value)
  await Promise.all([
    coco.loadModel('COCO-SSD'),
    face.loadModel('BlazeFace')
  ])
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
.back-btn { padding: 8px 14px; border-radius: 20px; border: 1px solid #444; color: #aaa; text-decoration: none; font-size: 13px; white-space: nowrap; transition: background 0.2s; }
.back-btn:hover { background: #222; }
main { max-width: 1200px; margin: 0 auto; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.card { background: #1a1a1a; border-radius: 12px; padding: 20px; border: 1px solid #2a2a2a; }
.controls { display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-end; }
.control-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 160px; }
.control-group label { font-size: 13px; color: #aaa; }
.control-group select, .control-group input[type=range] { padding: 8px; border-radius: 6px; border: 1px solid #333; background: #111; color: #eee; font-size: 14px; }
.status { padding: 12px 16px; border-radius: 8px; font-size: 14px; }
.loading { background: #1a2a1a; color: #4caf50; }
.error { background: #2a1a1a; color: #f44336; }
.hidden-video { display: none; }
.split-screen { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.panel { padding: 12px; }
.panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.model-tag { font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 12px; }
.model-tag.coco { background: #00ff8822; color: #00ff88; border: 1px solid #00ff8844; }
.model-tag.face { background: #00bcd422; color: #00bcd4; border: 1px solid #00bcd444; }
.panel-stats { display: flex; gap: 8px; }
.panel-stats span { font-size: 12px; color: #888; background: #111; padding: 3px 8px; border-radius: 10px; }
.canvas-wrap { aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; }
.panel-canvas { width: 100%; height: 100%; display: block; }
</style>
