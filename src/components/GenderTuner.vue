<template>
  <div class="gender-tuner">
    <p class="tuner-instructions">
      Please produce the correct tonal frequency to indicate your Gender Identity.
    </p>

    <div class="tuner-display">
      <div class="target-note">
        <span class="note">A</span>
        <button @click="playTargetTone" class="play-tone-btn">
          🔊 Hear Tone
        </button>
      </div>

      <!-- Frequency Spectrum Analyzer -->
      <div class="spectrum-analyzer" v-if="isListening">
        <canvas ref="spectrumCanvas" width="400" height="100"></canvas>
        <div class="spectrum-labels">
          <span>200Hz</span>
          <span>800Hz</span>
        </div>
      </div>

      <div class="pitch-indicator">
        <div class="tuner-needle" :style="{ transform: `translateX(${needlePosition}px)` }"></div>
        <div class="tuner-scale">
          <span class="scale-label">Male</span>
          <div class="center-line"></div>
          <span class="scale-label">Female</span>
        </div>
      </div>

      <div class="current-pitch" v-if="isListening">
        <div class="pitch-details">
          <span class="frequency-display">{{ currentFrequency ? Math.round(currentFrequency) + ' Hz' : '—' }}</span>
          <span class="note-name">{{ currentFrequency ? currentNoteName : '—' }}</span>
        </div>
        <span class="accuracy" :class="currentFrequency ? accuracyClass : ''">{{ currentFrequency ? accuracyText : '—' }}</span>
        <div class="pitch-bar">
          <div class="pitch-fill" :style="{ width: currentFrequency ? `${pitchConfidence}%` : '0%' }"></div>
        </div>
        <span class="confidence-text">Confidence: {{ currentFrequency ? Math.round(pitchConfidence) + '%' : '—' }}</span>
      </div>

      <div class="status" v-else>
        {{ statusMessage }}
      </div>
    </div>

    <div class="controls">
      <button
        @click="handleStartClick"
        :disabled="isListening || genderSelected"
        class="start-btn"
        v-if="!genderSelected"
      >
        {{ isListening ? 'Listening...' : 'Start Humming' }}
      </button>

      <button
        @click="resetTuner"
        class="retry-btn"
        v-if="genderSelected"
      >
        Try Again
      </button>

      <button
        @click="stopListening"
        :disabled="!isListening"
        class="stop-btn"
      >
        Stop
      </button>
    </div>

    <!-- Audio Context Status -->
    <div class="audio-status" v-if="!isListening && audioContextState !== 'running'">
      <p>⚠️ Audio system needs to be activated. Click any button to start.</p>
    </div>

    <div class="gender-result" v-if="genderSelected">
      <h4>🎯 Gender Determined!</h4>
      <div class="result-display" :class="genderClass">
        {{ selectedGender }}
      </div>
      <p class="result-explanation">{{ resultExplanation }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { YIN } from 'pitchfinder'

const emit = defineEmits(['genderSelected'])

// Audio context and analyzer
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let microphone: MediaStreamAudioSourceNode | null = null
let stream: MediaStream | null = null

// Canvas for spectrum analyzer
const spectrumCanvas = ref<HTMLCanvasElement | null>(null)

// Pitch detection
const pitchFinder = YIN()
const targetFrequency = 440 // A4 note
const tolerance = 40 // Hz tolerance for "in tune" (increased from 20)

// Reactive state
const isListening = ref(false)
const currentFrequency = ref<number | null>(null)
const pitchConfidence = ref(0)
const genderSelected = ref(false)
const selectedGender = ref('')
const statusMessage = ref('Click "Start Humming" to begin')
const accuracyText = ref('')
const accuracyClass = ref('')
const genderClass = ref('')
const resultExplanation = ref('')

// Debug state
const audioContextState = ref('')

// Tuner needle position (centered at 0, moves left/right)
const needlePosition = ref(0)
const NEEDLE_LIMIT = 50 // px, max left/right movement

// Humming duration tracking
let hummingStartTime = 0
let hummingDuration = 0
let accuracySamples: number[] = []

// Note names for frequency to note conversion
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Computed properties
const currentNoteName = computed(() => {
  if (!currentFrequency.value) return ''

  // Convert frequency to note name
  const a4 = 440
  const c0 = a4 * Math.pow(2, -4.75)
  const halfStepsBelowMiddleC = Math.round(12 * Math.log2(currentFrequency.value / c0))
  const octave = Math.floor(halfStepsBelowMiddleC / 12)
  const noteIndex = (halfStepsBelowMiddleC % 12 + 12) % 12

  return `${noteNames[noteIndex]}${octave}`
})

onMounted(() => {
  // Initialize audio context
  audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.8

  audioContextState.value = audioContext.state

  console.log('Audio context initialized:', audioContext.state)
  console.log('Sample rate:', audioContext.sampleRate)
  console.log('Buffer size:', analyser.frequencyBinCount)
})

onBeforeUnmount(() => {
  stopListening()
  if (audioContext) {
    audioContext.close()
  }
})

async function activateAudioContext() {
  try {
    if (audioContext!.state === 'suspended') {
      await audioContext!.resume()
      audioContextState.value = audioContext!.state
      console.log('Audio context resumed:', audioContext!.state)
    }
  } catch (error) {
    console.error('Error activating audio context:', error)
  }
}

async function startListening() {
  try {
    statusMessage.value = 'Requesting microphone access...'

    // Resume audio context if suspended (required for Chrome)
    if (audioContext!.state === 'suspended') {
      await audioContext!.resume()
    }

    // Request microphone access with more specific constraints
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 44100,
        channelCount: 1
      }
    })

    console.log('Microphone access granted:', stream)

    // Connect microphone to analyzer
    microphone = audioContext!.createMediaStreamSource(stream)
    if (analyser) {
      microphone.connect(analyser)
    }

    isListening.value = true
    statusMessage.value = 'Hum the A note (440 Hz)'
    hummingStartTime = Date.now()
    accuracySamples = []

    console.log('Audio context state:', audioContext!.state)
    console.log('Analyser connected, starting pitch detection...')

    // Start pitch detection loop
    detectPitch()

  } catch (error) {
    console.error('Error accessing microphone:', error)
    statusMessage.value = 'Microphone access denied. Please allow microphone access and try again.'
  }
}

