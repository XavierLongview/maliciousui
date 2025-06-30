<script setup lang="ts">
import { ref, computed } from 'vue'
import SpinWheel from '../components/SpinWheel.vue'
import GenderTuner from '../components/GenderTuner.vue'
import AddressGuessingGame from '../components/AddressGuessingGame.vue'

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const fullName = ref('')
const selectedGender = ref('')

// Spinner ref
const nameSpinner = ref<any>(null)
const isSpinning = ref(false)
const currentIndex = ref(0)

function startSpin() {
  isSpinning.value = true
  nameSpinner.value?.spin()
}
function stopSpin() {
  nameSpinner.value?.stop()
}
function onRest(index: number) {
  isSpinning.value = false
  currentIndex.value = index
}
function addLetter() {
  if (!isSpinning.value) {
    fullName.value += letters[currentIndex.value]
  }
}
function clearName() {
  fullName.value = ''
}

function onGenderSelected(gender: string) {
  selectedGender.value = gender
}

// Phone number logic (unchanged)
const generateThreeDigits = () => {
  const options = []
  for (let i = 0; i <= 999; i++) {
    options.push(i.toString().padStart(3, '0'))
  }
  return options
}
const generateFourDigits = () => {
  const options = []
  for (let i = 0; i <= 9999; i++) {
    options.push(i.toString().padStart(4, '0'))
  }
  return options
}
const firstThree = ref('')
const secondThree = ref('')
const lastFour = ref('')
const threeDigitOptions = generateThreeDigits()
const fourDigitOptions = generateFourDigits()
const fullPhoneNumber = computed(() => {
  if (firstThree.value && secondThree.value && lastFour.value) {
    return `(${firstThree.value}) ${secondThree.value}-${lastFour.value}`
  }
  return 'Please select all parts of your phone number'
})
</script>

<template>
  <div class="info-layout">
    <div class="form-column">
      <div class="phone-form">
         <h1>Provide Information</h1>
        <p class="subtitle">You will have to make compromises</p>
        <div class="name-section">
          <h2>👤 Full Name</h2>
          <p class="section-subtitle">Spin to build name</p>
          <div class="name-group" style="align-items:center;">
            <div class="name-display-row">
              <div class="name-display">
                {{ fullName || '' }}
              </div>
              <button @click="clearName" class="clear-btn-inline">
                Clear
              </button>
            </div>
            <div class="wheel-container">
              <SpinWheel
                ref="nameSpinner"
                :items="letters"
                @rest="onRest"
                :style="{ width: '340px', height: '340px' }"
              />
              <div class="wheel-controls-group">
                <div class="wheel-controls">
                  <button class="spin-btn" :disabled="isSpinning" @click="startSpin">
                    Start Spin
                  </button>
                  <button class="stop-btn" :disabled="!isSpinning" @click="stopSpin">
                    Stop
                  </button>
                </div>
                <div class="letter-actions-inline">
                  <button @click="addLetter" :disabled="isSpinning" class="add-btn">
                    Add Letter to Name
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Gender Section -->
        <div class="gender-section">
          <h2>🎵 Gender Selection</h2>
          <GenderTuner @genderSelected="onGenderSelected" />
        </div>

        <!-- Phone Section (unchanged) -->
        <div class="phone-section">
          <h2>📞 Phone Number</h2>
          <div class="form-container">
            <div class="dropdowns-row">
              <div class="form-group">
                <label for="first-three">First 3 digits:</label>
                <select
                  id="first-three"
                  v-model="firstThree"
                  class="phone-dropdown"
                >
                  <option value="">Select...</option>
                  <option
                    v-for="option in threeDigitOptions"
                    :key="option"
                    :value="option"
                  >
                    {{ option }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label for="second-three">Next 3 digits:</label>
                <select
                  id="second-three"
                  v-model="secondThree"
                  class="phone-dropdown"
                >
                  <option value="">Select...</option>
                  <option
                    v-for="option in threeDigitOptions"
                    :key="option"
                    :value="option"
                  >
                    {{ option }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label for="last-four">Last 4 digits:</label>
                <select
                  id="last-four"
                  v-model="lastFour"
                  class="phone-dropdown"
                >
                  <option value="">Select...</option>
                  <option
                    v-for="option in fourDigitOptions"
                    :key="option"
                    :value="option"
                  >
                    {{ option }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Address Guessing Game Section -->
        <div class="address-game-section">
          <h2>🏠 City and State</h2>
          <AddressGuessingGame />
        </div>
      </div>
    </div>
    <div class="result-column">
      <div class="result">
        <h3>Your Information:</h3>
        <p class="info-display">
          <strong>Name:</strong> {{ fullName || 'Not entered' }}<br>
          <strong>Gender:</strong> {{ selectedGender || 'Not determined' }}<br>
          <strong>Phone:</strong> {{ fullPhoneNumber }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-layout {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  justify-content: center;
}

.form-column {
  flex: 3 1 700px;
  min-width: 0;
}

.result-column {
  flex: 1 1 320px;
  min-width: 260px;
  max-width: 400px;
  position: sticky;
  top: 2rem;
  align-self: flex-start;
}

@media (max-width: 1100px) {
  .info-layout {
    flex-direction: column;
    gap: 0;
  }
  .result-column {
    position: static;
    max-width: 100%;
    margin-top: 2rem;
  }
}

.phone-form {
  max-width: 100%;
  width: 100%;
  margin: 1rem auto;
  background: #fafbfc;
  border-radius: 16px;
  padding: 1.5rem 1rem 2rem 1rem;
  box-shadow: 0 2px 16px rgba(0,0,0,0.07);
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  color: #42b883;
  text-align: center;
}

h2 {
  font-size: 1.8rem;
  margin-bottom: 1rem;
  color: #333;
  text-align: center;
}

.section-subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.name-section, .phone-section, .address-game-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 12px;
}

.name-container {
  display: flex;
  gap: 2rem;
  justify-content: center;
}

.name-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  min-width: 300px;
}

.name-group label {
  font-weight: bold;
  color: #333;
  font-size: 1.1rem;
}

.name-display-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 1rem;
  margin-bottom: 1rem;
}

.name-display {
  font-size: 2rem;
  font-weight: bold;
  color: #42b883;
  min-height: 2.5rem;
  padding: 0.5rem 1.5rem;
  background-color: white;
  border-radius: 8px;
  border: 2px solid #ddd;
  text-align: center;
  flex: 1;
}

.wheel-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 1.5rem;
}

