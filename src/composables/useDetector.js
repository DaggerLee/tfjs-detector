import { ref, shallowRef } from 'vue'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as mobilenet from '@tensorflow-models/mobilenet'
import '@tensorflow/tfjs'

export const MODELS = {
  'COCO-SSD': { label: 'COCO-SSD (Object Detection)', type: 'detection' },
  'MobileNet': { label: 'MobileNet (Classification)', type: 'classification' }
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
      } else if (name === 'MobileNet') {
        model.value = await mobilenet.load()
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
      } else if (modelName.value === 'MobileNet') {
        const preds = await model.value.classify(videoEl)
        return preds.filter(p => p.probability >= confidence).map(p => ({
          label: p.className,
          score: p.probability,
          bbox: null
        }))
      }
    } catch (e) {
      return []
    }
    return []
  }

  return { model, modelName, isLoading, loadError, loadModel, detect }
}