import { ref } from 'vue'
import { loadStripe } from '@stripe/stripe-js'
import http from '@/services/http'

// Single shared promise — resolved once, reused everywhere.
// Exported so JobTicketPanel can mount Elements from the same instance
// that confirmCardPayment will use.
let stripePromise = null
export function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  return stripePromise
}

export function usePayment() {
  const processing = ref(false)
  const payError   = ref(null)
  const succeeded  = ref(false)

  async function createIntent(jobId) {
    const data = await http.post('/payment/create-intent', { job_id: jobId })
    return data.data
  }

  async function confirmPayment(jobId, paymentIntentId) {
    return http.post('/payment/confirm', { job_id: jobId, payment_intent_id: paymentIntentId })
  }

  async function fetchPending() {
    const data = await http.get('/payment/pending-for-customer')
    return data.data ?? []
  }

  async function pay(jobId, cardElement) {
    processing.value = true
    payError.value   = null
    succeeded.value  = false

    try {
      const { client_secret } = await createIntent(jobId)
      const stripe = await getStripe()

      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: { card: cardElement },
      })

      if (result.error) {
        payError.value = result.error.message
        return false
      }

      await confirmPayment(jobId, result.paymentIntent.id)
      succeeded.value = true
      return true
    } catch (e) {
      payError.value = e.message ?? 'Payment failed. Please try again.'
      return false
    } finally {
      processing.value = false
    }
  }

  return { pay, processing, payError, succeeded, fetchPending }
}
