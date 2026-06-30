<script setup>
import { computed } from 'vue'
import { useProviderStore } from '@/stores/provider'

const store = useProviderStore()

const monthlyStats = computed(() => store.monthlyStats || [])
const maxJobs = computed(() => Math.max(1, ...monthlyStats.value.map((month) => Number(month.jobs) || 0)))
const maxEarnings = computed(() => Math.max(1, ...monthlyStats.value.map((month) => Number(month.earnings) || 0)))

const totalJobsYTD = computed(() =>
  monthlyStats.value.reduce((sum, month) => sum + (Number(month.jobs) || 0), 0),
)
const totalEarningsYTD = computed(() =>
  monthlyStats.value.reduce((sum, month) => sum + (Number(month.earnings) || 0), 0),
)
const avgJobValue = computed(() =>
  totalJobsYTD.value ? totalEarningsYTD.value / totalJobsYTD.value : 0,
)

const bestMonth = computed(() => {
  if (!monthlyStats.value.length) return null
  return monthlyStats.value.reduce((best, month) => {
    const earnings = Number(month.earnings) || 0
    const bestEarnings = Number(best.earnings) || 0
    return earnings > bestEarnings ? month : best
  }, monthlyStats.value[0])
})

const chartRows = computed(() =>
  monthlyStats.value.map((month) => {
    const jobs = Number(month.jobs) || 0
    const earnings = Number(month.earnings) || 0
    return {
      month: month.month,
      jobs,
      earnings,
      jobsHeight: `${Math.max(8, (jobs / maxJobs.value) * 210)}px`,
      earningsHeight: `${Math.max(8, (earnings / maxEarnings.value) * 210)}px`,
    }
  }),
)

const ratingLabel = computed(() => {
  const rating = Number(store.averageRating || 0)
  return rating > 0 ? rating.toFixed(1) : '0.0'
})

const conversionSummary = computed(() => [
  {
    label: 'Completed jobs',
    value: store.completedJobCount,
    caption: 'Closed tickets from your provider queue',
  },
  {
    label: 'Active jobs',
    value: store.activeJobCount,
    caption: 'Work that still needs action',
  },
  {
    label: 'Pending requests',
    value: store.pendingRequestCount,
    caption: 'New customer requests waiting',
  },
])

const insightRows = computed(() => [
  {
    label: 'Best earning month',
    value: bestMonth.value ? bestMonth.value.month : 'No data',
    caption: bestMonth.value ? `RM ${Number(bestMonth.value.earnings || 0).toLocaleString()}` : 'Complete jobs to build history',
  },
  {
    label: 'Average job value',
    value: `RM ${avgJobValue.value.toFixed(0)}`,
    caption: 'Revenue divided by completed monthly jobs',
  },
  {
    label: 'Customer rating',
    value: `${ratingLabel.value} / 5`,
    caption: store.reviews.length ? `${store.reviews.length} review records` : 'No customer reviews yet',
  },
])
</script>

