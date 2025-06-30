<template>
  <div class="spin-wheel-outer">
    <div class="spin-wheel-pointer"></div>
    <div class="spin-wheel-wrapper">
      <div ref="container" class="spin-wheel-canvas"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, defineEmits } from 'vue'
import { Wheel } from 'spin-wheel'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  spinning: Boolean
})
const emit = defineEmits(['rest', 'currentIndexChange'])

const container = ref<HTMLElement | null>(null)
let wheel: any = null

const pointerAngle = 0 // top

onMounted(() => {
  if (container.value) {
    container.value.style.width = '100%';
    container.value.style.height = '100%';
    
    wheel = new Wheel(container.value, {
      items: props.items.map(label => ({ label })),
      pointerAngle,
      radius: 0.95,
      rotationResistance: -35,
      rotation: 0,
      isInteractive: false,
      itemLabelFontSizeMax: 16,
      onRest: (event: any) => {
        emit('rest', event.currentIndex)
      },
      onCurrentIndexChange: (event: any) => {
        emit('currentIndexChange', event.currentIndex)
      }
    })
  }
})

onBeforeUnmount(() => {
  if (wheel) wheel.destroy()
})

function spin() {
  if (wheel) {
    wheel.rotationResistance = -5 // very low resistance, spins almost indefinitely
    wheel.spin(60 + Math.random() * 40) // slower speed
  }
}

function stop() {
  if (wheel) {
    wheel.rotationResistance = -300 // even higher resistance, stops 50% faster than before
  }
}

defineExpose({ spin, stop })
</script>

<style scoped>
.spin-wheel-outer {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 100%;
  max-width: 680px;
  margin: 0 auto 4rem auto;
}
.spin-wheel-pointer {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 18px solid transparent;
  border-right: 18px solid transparent;
  border-top: 18px solid #dc3545;
  z-index: 20;
}
.spin-wheel-wrapper {
  width: 100%;
  max-width: 680px;
  aspect-ratio: 1 / 1;
  background: transparent;
  position: relative;
  z-index: 10;
}
.spin-wheel-canvas {
  width: 100%;
  height: 100%;
}
</style> 