<script setup>
import { computed, ref } from 'vue'
import { useProviderStore } from '@/stores/provider'

const store = useProviderStore()

const showWithdrawModal = ref(false)
const withdrawalAmount = ref('')
const withdrawalMethod = ref('bank')
const accountHolder = ref(store.profile.name || '')
const accountNumber = ref('')
const withdrawalNote = ref('')
const withdrawalError = ref('')
const withdrawalHistory = ref([])

const search = ref('')
const statusFilter = ref('all')
const serviceFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const sortBy = ref('newest')

function formatMoney(value) {
  return `RM ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(iso) {
  if (!iso) return 'Not dated'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function transactionStatus(job) {
  if (job.status === 'cost_pending') return 'In Escrow'
  if (job.status === 'completed') return 'In Escrow'
  if (['closed', 'reviewed'].includes(job.status)) return 'Cleared'
  return 'Cleared'
}

function statusClass(status) {
  if (status === 'Cleared') return 'status-pill-green'
  if (status === 'In Escrow' || status === 'Pending Withdrawal') return 'status-pill-amber'
  if (status === 'Withdrawn') return 'status-pill-blue'
  return 'status-pill-amber'
}

const transactions = computed(() =>
  store.jobs
    .filter((job) => Number(job.finalCost || 0) > 0)
    .map((job) => {
      const gross = Number(job.finalCost || 0)
      const platformFee = Number(job.platformFee || 0)
      return {
        id: job.id,
        ticketRef: job.ticketRef || `FX-${String(job.id).padStart(4, '0')}`,
        date: job.timestamps?.closed || job.timestamps?.cost_pending || job.scheduledAt,
        service: job.service || 'Service',
        customer: job.customerName || 'Customer',
        gross,
        platformFee,
        net: gross - platformFee,
        status: transactionStatus(job),
      }
    }),
)

const completedJobsCount = computed(() =>
  store.jobs.filter((job) => ['completed', 'cost_pending', 'closed', 'reviewed'].includes(job.status)).length,
)

const thisMonthEarnings = computed(() => {
  const now = new Date()
  return transactions.value
    .filter((tx) => {
      const date = new Date(tx.date)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    })
    .reduce((sum, tx) => sum + tx.net, 0)
})

const summaryCards = computed(() => [
  { label: 'Withdrawable Balance', value: formatMoney(store.earnings.withdrawable), tone: 'green' },
  { label: "This Month's Earnings", value: formatMoney(thisMonthEarnings.value), tone: 'teal' },
  { label: 'Completed Jobs Count', value: completedJobsCount.value, tone: 'violet' },
])

const serviceOptions = computed(() => {
  const services = new Set(transactions.value.map((tx) => tx.service).filter(Boolean))
  return ['all', ...Array.from(services).sort()]
})

const filteredTransactions = computed(() => {
  const query = search.value.trim().toLowerCase()
  let results = [...transactions.value]

  if (query) {
    results = results.filter((tx) =>
      [tx.ticketRef, tx.id, tx.customer, tx.service].join(' ').toLowerCase().includes(query),
    )
  }

  if (statusFilter.value !== 'all') {
    results = results.filter((tx) => tx.status === statusFilter.value)
  }

  if (serviceFilter.value !== 'all') {
    results = results.filter((tx) => tx.service === serviceFilter.value)
  }

  if (dateFrom.value) {
    const from = new Date(`${dateFrom.value}T00:00:00`)
    results = results.filter((tx) => new Date(tx.date) >= from)
  }

  if (dateTo.value) {
    const to = new Date(`${dateTo.value}T23:59:59`)
    results = results.filter((tx) => new Date(tx.date) <= to)
  }

  results.sort((a, b) => {
    if (sortBy.value === 'oldest') return new Date(a.date) - new Date(b.date)
    if (sortBy.value === 'highest') return b.net - a.net
    if (sortBy.value === 'lowest') return a.net - b.net
    return new Date(b.date) - new Date(a.date)
  })

  return results
})

function clearFilters() {
  search.value = ''
  statusFilter.value = 'all'
  serviceFilter.value = 'all'
  dateFrom.value = ''
  dateTo.value = ''
  sortBy.value = 'newest'
}

function openWithdrawalModal() {
  withdrawalAmount.value = ''
  withdrawalMethod.value = 'bank'
  accountHolder.value = store.profile.name || ''
  accountNumber.value = ''
  withdrawalNote.value = ''
  withdrawalError.value = ''
  showWithdrawModal.value = true
}

function submitWithdrawal() {
  const amount = Number(withdrawalAmount.value)
  if (!Number.isFinite(amount) || amount <= 0) {
    withdrawalError.value = 'Amount must be positive.'
    return
  }
  if (amount < 10) {
    withdrawalError.value = 'Minimum withdrawal amount is RM 10.00.'
    return
  }
  if (amount > Number(store.earnings.withdrawable || 0)) {
    withdrawalError.value = 'Amount cannot exceed withdrawable balance.'
    return
  }
  if (!accountHolder.value.trim() || !accountNumber.value.trim()) {
    withdrawalError.value = 'Account holder name and account number are required.'
    return
  }

  withdrawalHistory.value.unshift({
    id: `WD-${Date.now()}`,
    date: new Date().toISOString(),
    amount,
    method: withdrawalMethod.value === 'bank' ? 'Bank transfer' : 'E-wallet',
    accountHolder: accountHolder.value.trim(),
    status: 'Pending Withdrawal',
    note: withdrawalNote.value.trim(),
  })
  showWithdrawModal.value = false
  store.showToast('Withdrawal request submitted.')
}
</script>

<template>
  <div class="provider-earnings-page">
    <section class="card earnings-hero-card">
      <div>
        <span>EARNINGS</span>
        <h3>Provider Earnings</h3>
        <p>Track mock balances, completed job payments, and withdrawal requests.</p>
      </div>
      <button class="btn btn-primary" type="button" @click="openWithdrawalModal">
        Request Withdrawal
      </button>
    </section>

    <section class="earnings-summary-grid">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="earnings-summary-card"
        :class="card.tone"
      >
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </section>

    <section class="card earnings-filter-card">
      <div class="earnings-section-head">
        <div>
          <span>TRANSACTIONS</span>
          <h3>Recent Transactions</h3>
        </div>
        <strong>{{ filteredTransactions.length }} results</strong>
      </div>

      <div class="earnings-filter-grid">
        <label class="form-group earnings-search">
          <span>Search</span>
          <input v-model.trim="search" class="form-control" placeholder="Search by Job ID, customer, or service" />
        </label>
        <label class="form-group">
          <span>From</span>
          <input v-model="dateFrom" class="form-control" type="date" />
        </label>
        <label class="form-group">
          <span>To</span>
          <input v-model="dateTo" class="form-control" type="date" />
        </label>
        <label class="form-group">
          <span>Status</span>
          <select v-model="statusFilter" class="form-control">
            <option value="all">All statuses</option>
            <option>Cleared</option>
            <option>In Escrow</option>
            <option>Pending Withdrawal</option>
            <option>Withdrawn</option>
          </select>
        </label>
        <label class="form-group">
          <span>Service</span>
          <select v-model="serviceFilter" class="form-control">
            <option v-for="service in serviceOptions" :key="service" :value="service">
              {{ service === 'all' ? 'All categories' : service }}
            </option>
          </select>
        </label>
        <label class="form-group">
          <span>Sort</span>
          <select v-model="sortBy" class="form-control">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </select>
        </label>
      </div>

      <button class="btn btn-outline btn-sm earnings-clear-button" type="button" @click="clearFilters">
        Clear Filters
      </button>
    </section>

    <section class="card transactions-card">
      <div class="table-frame">
        <table class="data-table earnings-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Job ID</th>
              <th>Service</th>
              <th>Customer</th>
              <th>Gross Amount</th>
              <th>Platform Fee</th>
              <th>Net Earnings</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filteredTransactions.length">
              <td colspan="8">
                <div class="earnings-empty-state compact">
                  <strong>No transactions found</strong>
                  <span>Completed job payments matching these filters will appear here.</span>
                </div>
              </td>
            </tr>
            <tr v-for="tx in filteredTransactions" :key="tx.id">
              <td><small>{{ formatDate(tx.date) }}</small></td>
              <td><strong>#{{ tx.ticketRef }}</strong></td>
              <td>{{ tx.service }}</td>
              <td>{{ tx.customer }}</td>
              <td>{{ formatMoney(tx.gross) }}</td>
              <td>{{ formatMoney(tx.platformFee) }}</td>
              <td><strong class="text-success">{{ formatMoney(tx.net) }}</strong></td>
              <td><span class="status-pill" :class="statusClass(tx.status)">{{ tx.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card withdrawal-history-card">
      <div class="earnings-section-head">
        <div>
          <span>WITHDRAWALS</span>
          <h3>Withdrawal History</h3>
        </div>
      </div>

      <div v-if="!withdrawalHistory.length" class="earnings-empty-state compact">
        <strong>No withdrawal requests yet</strong>
        <span>Mock withdrawal requests submitted here will appear in this history.</span>
      </div>

      <div v-else class="withdrawal-history-list">
        <div v-for="request in withdrawalHistory" :key="request.id">
          <div>
            <strong>{{ request.id }}</strong>
            <small>{{ formatDate(request.date) }} · {{ request.method }}</small>
          </div>
          <span>{{ formatMoney(request.amount) }}</span>
          <span class="status-pill" :class="statusClass(request.status)">{{ request.status }}</span>
        </div>
      </div>
    </section>

    <div v-if="showWithdrawModal" class="earnings-modal-backdrop" @click.self="showWithdrawModal = false">
      <article class="earnings-modal">
        <header class="earnings-modal-head">
          <div>
            <span>WITHDRAWAL REQUEST</span>
            <h3>Request Withdrawal</h3>
            <p>Available balance: {{ formatMoney(store.earnings.withdrawable) }}</p>
          </div>
          <button class="earnings-modal-close" type="button" @click="showWithdrawModal = false">×</button>
        </header>

        <div class="earnings-modal-body">
          <div class="withdrawal-balance-card">
            <span>Minimum withdrawal</span>
            <strong>RM 10.00</strong>
          </div>

          <label class="form-group">
            <span>Withdrawal amount (RM)</span>
            <input v-model="withdrawalAmount" class="form-control" min="0" step="0.01" type="number" />
          </label>

          <label class="form-group">
            <span>Mock withdrawal method</span>
            <select v-model="withdrawalMethod" class="form-control">
              <option value="bank">Bank transfer</option>
              <option value="wallet">E-wallet</option>
            </select>
          </label>

          <label class="form-group">
            <span>Account holder name</span>
            <input v-model.trim="accountHolder" class="form-control" />
          </label>

          <label class="form-group">
            <span>Bank or e-wallet account number</span>
            <input v-model.trim="accountNumber" class="form-control" />
          </label>

          <label class="form-group">
            <span>Optional note</span>
            <textarea v-model="withdrawalNote" class="form-control" rows="3"></textarea>
          </label>

          <p v-if="withdrawalError" class="withdrawal-error">{{ withdrawalError }}</p>
        </div>

        <footer class="earnings-modal-actions">
          <button class="btn btn-outline" type="button" @click="showWithdrawModal = false">Cancel</button>
          <button class="btn btn-primary" type="button" @click="submitWithdrawal">Submit Withdrawal Request</button>
        </footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.provider-earnings-page {
  display: grid;
  gap: 18px;
}

.earnings-hero-card,
.earnings-section-head,
.earnings-modal-head,
.earnings-modal-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.earnings-hero-card {
  margin: 0;
}

.earnings-hero-card span,
.earnings-section-head span,
.earnings-filter-grid .form-group > span,
.earnings-modal-head span,
.earnings-modal-body .form-group > span,
.withdrawal-balance-card span {
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.earnings-hero-card h3,
.earnings-section-head h3,
.earnings-modal-head h3 {
  margin-top: 5px;
  font-size: 1.12rem;
}

.earnings-hero-card p,
.earnings-modal-head p,
.earnings-empty-state span,
.withdrawal-history-list small {
  color: var(--color-muted);
  font-size: 0.8rem;
}

.earnings-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.earnings-summary-card {
  --summary-accent: var(--color-primary);
  display: grid;
  gap: 7px;
  min-height: 92px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--summary-accent);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
}

.earnings-summary-card.green { --summary-accent: var(--color-success); }
.earnings-summary-card.orange { --summary-accent: var(--color-warning); }
.earnings-summary-card.blue { --summary-accent: var(--color-primary); }
.earnings-summary-card.teal { --summary-accent: var(--color-secondary); }
.earnings-summary-card.violet { --summary-accent: #8b5cf6; }

.earnings-summary-card span {
  color: var(--color-muted);
  font-size: 0.74rem;
  font-weight: 850;
}

.earnings-summary-card strong {
  overflow-wrap: anywhere;
  font-size: 1.34rem;
}

.earnings-filter-card,
.transactions-card,
.withdrawal-history-card {
  margin: 0;
}

.earnings-section-head {
  margin-bottom: 16px;
}

.earnings-section-head > strong {
  flex: 0 0 auto;
  padding: 8px 11px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-primary);
  font-size: 0.78rem;
}

.earnings-filter-grid {
  display: grid;
  grid-template-columns: minmax(230px, 1.25fr) repeat(5, minmax(140px, 1fr));
  gap: 12px;
}

.earnings-filter-grid .form-group {
  margin: 0;
}

.earnings-filter-grid .form-group > span {
  display: block;
  margin-bottom: 6px;
}

.earnings-clear-button {
  margin-top: 14px;
}

.earnings-table {
  min-width: 980px;
}

.earnings-empty-state {
  display: grid;
  min-height: 180px;
  place-items: center;
  align-content: center;
  gap: 6px;
  padding: 22px;
  text-align: center;
}

.earnings-empty-state.compact {
  min-height: 120px;
}

.withdrawal-history-list {
  display: grid;
  gap: 10px;
}

.withdrawal-history-list > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.withdrawal-history-list > div > div {
  display: grid;
  gap: 4px;
}

.earnings-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(4px);
}

.earnings-modal {
  display: flex;
  width: min(620px, 100%);
  max-height: calc(100vh - 36px);
  overflow: hidden;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-lg);
}

.earnings-modal-head,
.earnings-modal-actions {
  flex: 0 0 auto;
  padding: 20px 22px;
  border-bottom: 1px solid var(--color-border);
}

.earnings-modal-actions {
  justify-content: flex-end;
  border-top: 1px solid var(--color-border);
  border-bottom: 0;
}

.earnings-modal-body {
  display: grid;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 22px;
}

.earnings-modal-body .form-group {
  margin: 0;
}

.earnings-modal-body .form-group > span {
  display: block;
  margin-bottom: 6px;
}

.earnings-modal-close {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  cursor: pointer;
  border: 0;
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-muted);
  font-size: 1.2rem;
}

.withdrawal-balance-card {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.withdrawal-error {
  color: var(--color-danger);
  font-size: 0.82rem;
  font-weight: 750;
}

@media (max-width: 1180px) {
  .earnings-summary-grid,
  .earnings-filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .earnings-search {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .earnings-summary-grid,
  .earnings-filter-grid,
  .withdrawal-history-list > div {
    grid-template-columns: 1fr;
  }

  .earnings-hero-card,
  .earnings-section-head,
  .earnings-modal-head,
  .earnings-modal-actions {
    flex-direction: column;
  }

  .earnings-modal-actions .btn {
    width: 100%;
  }
}
</style>