<template>
  <div class="provider-analytics-page">
    <section class="analytics-hero-card">
      <div class="analytics-hero-copy">
        <span>PROVIDER ANALYTICS</span>
        <h2>Performance Overview</h2>
        <p>Track your jobs, earnings, average job value, and customer feedback across the current year.</p>
      </div>

      <div class="analytics-hero-metrics">
        <div>
          <span>YTD Earnings</span>
          <strong>RM {{ totalEarningsYTD.toLocaleString() }}</strong>
          <small>{{ totalJobsYTD }} completed monthly job records</small>
        </div>
        <div>
          <span>Average Rating</span>
          <strong>{{ ratingLabel }} / 5</strong>
          <small>Based on customer reviews</small>
        </div>
      </div>
    </section>

    <section class="analytics-kpi-grid">
      <article class="analytics-kpi-card blue">
        <span class="analytics-kpi-code">JOB</span>
        <div>
          <span>Jobs (YTD)</span>
          <strong>{{ totalJobsYTD }}</strong>
          <small>Completed service volume</small>
        </div>
      </article>

      <article class="analytics-kpi-card teal">
        <span class="analytics-kpi-code">RM</span>
        <div>
          <span>Earnings (YTD)</span>
          <strong>RM {{ totalEarningsYTD.toLocaleString() }}</strong>
          <small>Provider gross earnings</small>
        </div>
      </article>

      <article class="analytics-kpi-card orange">
        <span class="analytics-kpi-code">AVG</span>
        <div>
          <span>Avg. Job Value</span>
          <strong>RM {{ avgJobValue.toFixed(0) }}</strong>
          <small>Estimated value per job</small>
        </div>
      </article>

      <article class="analytics-kpi-card green">
        <span class="analytics-kpi-code">RTE</span>
        <div>
          <span>Avg. Rating</span>
          <strong>{{ ratingLabel }} / 5</strong>
          <small>Customer satisfaction</small>
        </div>
      </article>
    </section>

    <section class="analytics-grid">
      <article class="card analytics-chart-card">
        <div class="analytics-card-head">
          <div>
            <span>WORKLOAD</span>
            <h3>Jobs Completed</h3>
            <p>Monthly count of completed service work.</p>
          </div>
          <strong>{{ totalJobsYTD }} jobs</strong>
        </div>

        <div v-if="chartRows.length" class="analytics-bar-chart">
          <div v-for="month in chartRows" :key="`jobs-${month.month}`" class="analytics-bar-column">
            <span>{{ month.jobs }}</span>
            <div class="analytics-bar-track">
              <i class="analytics-bar blue" :style="{ height: month.jobsHeight }"></i>
            </div>
            <small>{{ month.month }}</small>
          </div>
        </div>
        <div v-else class="analytics-empty-state">
          <strong>No job analytics yet</strong>
          <span>Completed jobs will appear here after your provider activity grows.</span>
        </div>
      </article>

      <article class="card analytics-chart-card">
        <div class="analytics-card-head">
          <div>
            <span>REVENUE</span>
            <h3>Earnings Trend</h3>
            <p>Monthly earnings from completed provider jobs.</p>
          </div>
          <strong>RM {{ totalEarningsYTD.toLocaleString() }}</strong>
        </div>

        <div v-if="chartRows.length" class="analytics-bar-chart">
          <div v-for="month in chartRows" :key="`earnings-${month.month}`" class="analytics-bar-column">
            <span>RM {{ month.earnings.toLocaleString() }}</span>
            <div class="analytics-bar-track">
              <i class="analytics-bar teal" :style="{ height: month.earningsHeight }"></i>
            </div>
            <small>{{ month.month }}</small>
          </div>
        </div>
        <div v-else class="analytics-empty-state">
          <strong>No earnings analytics yet</strong>
          <span>Your completed job earnings will populate this chart.</span>
        </div>
      </article>
    </section>

    <section class="analytics-bottom-grid">
      <article class="card analytics-insight-card">
        <div class="analytics-card-head">
          <div>
            <span>INSIGHTS</span>
            <h3>Provider Highlights</h3>
            <p>Quick signals from your current marketplace performance.</p>
          </div>
        </div>

        <div class="analytics-insight-list">
          <div v-for="row in insightRows" :key="row.label">
            <span>{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
            <small>{{ row.caption }}</small>
          </div>
        </div>
      </article>

      <article class="card analytics-insight-card">
        <div class="analytics-card-head">
          <div>
            <span>QUEUE HEALTH</span>
            <h3>Job Pipeline</h3>
            <p>Your current provider workload at a glance.</p>
          </div>
        </div>

        <div class="analytics-pipeline-list">
          <div v-for="item in conversionSummary" :key="item.label">
            <div>
              <span>{{ item.label }}</span>
              <small>{{ item.caption }}</small>
            </div>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.provider-analytics-page {
  display: grid;
  gap: 22px;
}

.analytics-hero-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.8fr);
  gap: 22px;
  align-items: end;
  overflow: hidden;
  padding: 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.92), rgba(20, 184, 166, 0.78)),
    var(--color-card);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.analytics-hero-copy,
.analytics-card-head > div {
  display: grid;
  gap: 7px;
}

.analytics-hero-card span,
.analytics-kpi-card span,
.analytics-card-head span,
.analytics-insight-list span,
.analytics-pipeline-list span {
  font-size: 0.68rem;
  font-weight: 850;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.analytics-hero-copy h2 {
  font-size: 1.62rem;
  line-height: 1.15;
}

.analytics-hero-copy p,
.analytics-hero-metrics small {
  max-width: 620px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.82rem;
  line-height: 1.5;
}

.analytics-hero-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.analytics-hero-metrics > div {
  display: grid;
  gap: 7px;
  min-height: 104px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--radius-md);
  background: rgba(15, 23, 42, 0.25);
}

.analytics-hero-metrics strong {
  font-size: 1.18rem;
}

