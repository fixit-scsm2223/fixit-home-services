<script setup>
import { ref } from 'vue'
import { useProviderStore } from '@/stores/provider'

const store = useProviderStore()
const selectedFile = ref(null)
const dragActive = ref(false)

function handleFilePick(event) {
  const file = event.target.files[0]
  if (file) selectedFile.value = file
}

function handleDrop(event) {
  event.preventDefault()
  dragActive.value = false
  const file = event.dataTransfer.files[0]
  if (file) selectedFile.value = file
}

function uploadKyc() {
  if (!selectedFile.value) return
  store.submitKyc(selectedFile.value)
  selectedFile.value = null
}
</script>

<template>
  <div style="max-width:600px;">
    <!-- Status banner -->
    <div
      v-if="store.kyc.status !== 'pending'"
      class="card"
      style="margin-bottom:20px;"
    >
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong>KYC Document</strong>
          <p class="muted" style="font-size:0.78rem; margin-top:2px;">{{ store.kyc.fileName }}</p>
        </div>
        <span
          class="badge"
          :class="{
            'badge-warning': store.kyc.status === 'submitted',
            'badge-success': store.kyc.status === 'verified',
            'badge-danger': store.kyc.status === 'rejected'
          }"
        >{{ store.kyc.status }}</span>
      </div>
    </div>

    <!-- Upload card -->
    <div class="card">
      <div class="card-header"><h3>Upload KYC Document</h3></div>
      <p class="muted" style="font-size:0.82rem; margin-bottom:20px;">
        Upload a valid identification document (IC, passport, or business registration) for admin verification.
      </p>

      <!-- Drop zone -->
      <div
        class="upload-zone"
        :style="{ borderColor: dragActive ? 'var(--color-primary)' : '' }"
        @dragover.prevent="dragActive = true"
        @dragleave="dragActive = false"
        @drop="handleDrop"
        @click="$refs.fileInput.click()"
      >
        <div class="upload-icon">📄</div>
        <p style="font-weight:700; margin-bottom:4px;">
          {{ selectedFile ? selectedFile.name : 'Drag & drop your document here' }}
        </p>
        <p class="muted" style="font-size:0.78rem;">
          {{ selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'or click to browse — PDF, JPG, PNG up to 5 MB' }}
        </p>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        hidden
        @change="handleFilePick"
      />

      <button
        class="btn btn-primary btn-w-full"
        style="margin-top:20px;"
        :disabled="!selectedFile"
        @click="uploadKyc"
      >
        Submit KYC Document
      </button>
    </div>

    <!-- Info box -->
    <div class="card" style="margin-top:20px;">
      <div class="card-header"><h3>Verification Process</h3></div>
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; gap:10px; align-items:flex-start;">
          <span style="font-size:1.2rem;">1️⃣</span>
          <div><strong style="font-size:0.85rem;">Upload</strong><p class="muted" style="font-size:0.78rem;">Submit your identification document.</p></div>
        </div>
        <div style="display:flex; gap:10px; align-items:flex-start;">
          <span style="font-size:1.2rem;">2️⃣</span>
          <div><strong style="font-size:0.85rem;">Review</strong><p class="muted" style="font-size:0.78rem;">Admin reviews and verifies your identity.</p></div>
        </div>
        <div style="display:flex; gap:10px; align-items:flex-start;">
          <span style="font-size:1.2rem;">3️⃣</span>
          <div><strong style="font-size:0.85rem;">Go Live</strong><p class="muted" style="font-size:0.78rem;">Once verified, you appear in the marketplace.</p></div>
        </div>
      </div>
    </div>
  </div>
</template>
