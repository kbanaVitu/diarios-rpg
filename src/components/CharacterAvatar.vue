<template>
  <div :class="['portrait-frame', sizeClass]" :title="name">
    <img
      v-if="avatarUrl && !imageBroken"
      :src="avatarUrl"
      :alt="`Retrato de ${name}`"
      @error="imageBroken = true"
    />
    <div v-else class="portrait-placeholder" aria-label="Brasão padrão do personagem">
      <span>{{ initials }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  name: {
    type: String,
    default: 'Herói'
  },
  avatarUrl: {
    type: String,
    default: null
  },
  size: {
    type: String,
    default: 'md' // sm | md | xl
  }
});

const imageBroken = ref(false);

watch(
  () => props.avatarUrl,
  () => {
    imageBroken.value = false;
  }
);

const sizeClass = computed(() => `portrait-${props.size}`);

const initials = computed(() => {
  const clean = (props.name || 'H').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
});
</script>
