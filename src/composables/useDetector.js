import { ref, shallowRef } from 'vue'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as blazeface from '@tensorflow-models/blazeface'
import '@tensorflow/tfjs'

export const MODELS = {
  'COCO-SSD': { label: 'COCO-SSD (Object Detection)', type: 'detection' },
  'BlazeFace': { label: 'BlazeFace (Face Detection)', type: 'face' }
}

export function useDetector() {
  const model = shallowRef(null)
  const modelName = ref('')
  const isLoading = ref(false)
  const loadError = ref('')

  async function loadModel(name) {
    if (modelName.value === name && model.value) return
    isLoading.value = true
    loadError.value = ''
    model.value = null
    modelName.value = name
    try {
      if (name === 'COCO-SSD') {
        model.value = await cocoSsd.load()
      } else if (name === 'BlazeFace') {
        model.value = await blazeface.load()
      }
    } catch (e) {
      loadError.value = 'Failed to load model: ' + e.message
    } finally {
      isLoading.value = false
    }
  }

  async function detect(videoEl, confidence) {
    if (!model.value || !videoEl) return []
    try {
      if (modelName.value === 'COCO-SSD') {
        const preds = await model.value.detect(videoEl)
        return preds.filter(p => p.score >= confidence).map(p => ({
          label: p.class,
          score: p.score,
          bbox: p.bbox
        }))
      } else if (modelName.value === 'BlazeFace') {
        const preds = await model.value.estimateFaces(videoEl, false)
        return preds
          .filter(p => {
            const prob = Array.isArray(p.probability) ? p.probability[0] : p.probability
            return prob >= confidence
          })
          .map(p => {
            const prob = Array.isArray(p.probability) ? p.probability[0] : p.probability
            const [x1, y1] = p.topLeft
            const [x2, y2] = p.bottomRight
            return {
              label: 'face',
              score: prob,
              bbox: [x1, y1, x2 - x1, y2 - y1],
              landmarks: p.landmarks
            }
          })
      }
    } catch {
      return []
    }
    return []
  }

  return { model, modelName, isLoading, loadError, loadModel, detect }
}
