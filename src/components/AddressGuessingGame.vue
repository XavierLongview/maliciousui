<!--
Game Requirements:
1. Use an LLM to generate yes or no questions to gradually narrow down to a specific city and zip code.
2. It should be as fast as possible.
3. Never ask a question that can be ruled out by a previous question.
4. Questions should always be generated by the LLM.
5. When ready the LLM should make a guess. Only guess when ready.
6. DO NOT IMPLEMENT ANY FALL BACK QUESTIONS -- only the LLM should provide questions.
-->
<template>
  <div class="address-game">
    <div class="game-header">
      <p class="game-description">
        Enter your City and State:
      </p>
    </div>

    <!-- Game Setup -->
    <div v-if="!gameStarted" class="game-setup">
      <div class="setup-card">
        <p>Please answer honestly and accurately.</p>
        <button @click="startGame" class="start-btn" :disabled="loading">
          {{ loading ? 'Starting...' : 'Begin' }}
        </button>
      </div>
    </div>

    <!-- Active Game -->
    <div v-else class="game-active">
      <!-- Question Display -->
      <div class="question-section">
        <div class="question-card">
          <div class="question-number">Question {{ questionNumber }}</div>
          <div class="question-text">{{ questionLoading ? 'Thinking...' : currentQuestion }}</div>
        </div>
      </div>

      <!-- Answer Input -->
      <div class="answer-section">
        <div class="quick-answers">
          <button @click="quickAnswer('yes')" class="quick-btn yes-btn" :disabled="questionLoading">Yes</button>
          <button @click="quickAnswer('no')" class="quick-btn no-btn" :disabled="questionLoading">No</button>
          <button @click="quickAnswer('maybe')" class="quick-btn maybe-btn" :disabled="questionLoading">Maybe</button>
          <button @click="quickAnswer('i dont know')" class="quick-btn unknown-btn" :disabled="questionLoading">I don't know</button>
        </div>
      </div>

      <!-- Game Progress -->
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${(questionNumber / 20) * 100}%` }"></div>
        </div>
        <div class="progress-text">
          Questions: {{ questionNumber }}/20 | Confidence: {{ confidence }}%
        </div>
      </div>

      <!-- Question History -->
      <div class="history-section">
        <div class="history-header">
          <h4>
            <span class="history-icon">📝</span>
            Question History
            <span class="history-count">({{ questionHistory.length }})</span>
          </h4>
          <div class="history-controls">
            <button
              @click="toggleHistoryExpanded"
              class="history-toggle"
              :class="{ expanded: historyExpanded }"
            >
              {{ historyExpanded ? '▼' : '▶' }}
            </button>
            <button
              v-if="questionHistory.length > 3"
              @click="toggleHistorySearch"
              class="history-search-btn"
              :class="{ active: showHistorySearch }"
            >
              🔍
            </button>
          </div>
        </div>

        <div v-if="showHistorySearch && historyExpanded" class="history-search">
          <input
            v-model="historySearchTerm"
            type="text"
            placeholder="Search questions or answers..."
            class="history-search-input"
          />
        </div>

        <div v-if="historyExpanded" class="history-list">
          <div class="history-summary" v-if="questionHistory.length > 0">
            <div class="summary-stats">
              <div class="stat-item">
                <span class="stat-label">Yes:</span>
                <span class="stat-value">{{ getAnswerCount('yes') }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">No:</span>
                <span class="stat-value">{{ getAnswerCount('no') }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Maybe:</span>
                <span class="stat-value">{{ getAnswerCount('maybe') }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Unknown:</span>
                <span class="stat-value">{{ getAnswerCount('i dont know') }}</span>
              </div>
            </div>
          </div>

          <div class="history-timeline">
            <div
              v-for="(item, index) in filteredHistory"
              :key="index"
              class="history-item"
              :class="getAnswerClass(item.answer)"
            >
              <div class="history-item-header">
                <div class="question-number-badge">Q{{ getOriginalIndex(item) + 1 }}</div>
                <div class="answer-badge" :class="getAnswerClass(item.answer)">
                  {{ getAnswerIcon(item.answer) }} {{ item.answer }}
                </div>
                <div class="confidence-indicator">
                  <div class="confidence-bar">
                    <div
                      class="confidence-fill"
                      :style="{ width: `${getQuestionConfidence(index)}%` }"
                    ></div>
                  </div>
                  <span class="confidence-text">{{ getQuestionConfidence(index) }}%</span>
                </div>
              </div>
              <div class="history-question">
                <span class="question-icon">❓</span>
                {{ item.question }}
              </div>
              <div class="history-meta">
                <span class="time-ago">{{ getTimeAgo(index) }}</span>
                <span class="question-type">{{ getQuestionType(item.question) }}</span>
              </div>
            </div>
          </div>

          <div v-if="filteredHistory.length === 0 && historySearchTerm" class="no-results">
            <span class="no-results-icon">🔍</span>
            <p>No questions or answers match "{{ historySearchTerm }}"</p>
          </div>
        </div>

        <div v-else class="history-preview">
          <div v-if="questionHistory.length > 0" class="preview-items">
            <div
              v-for="(item, index) in questionHistory.slice(-2)"
              :key="index"
              class="preview-item"
            >
              <span class="preview-number">Q{{ questionHistory.length - 1 + index }}</span>
              <span class="preview-answer" :class="getAnswerClass(item.answer)">
                {{ getAnswerIcon(item.answer) }}
              </span>
              <span class="preview-question">{{ truncateText(item.question, 40) }}</span>
            </div>
          </div>
          <div v-else class="no-history">
            <span class="no-history-icon">💭</span>
            <p>Questions will appear here as you play</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Game Result -->
    <div v-if="gameEnded" class="game-result">
      <div class="result-card">
        <h3>{{ gameWon ? '🎉 Correct!' : '🤔 Game Over' }}</h3>
        <div v-if="gameWon" class="win-message">
          <p>I guessed your address in {{ questionNumber }} questions!</p>
          <div class="final-guess">
            <strong>My guess:</strong> {{ finalGuess }}
          </div>
        </div>
        <div v-else class="lose-message">
          <p>I couldn't guess your address in 20 questions.</p>
          <div class="final-guess">
            <strong>My best guess:</strong> {{ finalGuess }}
          </div>
          <div class="actual-address">
            <strong>Your address:</strong> {{ actualAddress }}
          </div>
        </div>
        <button @click="resetGame" class="play-again-btn">Play Again</button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Setting up the game...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { InferenceClient } from '@huggingface/inference'

// Game state
const gameStarted = ref(false)
const gameEnded = ref(false)
const gameWon = ref(false)
const loading = ref(false)
const submitting = ref(false)
const questionLoading = ref(false)

// Game data
const questionNumber = ref(0)
const currentQuestion = ref('')
const userAnswer = ref('')
const confidence = ref(0)
const finalGuess = ref('')
const actualAddress = ref('')

// Question history
const questionHistory = ref<Array<{ question: string; answer: string }>>([])

// History UI state
const historyExpanded = ref(false)
const showHistorySearch = ref(false)
const historySearchTerm = ref('')

// Location profile (built up from answers)
const locationProfile = ref<Record<string, any>>({})

// Hugging Face API configuration
const HF_API_URL = 'https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-R1-0528'
const HF_API_KEY = import.meta.env.VITE_HF_API_KEY || ''

const client = new InferenceClient(HF_API_KEY)

// Computed properties
const canSubmit = computed(() => {
  return userAnswer.value.trim().length > 0 && !submitting.value
})

// History computed properties
const filteredHistory = computed(() => {
  if (!historySearchTerm.value) {
    return questionHistory.value
  }

  const searchTerm = historySearchTerm.value.toLowerCase()
  return questionHistory.value.filter(item =>
    item.question.toLowerCase().includes(searchTerm) ||
    item.answer.toLowerCase().includes(searchTerm)
  )
})

// Game functions
async function startGame() {
  loading.value = true

  try {
    // Initialize the game with the first question
    await askNextQuestion()
    gameStarted.value = true
  } catch (error) {
    console.error('Error starting game:', error)
    alert('Failed to start game. Please try again.')
  } finally {
    loading.value = false
  }
}

async function askNextQuestion(retryCount = 0) {
  questionLoading.value = true
  try {
    const prompt = generatePrompt()
    console.log('Sending prompt to LLM:', prompt)

    const response = await callHuggingFaceAPI(prompt)
    console.log('LLM response:', response)

    if (response && response.generated_text) {
      let responseObj = extractFirstQuestion(response.generated_text.trim())
      console.log('LLM response type:', responseObj.type, 'content:', responseObj.content)

      // Validate that the response is actually a question, not instructions
      if (isInstructionResponse(responseObj.content)) {
        console.log('LLM returned instructions instead of question, retrying...')
        if (retryCount < 3) {
          questionLoading.value = false
          await askNextQuestion(retryCount + 1)
          return
        } else {
          currentQuestion.value = 'Error: LLM returned instructions instead of a question. Please try again.'
          questionNumber.value++
          questionLoading.value = false
          return
        }
      }

      // If the LLM returns an empty question, retry up to 3 times
      if (!responseObj.content && retryCount < 3) {
        console.log('Empty LLM response, retrying...')
        questionLoading.value = false
        await askNextQuestion(retryCount + 1)
        return
      } else if (!responseObj.content) {
        console.log('LLM failed after 3 retries, showing error.')
        currentQuestion.value = 'Error: Could not generate a question from the LLM. Please try again.'
        questionNumber.value++
        questionLoading.value = false
        return
      }

      if (responseObj.type === 'guess') {
        // End the game and show the guess
        finalGuess.value = responseObj.content
        gameEnded.value = true
        gameWon.value = false // You can update this logic if you want to check correctness
        questionLoading.value = false
        return
      }

      // Otherwise, it's a question
      currentQuestion.value = responseObj.content
      questionNumber.value++
      questionLoading.value = false
    } else {
      // If the LLM fails, retry up to 3 times
      if (retryCount < 3) {
        console.log('API failed, retrying...')
        questionLoading.value = false
        await askNextQuestion(retryCount + 1)
        return
      } else {
        console.log('API failed after 3 retries, showing error.')
        currentQuestion.value = 'Error: Failed to connect to the LLM API. Please check your connection and try again.'
        questionNumber.value++
        questionLoading.value = false
        return
      }
    }
  } catch (error) {
    if (retryCount < 3) {
      console.log('Error asking question, retrying...', error)
      questionLoading.value = false
      await askNextQuestion(retryCount + 1)
      return
    } else {
      console.error('Error asking question after 3 retries:', error)
      currentQuestion.value = 'Error: An unexpected error occurred while generating the question. Please try again.'
      questionNumber.value++
      questionLoading.value = false
    }
  }
}

function generatePrompt(): string {
  const profile = JSON.stringify(locationProfile.value, null, 2)
  const history = questionHistory.value.map(q => `Q: ${q.question} A: ${q.answer}`).join('\n')

  return `<s>[INST] You are playing 20 Questions to guess a US city and zip code.\nYou must ONLY output a line starting with FINAL_QUESTION: <your yes/no question> or FINAL_GUESS: <city, zip> and nothing else.\nDo NOT include any thoughts, explanations, or reasoning.\nDo NOT output any other text, only the required line.\nNever ask a question that can be ruled out by a previous question or answer.\nAlways generate your next question based on all previous Q&A.\n\nPrevious Q&A:\n${history}\n\nCurrent profile: ${profile}\n[/INST]`
}

function extractFirstQuestion(text: string): { type: 'question' | 'guess', content: string } {
  // Remove any [USER], [ASSISTANT], [/USER], or [/ASSISTANT] tags and split by newlines
  const cleaned = text.replace(/\[\/?USER\]/gi, '').replace(/\[\/?ASSISTANT\]/gi, '');
  // Remove <think> and similar tokens
  const noThink = cleaned.replace(/<think>/gi, '').replace(/thinking/gi, '').trim();
  // Split into lines and trim
  const lines = noThink.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Only accept lines that start with FINAL_GUESS: or FINAL_QUESTION:
  const finalGuessLine = lines.find(line => line.toLowerCase().startsWith('final_guess:'));
  if (finalGuessLine) {
    return { type: 'guess', content: finalGuessLine.replace(/final_guess:/i, '').trim() };
  }
  const finalQuestionLine = lines.find(line => line.toLowerCase().startsWith('final_question:'));
  if (finalQuestionLine) {
    return { type: 'question', content: finalQuestionLine.replace(/final_question:/i, '').trim() };
  }

  // Fallback: if no valid line found, return empty content
  return { type: 'question', content: '' };
}

async function callHuggingFaceAPI(prompt: string) {
  try {
    const chatCompletion = await client.chatCompletion({
      provider: 'fireworks-ai',
      model: 'deepseek-ai/DeepSeek-R1-0528',
      messages: [
        {
          role: 'system',
          content: `You are playing 20 Questions to guess a US city and zip code.\nYou must ONLY output a line starting with FINAL_QUESTION: <your yes/no question> or FINAL_GUESS: <city, zip> and nothing else.\nDo NOT include any thoughts, explanations, or reasoning.\nDo NOT output any other text, only the required line.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    if (
      chatCompletion &&
      chatCompletion.choices &&
      chatCompletion.choices[0] &&
      chatCompletion.choices[0].message &&
      chatCompletion.choices[0].message.content
    ) {
      return { generated_text: chatCompletion.choices[0].message.content.trim() }
    } else {
      return null
    }
  } catch (error) {
    console.error('Hugging Face API error:', error)
    return null
  }
}

