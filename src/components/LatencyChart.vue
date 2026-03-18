<template>
  <div class="chart-wrap card">
    <h3>{{ title }}</h3>
    <canvas ref="chartCanvas" height="80"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Chart, LineController, LineElement, PointElement,
  LinearScale, CategoryScale, Filler, Legend
} from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Legend)

const props = defineProps({
  title: { type: String, default: 'Inference Latency (ms) — last 30 frames' },
  series: {
    type: Array,
    default: () => [{ label: 'Latency', color: '#00ff88' }]
  },
  maxPoints: { type: Number, default: 30 }
})

const chartCanvas = ref(null)
let chart = null

onMounted(() => {
  chart = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      labels: Array(props.maxPoints).fill(''),
      datasets: props.series.map(s => ({
        label: s.label,
        data: Array(props.maxPoints).fill(null),
        borderColor: s.color,
        backgroundColor: s.color + '22',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      }))
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { labels: { color: '#aaa', font: { size: 11 }, boxWidth: 12 } }
      },
      scales: {
        x: { display: false },
        y: {
          beginAtZero: true,
          ticks: { color: '#888', font: { size: 10 } },
          grid: { color: '#222' },
          title: { display: true, text: 'ms', color: '#666', font: { size: 10 } }
        }
      }
    }
  })
})

// values = [ms, ...] one per series
function addPoints(values) {
  if (!chart) return
  values.forEach((v, i) => {
    if (!chart.data.datasets[i]) return
    chart.data.datasets[i].data.push(v)
    if (chart.data.datasets[i].data.length > props.maxPoints) {
      chart.data.datasets[i].data.shift()
    }
  })
  chart.update('none')
}

onUnmounted(() => chart?.destroy())
defineExpose({ addPoints })
</script>

<style scoped>
.chart-wrap h3 { margin: 0 0 10px; font-size: 13px; color: #aaa; }
</style>
