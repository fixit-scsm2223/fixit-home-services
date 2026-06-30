<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import BookingCard from '@/components/BookingCard.vue'
import JobTicketPanel from '@/components/JobTicketPanel.vue'
import SidePanelDrawer from '@/components/SidePanelDrawer.vue'

const router = useRouter()
const bookingStore = useBookingStore()

const tab = ref('upcoming')

function refresh() {
  bookingStore.loadBookings()
}

onMounted(refresh)
onActivated(refresh)   // fires when navigating back to this page via <KeepAlive>

const visibleBookings = computed(() =>
  tab.value === 'upcoming' ? bookingStore.upcomingBookings : bookingStore.pastBookings
)

const needsAttentionCount = computed(
  () => bookingStore.pendingCostConfirmations.length + bookingStore.pendingReviews.length + bookingStore.pendingPayments.length
)

// Right-side ticket drawer — view tickets inline instead of navigating away.
const selectedBookingId = ref(null)

function viewTicket(booking) {
  selectedBookingId.value = booking.id
}

function closeTicket() {
  selectedBookingId.value = null
}
</script>

<template>
  <div class="my-bookings-view">
    <div v-if="needsAttentionCount > 0" class="attention-banner">
      ⚠️ You have {{ needsAttentionCount }} booking{{ needsAttentionCount > 1 ? 's' : '' }} needing your attention — payment due, cost confirmation, or review pending.
    </div>

    <div class="chip-row tabs">
      <button class="btn-chip" :class="{ active: tab === 'upcoming' }" @click="tab = 'upcoming'">
        Upcoming ({{ bookingStore.upcomingBookings.length }})
      </button>
      <button class="btn-chip" :class="{ active: tab === 'past' }" @click="tab = 'past'">
        Past ({{ bookingStore.pastBookings.length }})
      </button>
    </div>

    <div v-if="bookingStore.loading" class="muted">Loading bookings…</div>

    <div v-else-if="!visibleBookings.length" class="empty-state">
      <p class="muted">{{ tab === 'upcoming' ? 'No upcoming bookings yet.' : 'No past bookings yet.' }}</p>
      <button v-if="tab === 'upcoming'" class="btn-ui btn-ui-primary" @click="router.push({ name: 'providers' })">
        Browse providers
      </button>
    </div>

    <div v-else class="bookings-list">
      <BookingCard v-for="b in visibleBookings" :key="b.id" :booking="b" @view="viewTicket" />
    </div>

    <SidePanelDrawer
      :open="!!selectedBookingId"
      :initial-width="1180"
      :max-width="1280"
      panel-class="ticket-drawer"
      @close="closeTicket"
    >
      <JobTicketPanel :id="selectedBookingId" @close="closeTicket" />
    </SidePanelDrawer>
  </div>
</template>

<style scoped>
.my-bookings-view { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.attention-banner {
  background: rgba(245, 158, 11, 0.12);
  border: 2px solid var(--color-warning);
  color: var(--color-text);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 0.88rem;
  font-weight: 600;
}
.tabs { margin-bottom: 0; }
.btn-chip.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.bookings-list { display: flex; flex-direction: column; gap: var(--spacing-sm); }
.empty-state {
  display: flex; flex-direction: column; align-items: flex-start; gap: 12px;
  padding: var(--spacing-xl) var(--spacing-lg);
  background: var(--color-card);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

</style>
