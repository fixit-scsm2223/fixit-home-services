import { defineStore } from 'pinia'
import { bookingApi } from '@/services/api'

export const useBookingStore = defineStore('booking', {
  state: () => ({
    bookings:  [],
    activeJob: null,
    reviews:   [],
    loading:   false,
    error:     null,
  }),

  getters: {
    upcomingBookings:        (s) => s.bookings.filter((b) =>
      ['requested', 'accepted', 'en_route', 'in_progress', 'completed', 'cost_pending'].includes(b.status) ||
      (b.status === 'closed' && b.payment_status !== 'paid')
    ),
    pastBookings:            (s) => s.bookings.filter((b) =>
      b.status === 'reviewed' || b.status === 'cancelled' ||
      (b.status === 'closed' && b.payment_status === 'paid')
    ),
    pendingCostConfirmations:(s) => s.bookings.filter((b) => b.status === 'cost_pending'),
    // Only closed+paid jobs need a review — 'reviewed' jobs are already fully complete
    pendingReviews:          (s) => s.bookings.filter((b) => b.status === 'closed' && b.payment_status === 'paid'),
    pendingPayments:         (s) => s.bookings.filter((b) => b.status === 'closed' && b.payment_status !== 'paid'),
    recurringSeries:         (s) => s.bookings.filter((b) => b.is_recurring && !b.parent_job_id),
    activeBookingsCount:     (s) => s.upcomingBookings.length,
    completedJobsCount:      (s) => s.bookings.filter((b) => ['cost_pending', 'closed', 'reviewed'].includes(b.status)).length,
    pendingBalance:          (s) => s.bookings
      .filter((b) => b.status === 'cost_pending')
      .reduce((sum, b) => sum + Number(b.final_cost ?? b.estimated_cost ?? 0), 0),
  },

  actions: {
    async loadBookings() {
      this.loading = true
      this.error   = null
      try {
        const res      = await bookingApi.getBookings()
        this.bookings  = res.data || []
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async loadJob(id) {
      this.loading   = true
      this.error     = null
      this.activeJob = null
      try {
        const res  = await bookingApi.getJob(id)
        const job  = res.data || null
        this.activeJob = job
        if (!job) {
          this.error = 'Booking not found'
          return
        }
        // Backfill bookings[] so the list cards also reflect the fresh status
        const idx = this.bookings.findIndex((b) => b.id === Number(id))
        if (idx !== -1) this.bookings.splice(idx, 1, job)
        else this.bookings.push(job)
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async loadReviews() {
      this.loading = true
      this.error   = null
      try {
        const res    = await bookingApi.getReviews()
        this.reviews = res.data || []
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },

    async createBooking(payload) {
      this.loading = true
      this.error   = null
      try {
        const res = await bookingApi.createBooking(payload)
        const created = res.data
        // Optimistically append so the list updates without a full reload
        if (created) this.bookings.push(created)
        return created
      } catch (e) {
        this.error = e.message
        throw e
      } finally {
        this.loading = false
      }
    },

    async confirmJobCost(id) {
      this.error = null
      try {
        const res     = await bookingApi.confirmJobCost(id)
        const updated = res?.data || null
        const idx     = this.bookings.findIndex((b) => b.id === Number(id))
        if (updated) {
          if (idx !== -1) this.bookings.splice(idx, 1, updated)
          if (this.activeJob?.id === Number(id)) this.activeJob = { ...updated }
        } else {
          // Fallback optimistic update if API didn't return body
          if (idx !== -1) this.bookings[idx].status = 'closed'
          if (this.activeJob?.id === Number(id)) this.activeJob.status = 'closed'
        }
      } catch (e) {
        this.error = e.message
        throw e
      }
    },

    async submitReview(jobId, { rating, comment, tipAmount }) {
      this.error = null
      try {
        await bookingApi.submitReview(jobId, { rating, comment, tip_amount: tipAmount || null })
        const job = this.bookings.find((b) => b.id === Number(jobId))
        if (job) {
          job.status   = 'reviewed'
          job.reviewed = true
          job.tip_amount = tipAmount || null
        }
        if (this.activeJob?.id === Number(jobId)) {
          this.activeJob.status     = 'reviewed'
          this.activeJob.reviewed   = true
          this.activeJob.tip_amount = tipAmount || null
        }
      } catch (e) {
        this.error = e.message
        throw e
      }
    },

    async cancelBooking(id) {
      this.error = null
      try {
        await bookingApi.cancelBooking(id)
        const job = this.bookings.find((b) => b.id === Number(id))
        if (job) job.status = 'cancelled'
        if (this.activeJob?.id === Number(id)) this.activeJob.status = 'cancelled'
      } catch (e) {
        this.error = e.message
        throw e
      }
    },

    async cancelRecurringSeries(parentId) {
      this.error = null
      try {
        await bookingApi.cancelRecurringSeries(parentId)
        this.bookings
          .filter((b) => b.id === Number(parentId) || b.parent_job_id === Number(parentId))
          .forEach((b) => {
            if (['requested', 'accepted'].includes(b.status)) b.status = 'cancelled'
          })
      } catch (e) {
        this.error = e.message
        throw e
      }
    },

    // Called by JobTicketPanel after Stripe confirms payment
    markPaid(jobId) {
      const job = this.bookings.find((b) => b.id === Number(jobId))
      if (job) {
        job.status         = 'closed'
        job.payment_status = 'paid'
      }
      if (this.activeJob?.id === Number(jobId)) {
        this.activeJob.status         = 'closed'
        this.activeJob.payment_status = 'paid'
      }
    },
  },
})