/* Responsive wheel size */
.spin-wheel-wrapper,
.spin-wheel-canvas {
  width: 100%;
  max-width: 680px;
  aspect-ratio: 1 / 1;
  margin: 0 auto;
}

@media (max-width: 900px) {
  .spin-wheel-wrapper,
  .spin-wheel-canvas {
    width: 90vw;
    height: 90vw;
    max-width: 680px;
    max-height: 680px;
  }
}

.wheel-controls-group {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-top: 1rem;
}

.wheel-controls {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-start;
}

.letter-actions-inline {
  display: flex;
  gap: 0.5rem;
  margin-left: 0;
  justify-content: flex-end;
  flex: 1;
}

.spin-btn, .stop-btn, .add-btn, .clear-btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.spin-btn {
  background-color: #42b883;
  color: white;
}

.spin-btn:hover:not(:disabled) {
  background-color: #3aa876;
}

.stop-btn {
  background-color: #dc3545;
  color: white;
}

.stop-btn:hover:not(:disabled) {
  background-color: #c82333;
}

.add-btn {
  background-color: #007bff;
  color: white;
}

.add-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.clear-btn {
  background-color: #6c757d;
  color: white;
}

.clear-btn:hover {
  background-color: #545b62;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-container {
  margin-bottom: 2rem;
}

.dropdowns-row {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  align-items: flex-end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 180px;
}

label {
  font-weight: bold;
  color: #333;
  font-size: 1rem;
  text-align: center;
}

.phone-dropdown {
  padding: 0.75rem;
  font-size: 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  background-color: white;
  cursor: pointer;
  max-height: 200px;
  text-align: center;
}

.phone-dropdown:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.phone-section {
  margin-top: 2rem;
}

.result {
  background-color: #f8f9fa;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  max-width: 600px;
  margin: 1.5rem auto 0 auto;
}

.result h3 {
  margin: 0 0 0.75rem 0;
  color: #333;
  font-size: 1.3rem;
}

.info-display {
  font-size: 1.2rem;
  color: #42b883;
  margin: 0;
  font-family: monospace;
  line-height: 1.5;
}

.wheel-container.large {
  width: 340px;
  height: 340px;
  margin: 0 auto;
}

.gender-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: #f8f9fa;
  border-radius: 12px;
}

.clear-btn-inline {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #6c757d;
  color: white;
  white-space: nowrap;
}

.clear-btn-inline:hover {
  background-color: #545b62;
}
</style>