function stopListening() {
  isListening.value = false
  currentFrequency.value = null
  pitchConfidence.value = 0

  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }

  if (microphone) {
    microphone.disconnect()
    microphone = null
  }

  statusMessage.value = 'Click "Start Humming" to begin'
}

function detectPitch() {
  if (!isListening.value || !analyser) {
    console.log('Detection stopped: not listening or no analyser')
    return
  }

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Float32Array(bufferLength)
  const frequencyData = new Uint8Array(bufferLength)

  analyser.getFloatTimeDomainData(dataArray)
  analyser.getByteFrequencyData(frequencyData)

  // Debug: Check if we're getting audio data
  const signalStrengthValue = frequencyData.reduce((sum, val) => sum + val, 0) / frequencyData.length
  const confidence = Math.min(100, (signalStrengthValue / 128) * 100)

  // Calculate volume level from time domain data
  const rms = Math.sqrt(dataArray.reduce((sum, val) => sum + val * val, 0) / dataArray.length)

  console.log('Signal strength:', signalStrengthValue, 'Confidence:', confidence)

  // Detect pitch using YIN algorithm
  const pitch = pitchFinder(dataArray)

  if (pitch && pitch > 0 && confidence > 5) { // Lowered threshold for testing
    console.log('Pitch detected:', pitch, 'Hz')
    currentFrequency.value = pitch
    pitchConfidence.value = confidence

    // Calculate accuracy
    const accuracy = Math.abs(pitch - targetFrequency)
    const accuracyPercent = Math.max(0, 100 - (accuracy / targetFrequency) * 100)

    // Update tuner needle position (-50 to 50 pixels)
    needlePosition.value = Math.max(-NEEDLE_LIMIT, Math.min(NEEDLE_LIMIT, ((pitch - targetFrequency) / targetFrequency) * NEEDLE_LIMIT))

    // Determine accuracy text and class
    if (accuracy <= tolerance) {
      accuracyText.value = 'In Tune!'
      accuracyClass.value = 'in-tune'
    } else if (pitch > targetFrequency) {
      accuracyText.value = 'Sharp'
      accuracyClass.value = 'sharp'
    } else {
      accuracyText.value = 'Flat'
      accuracyClass.value = 'flat'
    }

    // Track accuracy for gender determination
    accuracySamples.push(accuracyPercent)

    // Check if we have enough samples (8 seconds of humming)
    hummingDuration = Date.now() - hummingStartTime
    if (hummingDuration >= 8000 && accuracySamples.length >= 20) {
      determineGender()
      return
    }
  } else {
    if (currentFrequency.value) {
      console.log('Lost pitch detection')
    }
    currentFrequency.value = null
    pitchConfidence.value = 0
  }

  // Draw spectrum analyzer
  drawSpectrum(frequencyData)

  // Continue detection
  requestAnimationFrame(detectPitch)
}

