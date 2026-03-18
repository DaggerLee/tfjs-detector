import { ref } from 'vue'

export function useCamera() {
  const stream = ref(null)
  const devices = ref([])
  const selectedDeviceId = ref('')
  const error = ref('')

  async function getCameras() {
    try {
      // 先请求权限，否则拿不到设备列表
      await navigator.mediaDevices.getUserMedia({ video: true })
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      devices.value = allDevices.filter(d => d.kind === 'videoinput')
      if (devices.value.length > 0) {
        selectedDeviceId.value = devices.value[0].deviceId
      }
    } catch (e) {
      error.value = 'Camera permission denied: ' + e.message
    }
  }

  async function startCamera(videoEl) {
    stopCamera()
    error.value = ''
    try {
      const constraints = {
        video: selectedDeviceId.value
          ? { deviceId: { exact: selectedDeviceId.value } }
          : true
      }
      stream.value = await navigator.mediaDevices.getUserMedia(constraints)
      videoEl.srcObject = stream.value
      await videoEl.play()
    } catch (e) {
      error.value = 'Failed to start camera: ' + e.message
    }
  }

  function stopCamera() {
    if (stream.value) {
      stream.value.getTracks().forEach(t => t.stop())
      stream.value = null
    }
  }

  return { stream, devices, selectedDeviceId, error, getCameras, startCamera, stopCamera }
}