.analytics-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.analytics-kpi-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 104px;
  padding: 18px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
}

.analytics-kpi-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--metric-accent, var(--color-primary));
  content: "";
}

.analytics-kpi-card.blue { --metric-accent: var(--color-primary); --metric-soft: rgba(37, 99, 235, 0.13); }
.analytics-kpi-card.teal { --metric-accent: var(--color-secondary); --metric-soft: rgba(20, 184, 166, 0.13); }
.analytics-kpi-card.orange { --metric-accent: var(--color-warning); --metric-soft: rgba(245, 158, 11, 0.14); }
.analytics-kpi-card.green { --metric-accent: var(--color-success); --metric-soft: rgba(34, 197, 94, 0.13); }

.analytics-kpi-code {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 12px;
  background: var(--metric-soft);
  color: var(--metric-accent);
}

.analytics-kpi-card > div {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.analytics-kpi-card span,
.analytics-card-head span,
.analytics-insight-list span,
.analytics-pipeline-list span {
  color: var(--color-muted);
}

.analytics-kpi-card strong {
  overflow-wrap: anywhere;
  font-size: 1.38rem;
  line-height: 1.1;
}

.analytics-kpi-card small,
.analytics-card-head p,
.analytics-insight-list small,
.analytics-pipeline-list small,
.analytics-empty-state span {
  color: var(--color-muted);
  font-size: 0.76rem;
  line-height: 1.45;
}

.analytics-grid,
.analytics-bottom-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: start;
}

.analytics-chart-card,
.analytics-insight-card {
  margin: 0;
}

.analytics-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}

.analytics-card-head h3 {
  font-size: 1.1rem;
  line-height: 1.2;
}

.analytics-card-head > strong {
  flex: 0 0 auto;
  padding: 8px 11px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  color: var(--color-primary);
  font-size: 0.76rem;
}

.analytics-bar-chart {
  display: flex;
  align-items: end;
  gap: 13px;
  min-height: 310px;
  padding: 18px 6px 4px;
  border-radius: var(--radius-md);
  background:
    linear-gradient(to top, var(--color-border) 1px, transparent 1px) 0 72px / 100% 52px repeat-y,
    var(--color-background);
}

.analytics-bar-column {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 9px;
}

.analytics-bar-column span {
  min-height: 18px;
  color: var(--color-muted);
  font-size: 0.76rem;
  font-weight: 800;
  white-space: nowrap;
}

.analytics-bar-column small {
  color: var(--color-muted);
  font-size: 0.76rem;
}

.analytics-bar-track {
  display: flex;
  width: 100%;
  max-width: 90px;
  height: 220px;
  align-items: end;
  overflow: hidden;
  border-radius: 12px 12px 6px 6px;
  background: rgba(100, 116, 139, 0.09);
}

.analytics-bar {
  display: block;
  width: 100%;
  min-height: 8px;
  border-radius: 12px 12px 4px 4px;
  transition: height 0.3s ease;
}

.analytics-bar.blue {
  background: linear-gradient(180deg, #3b82f6, #2563eb);
}

.analytics-bar.teal {
  background: linear-gradient(180deg, #2dd4bf, #14b8a6);
}

.analytics-insight-list,
.analytics-pipeline-list {
  display: grid;
  gap: 10px;
}

.analytics-insight-list > div,
.analytics-pipeline-list > div,
.analytics-empty-state {
  display: grid;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-background);
}

.analytics-insight-list strong {
  font-size: 1rem;
}

.analytics-pipeline-list > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.analytics-pipeline-list > div > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.analytics-pipeline-list strong {
  flex: 0 0 auto;
  color: var(--color-primary);
  font-size: 1.25rem;
}

.analytics-empty-state {
  min-height: 260px;
  place-items: center;
  text-align: center;
}

@media (max-width: 1180px) {
  .analytics-hero-card,
  .analytics-grid,
  .analytics-bottom-grid {
    grid-template-columns: 1fr;
  }

  .analytics-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .analytics-hero-card {
    padding: 18px;
  }

  .analytics-hero-metrics,
  .analytics-kpi-grid {
    grid-template-columns: 1fr;
  }

  .analytics-card-head,
  .analytics-pipeline-list > div {
    align-items: flex-start;
    flex-direction: column;
  }

  .analytics-bar-chart {
    overflow-x: auto;
  }

  .analytics-bar-column {
    min-width: 82px;
  }
}
</style>