function drawSpectrum(frequencyData: Uint8Array) {
  if (!spectrumCanvas.value) return

  const canvas = spectrumCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height

  // Clear canvas
  ctx.clearRect(0, 0, width, height)

  // Draw background
  ctx.fillStyle = '#f8f9fa'
  ctx.fillRect(0, 0, width, height)

  // Draw frequency bars
  const barWidth = width / frequencyData.length
  const maxBars = Math.min(frequencyData.length, 200) // Limit bars for performance

  ctx.fillStyle = '#42b883'

  for (let i = 0; i < maxBars; i++) {
    const barHeight = (frequencyData[i] / 255) * height
    const x = i * barWidth
    const y = height - barHeight

    ctx.fillRect(x, y, barWidth - 1, barHeight)
  }

  // Draw target frequency line
  const targetIndex = Math.round((targetFrequency / (audioContext!.sampleRate / 2)) * maxBars)
  const targetX = targetIndex * barWidth

  ctx.strokeStyle = '#dc3545'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.moveTo(targetX, 0)
  ctx.lineTo(targetX, height)
  ctx.stroke()
  ctx.setLineDash([])
}

function determineGender() {
  stopListening()

  // Calculate average accuracy
  const avgAccuracy = accuracySamples.reduce((sum, acc) => sum + acc, 0) / accuracySamples.length

  // Determine gender based on accuracy
  if (avgAccuracy >= 85) {
    // High accuracy = Non-binary (in tune)
    selectedGender.value = 'Non-Binary'
    genderClass.value = 'non-binary'
    resultExplanation.value = `You achieved ${Math.round(avgAccuracy)}% accuracy - perfectly in tune!`
  } else if (avgAccuracy >= 60) {
    // Medium accuracy = Female (slightly sharp)
    selectedGender.value = 'Female'
    genderClass.value = 'female'
    resultExplanation.value = `You achieved ${Math.round(avgAccuracy)}% accuracy - slightly sharp!`
  } else {
    // Low accuracy = Male (flat)
    selectedGender.value = 'Male'
    genderClass.value = 'male'
    resultExplanation.value = `You achieved ${Math.round(avgAccuracy)}% accuracy - quite flat!`
  }

  genderSelected.value = true
  emit('genderSelected', selectedGender.value)
}

// Add click handlers to activate audio context
function handleStartClick() {
  activateAudioContext()
  startListening()
}

function resetTuner() {
  genderSelected.value = false
  selectedGender.value = ''
  statusMessage.value = 'Click "Start Humming" to begin'
  accuracyText.value = ''
  accuracyClass.value = ''
  genderClass.value = ''
  resultExplanation.value = ''
  accuracySamples = []
  needlePosition.value = 0
  currentFrequency.value = null
  pitchConfidence.value = 0
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
  if (microphone) {
    microphone.disconnect()
    microphone = null
  }
}