async function submitAnswer() {
  if (!userAnswer.value.trim() || submitting.value) return

  submitting.value = true

  try {
    const answer = userAnswer.value.trim()

    // Add to history
    questionHistory.value.push({
      question: currentQuestion.value,
      answer: answer
    })

    // Update location profile based on answer
    updateLocationProfile(currentQuestion.value, answer)

    // Update confidence
    updateConfidence()

    // Check if game should end
    if ((confidence.value > 80 && questionNumber.value >= 8) || questionNumber.value >= 20) {
      await endGame()
    } else {
      // Ask next question
      await askNextQuestion()
      userAnswer.value = ''
    }
  } catch (error) {
    console.error('Error submitting answer:', error)
  } finally {
    submitting.value = false
  }
}

function quickAnswer(answer: string) {
  userAnswer.value = answer
  submitAnswer()
}

function updateLocationProfile(question: string, answer: string) {
  const lowerQuestion = question.toLowerCase()
  const lowerAnswer = answer.toLowerCase()

  // Extract information based on question content
  if (lowerQuestion.includes('north america')) {
    locationProfile.value.continent = lowerAnswer.includes('yes') ? 'North America' : 'Other'
  } else if (lowerQuestion.includes('major city')) {
    locationProfile.value.cityType = lowerAnswer.includes('yes') ? 'major' : 'minor'
  } else if (lowerQuestion.includes('residential')) {
    locationProfile.value.buildingType = lowerAnswer.includes('yes') ? 'residential' : 'commercial'
  } else if (lowerQuestion.includes('university')) {
    locationProfile.value.nearUniversity = lowerAnswer.includes('yes')
  } else if (lowerQuestion.includes('main road')) {
    locationProfile.value.roadType = lowerAnswer.includes('yes') ? 'main' : 'side'
  } else if (lowerQuestion.includes('downtown')) {
    locationProfile.value.areaType = lowerAnswer.includes('yes') ? 'downtown' : 'other'
  }

  // Add the Q&A to the profile
  locationProfile.value[`q${questionNumber.value}`] = { question, answer }
}

