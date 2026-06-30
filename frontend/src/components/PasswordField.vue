<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  autocomplete: { type: String, default: 'current-password' },
  placeholder: { type: String, default: '' },
  required: { type: Boolean, default: false },
  minlength: { type: [Number, String], default: null },
  error: { type: String, default: '' },
  inputClass: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])
const visible = ref(false)
const inputType = computed(() => (visible.value ? 'text' : 'password'))
</script>

<template>
  <label class="field password-field-shell" :class="{ invalid: error }">
    <span>{{ label }}</span>
    <span class="password-input-wrap">
      <input
        :class="inputClass"
        :value="modelValue"
        :type="inputType"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :required="required"
        :minlength="minlength || undefined"
        @input="emit('update:modelValue', $event.target.value)"
      />
      <button
        class="password-toggle"
        type="button"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        @click="visible = !visible"
      >
        <span aria-hidden="true">{{ visible ? 'Hide' : 'Show' }}</span>
      </button>
    </span>
    <small v-if="error" class="field-error">{{ error }}</small>
  </label>
</template>

<style scoped>
.password-field-shell {
  position: relative;
}

.password-input-wrap {
  position: relative;
  display: block;
}

.password-input-wrap input {
  padding-right: 74px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 54px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--color-border, var(--border, #dbe4f0));
  border-radius: 9px;
  background: var(--color-card, var(--surface, #fff));
  color: var(--color-muted, var(--muted, #64748b));
  font: inherit;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  transform: translateY(-50%);
}

.password-toggle:hover {
  border-color: var(--color-primary, var(--blue, #2563eb));
  color: var(--color-primary, var(--blue, #2563eb));
}
</style>
