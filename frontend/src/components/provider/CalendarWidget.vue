<script setup>
import { computed, ref } from 'vue'
import { useProviderStore } from '@/stores/provider'

const props = defineProps({
  interactive: { type: Boolean, default: false },
  selectedDate: { type: String, default: '' },
  toggleOnClick: { type: Boolean, default: true },
})
const emit = defineEmits(['select-date'])

const store = useProviderStore()

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
    return
  }
  currentMonth.value--
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
    return
  }
  currentMonth.value++
}

function goToday() {
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth()
}

function dateKey(day) {
  return `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function keyFromIso(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const scheduledByDate = computed(() => {
  const map = new Map()
  store.jobs
    .filter((job) => !['rejected', 'cancelled'].includes(job.status))
    .forEach((job) => {
      const key = keyFromIso(job.scheduledAt)
      if (!key) return
      map.set(key, (map.get(key) || 0) + 1)
    })
  return map
})

const calendarCells = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  let startDay = new Date(year, month, 1).getDay()
  startDay = (startDay + 6) % 7

  const cells = []
  for (let i = 0; i < startDay; i++) cells.push({ day: null })
  for (let day = 1; day <= daysInMonth; day++) {
    const key = dateKey(day)
    cells.push({
      day,
      key,
      isToday: year === today.getFullYear() && month === today.getMonth() && day === today.getDate(),
      isReserved: store.availability.reservedDates.includes(key),
      isSelected: props.selectedDate === key,
      scheduledCount: scheduledByDate.value.get(key) || 0,
    })
  }
  return cells
})

function clickDay(cell) {
  if (!props.interactive || !cell.day) return
  emit('select-date', cell)
  if (!props.toggleOnClick) return
  if (cell.scheduledCount && !cell.isReserved) {
    store.showToast('This date has scheduled jobs. Review it before reserving.', 'warning')
    return
  }
  store.toggleReservedDate(cell.key)
}
</script>

<template>
  <div class="calendar">
    <div class="calendar-nav">
      <button class="cal-nav-btn" type="button" @click="prevMonth">‹</button>
      <div class="calendar-title">{{ monthNames[currentMonth] }} {{ currentYear }}</div>
      <div class="calendar-nav-actions">
        <button class="cal-today-btn" type="button" @click="goToday">Today</button>
        <button class="cal-nav-btn" type="button" @click="nextMonth">›</button>
      </div>
    </div>

    <div class="calendar-grid">
      <span v-for="h in ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']" :key="h" class="cal-head">{{ h }}</span>
      <span
        v-for="(cell, idx) in calendarCells"
        :key="idx"
        class="cal-day"
        :class="{
          today: cell.isToday,
          reserved: cell.isReserved && !cell.isToday,
          selected: cell.isSelected,
          scheduled: cell.scheduledCount,
          empty: !cell.day,
          interactive: props.interactive && cell.day,
        }"
        :title="cell.day ? `${cell.key}${cell.isReserved ? ' · Reserved' : ' · Available'}${cell.scheduledCount ? ` · ${cell.scheduledCount} scheduled job${cell.scheduledCount > 1 ? 's' : ''}` : ''}` : ''"
        @click="clickDay(cell)"
      >
        <span>{{ cell.day || '' }}</span>
        <small v-if="cell.scheduledCount">{{ cell.scheduledCount }}</small>
      </span>
    </div>
  </div>
</template>

<style scoped>
.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.calendar-nav-actions {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.cal-nav-btn,
.cal-today-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  cursor: pointer;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  background: var(--color-card, #fff);
  color: var(--color-text, #111);
  font: inherit;
  font-weight: 800;
  line-height: 1;
}

.cal-nav-btn {
  width: 28px;
  font-size: 1.1rem;
}

.cal-today-btn {
  padding: 0 10px;
  font-size: 0.75rem;
}

.cal-nav-btn:hover,
.cal-today-btn:hover {
  background: var(--color-background, #f3f4f6);
}

.cal-day {
  position: relative;
  display: grid;
  min-height: 38px;
  place-items: center;
}

.cal-day.interactive {
  cursor: pointer;
}

.cal-day.selected {
  outline: 2px solid var(--color-primary, #2563eb);
  outline-offset: 2px;
}

.cal-day.scheduled:not(.today) {
  border-color: rgba(20, 184, 166, 0.42);
}

.cal-day small {
  position: absolute;
  right: 4px;
  bottom: 3px;
  display: grid;
  min-width: 15px;
  height: 15px;
  place-items: center;
  border-radius: 999px;
  background: var(--color-secondary, #14b8a6);
  color: #fff;
  font-size: 0.62rem;
  line-height: 1;
}
</style>