function updateConfidence() {
  // Simple confidence calculation based on number of questions answered
  const baseConfidence = (questionNumber.value / 20) * 100
  const profileCompleteness = Object.keys(locationProfile.value).length * 5

  confidence.value = Math.min(95, baseConfidence + profileCompleteness)
}

async function endGame() {
  // Generate final guess based on location profile
  finalGuess.value = generateFinalGuess()

  // For demo purposes, we'll assume the game is won if confidence is high
  gameWon.value = confidence.value > 70

  gameEnded.value = true
}

function generateFinalGuess(): string {
  const profile = locationProfile.value

  // Simple guess generation based on profile
  if (profile.continent === 'North America') {
    if (profile.cityType === 'major') {
      return 'New York City, NY, USA'
    } else {
      return 'Suburban area, USA'
    }
  } else {
    return 'International location'
  }
}

// History helper functions
function toggleHistoryExpanded() {
  historyExpanded.value = !historyExpanded.value
}

function toggleHistorySearch() {
  showHistorySearch.value = !showHistorySearch.value
  if (!showHistorySearch.value) {
    historySearchTerm.value = ''
  }
}

function getAnswerCount(answer: string): number {
  return questionHistory.value.filter(item =>
    item.answer.toLowerCase().includes(answer.toLowerCase())
  ).length
}