function playTargetTone() {
  try {
    // Activate audio context if needed
    activateAudioContext()

    // Create a test oscillator at 440 Hz (target frequency)
    const oscillator = audioContext!.createOscillator()
    const gainNode = audioContext!.createGain()

    oscillator.frequency.setValueAtTime(440, audioContext!.currentTime)
    oscillator.type = 'sine'

    // Set a reasonable volume (0.2 = 20% volume)
    gainNode.gain.setValueAtTime(0.2, audioContext!.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext!.currentTime + 3)

    // Connect to speakers
    oscillator.connect(gainNode)
    gainNode.connect(audioContext!.destination)

    oscillator.start(audioContext!.currentTime)
    oscillator.stop(audioContext!.currentTime + 3)

    console.log('Target tone (440 Hz) played for 3 seconds')

  } catch (error) {
    console.error('Error playing target tone:', error)
  }
}
</script>

<style scoped>
.gender-tuner {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  margin-bottom: 1.5rem;
}

.gender-tuner h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
  font-size: 1.4rem;
}

.tuner-instructions {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.tuner-display {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border: 2px solid #ddd;
}

.target-note {
  margin-bottom: 1.5rem;
}

.target-note .note {
  font-size: 3rem;
  font-weight: bold;
  color: #42b883;
  display: block;
}

.target-note .frequency {
  font-size: 1.2rem;
  color: #666;
}

.spectrum-analyzer {
  margin-bottom: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.spectrum-analyzer canvas {
  display: block;
  width: 100%;
  height: 100px;
}

.spectrum-labels {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0.5rem;
  background: #f8f9fa;
  font-size: 0.7rem;
  color: #666;
}

.pitch-indicator {
  position: relative;
  height: 60px;
  margin-bottom: 1rem;
}

.tuner-needle {
  position: absolute;
  top: 0;
  left: 50%;
  width: 4px;
  height: 100%;
  background: #dc3545;
  border-radius: 2px;
  transition: transform 0.1s ease;
  z-index: 10;
}

.tuner-scale {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.center-line {
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 100%;
  background: #42b883;
  transform: translateX(-50%);
}

.scale-label {
  font-size: 0.8rem;
  color: #666;
  font-weight: bold;
}

.current-pitch {
  margin-top: 1rem;
}

.pitch-details {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.frequency-display {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
}

.note-name {
  font-size: 1.2rem;
  font-weight: bold;
  color: #42b883;
  background: #e8f5e8;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.accuracy {
  font-size: 1.1rem;
  font-weight: bold;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  display: block;
  margin-bottom: 0.5rem;
}

.accuracy.in-tune {
  background: #42b883;
  color: white;
}

.accuracy.sharp {
  background: #ffc107;
  color: #333;
}

.accuracy.flat {
  background: #6c757d;
  color: white;
}

.pitch-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.pitch-fill {
  height: 100%;
  background: linear-gradient(90deg, #dc3545, #ffc107, #42b883);
  transition: width 0.2s ease;
}

.confidence-text {
  font-size: 0.8rem;
  color: #666;
}

.status {
  font-size: 1.1rem;
  color: #666;
  margin-top: 1rem;
}

.controls {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.start-btn, .stop-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.start-btn {
  background-color: #42b883;
  color: white;
}

.start-btn:hover:not(:disabled) {
  background-color: #3aa876;
}

.stop-btn {
  background-color: #dc3545;
  color: white;
  font-size: 1rem;
  display: inline-block;
}

.stop-btn:hover:not(:disabled) {
  background-color: #c82333;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.gender-result {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  border: 2px solid #ddd;
}

.gender-result h4 {
  margin: 0 0 1rem 0;
  color: #333;
}

.result-display {
  font-size: 2rem;
  font-weight: bold;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.result-display.male {
  background: #007bff;
  color: white;
}

.result-display.female {
  background: #e83e8c;
  color: white;
}

.result-display.non-binary {
  background: #6f42c1;
  color: white;
}

.result-explanation {
  color: #666;
  margin: 0;
  font-size: 0.95rem;
}

.audio-status {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 0.9rem;
  color: #666;
}

.retry-btn {
  background-color: #17a2b8;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 0;
  display: inline-block;
  box-sizing: border-box;
}

.retry-btn:hover:not(:disabled) {
  background-color: #138496;
}

.play-tone-btn {
  background-color: #42b883;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: 0.5rem;
}

.play-tone-btn:hover:not(:disabled) {
  background-color: #3aa876;
}
</style>