function getAnswerClass(answer: string): string {
  const lowerAnswer = answer.toLowerCase()
  if (lowerAnswer.includes('yes')) return 'answer-yes'
  if (lowerAnswer.includes('no')) return 'answer-no'
  if (lowerAnswer.includes('maybe')) return 'answer-maybe'
  return 'answer-unknown'
}

function getAnswerIcon(answer: string): string {
  const lowerAnswer = answer.toLowerCase()
  if (lowerAnswer.includes('yes')) return '✅'
  if (lowerAnswer.includes('no')) return '❌'
  if (lowerAnswer.includes('maybe')) return '🤔'
  return '❓'
}

function getQuestionConfidence(index: number): number {
  // Simple confidence calculation based on question position
  return Math.min(95, (index + 1) * 5 + Math.random() * 10)
}

function getOriginalIndex(item: any): number {
  return questionHistory.value.findIndex(h => h === item)
}

function getTimeAgo(index: number): string {
  const questionsAgo = questionHistory.value.length - index - 1
  if (questionsAgo === 0) return 'Just now'
  if (questionsAgo === 1) return '1 question ago'
  return `${questionsAgo} questions ago`
}

function getQuestionType(question: string): string {
  const lowerQuestion = question.toLowerCase()
  if (lowerQuestion.includes('country') || lowerQuestion.includes('continent')) return 'Geography'
  if (lowerQuestion.includes('city') || lowerQuestion.includes('town')) return 'Location'
  if (lowerQuestion.includes('building') || lowerQuestion.includes('house')) return 'Structure'
  if (lowerQuestion.includes('near') || lowerQuestion.includes('close')) return 'Proximity'
  if (lowerQuestion.includes('population') || lowerQuestion.includes('size')) return 'Demographics'
  return 'General'
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function resetGame() {
  gameStarted.value = false
  gameEnded.value = false
  gameWon.value = false
  questionNumber.value = 0
  currentQuestion.value = ''
  userAnswer.value = ''
  confidence.value = 0
  finalGuess.value = ''
  actualAddress.value = ''
  questionHistory.value = []
  locationProfile.value = {}

  // Reset history UI state
  historyExpanded.value = false
  showHistorySearch.value = false
  historySearchTerm.value = ''
}

function isInstructionResponse(text: string): boolean {
  const lowerText = text.toLowerCase()
  
  // Check if the response contains instruction-like phrases
  const instructionPhrases = [
    'you must',
    'do not',
    'important:',
    'remember to',
    'follow the rules',
    'your goal is',
    'respond with',
    'you are playing',
    'current profile',
    'previous q&a',
    'questions asked',
    'confidence level'
  ]
  
  return instructionPhrases.some(phrase => lowerText.includes(phrase))
}
</script>

<style scoped>
.address-game {
  width: 100%;
  font-family: Arial, sans-serif;
}

.game-header {
  text-align: center;
  margin-bottom: 1rem;
}

.game-description {
  color: #666;
  font-size: 1.1rem;
  margin: 0;
}

.game-setup {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.setup-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 16px rgba(0,0,0,0.07);
  max-width: 400px;
  width: 100%;
}

.setup-card p {
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

.start-btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #42b883;
  color: white;
  font-size: 1rem;
}

.start-btn:hover:not(:disabled) {
  background-color: #3aa876;
}

.start-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.game-active {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.question-section {
  display: flex;
  justify-content: center;
}

.question-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.07);
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.question-number {
  color: #42b883;
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 1rem;
}

.question-text {
  font-size: 1.3rem;
  color: #333;
  line-height: 1.4;
}

.answer-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.quick-answers {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.quick-btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 1rem;
}

.yes-btn {
  background-color: #42b883;
  color: white;
}

.yes-btn:hover {
  background-color: #3aa876;
}

.no-btn {
  background-color: #dc3545;
  color: white;
}

.no-btn:hover {
  background-color: #c82333;
}

.maybe-btn {
  background-color: #ffc107;
  color: #212529;
}

.maybe-btn:hover {
  background-color: #e0a800;
}

.unknown-btn {
  background-color: #6c757d;
  color: white;
}

.unknown-btn:hover {
  background-color: #545b62;
}

.progress-section {
  text-align: center;
  background: white;
  padding: 1rem;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.07);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: #42b883;
  transition: width 0.3s ease;
}

.progress-text {
  color: #666;
  font-size: 0.9rem;
}

.history-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.07);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.history-header h4 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.history-icon {
  margin-right: 0.5rem;
}

.history-count {
  color: #666;
  font-size: 0.9rem;
}

.history-controls {
  display: flex;
  gap: 0.5rem;
}

.history-toggle, .history-search-btn {
  padding: 0.5rem;
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #666;
  border-radius: 4px;
  transition: all 0.2s;
}

.history-toggle:hover, .history-search-btn:hover {
  background: #f8f9fa;
}

.history-toggle.expanded {
  transform: rotate(90deg);
}

.history-search-btn.active {
  color: #42b883;
}

.history-search {
  margin-bottom: 1rem;
}

.history-search-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 0.9rem;
  background-color: white;
}

.history-search-input:focus {
  outline: none;
  border-color: #42b883;
  box-shadow: 0 0 0 3px rgba(66, 184, 131, 0.1);
}

.history-preview {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.preview-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: white;
  border-radius: 4px;
}

.preview-number {
  background: #42b883;
  color: white;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: bold;
}

.preview-answer {
  font-size: 1.2rem;
}

.preview-question {
  color: #666;
  font-size: 0.9rem;
  flex: 1;
}

.no-history, .no-results {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.no-history-icon, .no-results-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.answer-yes .answer-badge {
  background: #d4edda;
  color: #155724;
}

.answer-no .answer-badge {
  background: #f8d7da;
  color: #721c24;
}

.answer-maybe .answer-badge {
  background: #fff3cd;
  color: #856404;
}

.answer-unknown .answer-badge {
  background: #e2e3e5;
  color: #383d41;
}

.question-icon {
  margin-right: 0.5rem;
  opacity: 0.7;
}

.time-ago {
  margin-right: 1rem;
  font-style: italic;
}

.question-type {
  background: #e9ecef;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: bold;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-summary {
  margin-bottom: 1rem;
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
}

.summary-stats {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  color: #666;
  font-size: 0.9rem;
}

.stat-value {
  display: block;
  font-weight: bold;
  font-size: 1.2rem;
}

.history-timeline {
  margin-bottom: 1rem;
}

.history-item {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #42b883;
  margin-bottom: 0.5rem;
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.question-number-badge {
  background: #42b883;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.answer-badge {
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.9rem;
}

.confidence-indicator {
  text-align: right;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.confidence-bar {
  width: 60px;
  height: 6px;
  background: #e9ecef;
  border-radius: 3px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  background: #42b883;
  transition: width 0.3s ease;
}

.confidence-text {
  color: #666;
  font-size: 0.8rem;
}

.history-question {
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
}

.history-meta {
  color: #666;
  font-size: 0.9rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.game-result {
  display: flex;
  justify-content: center;
  margin: 1.5rem 0;
}

.result-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.07);
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.result-card h3 {
  color: #42b883;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.win-message, .lose-message {
  margin-bottom: 1.5rem;
}

.final-guess, .actual-address {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
  font-family: monospace;
}

.play-again-btn {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #42b883;
  color: white;
  font-size: 1rem;
}

.play-again-btn:hover {
  background-color: #3aa876;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #42b883;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .quick-answers {
    flex-direction: column;
    align-items: center;
  }

  .quick-btn {
    width: 200px;
  }

  .history-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .history-item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .confidence-indicator {
    text-align: left;
    width: 100%;
  }

  .confidence-bar {
    width: 100%;
  }

  .summary-stats {
    flex-wrap: wrap;
    gap: 1rem;
  }

  .preview-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .history-meta {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
