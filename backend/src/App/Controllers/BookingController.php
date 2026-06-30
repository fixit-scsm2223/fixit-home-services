<?php
declare(strict_types=1);

namespace App\Controllers;

use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * BookingController (Member 2)
 *
 * JWT-protected endpoints for the customer booking workflow: create a
 * booking (job), list/view the customer's own jobs, confirm the final
 * cost, and cancel a booking or a whole recurring series.
 *
 * Every query is scoped to the authenticated customer via
 * `$request->getAttribute('user_id')` set by the JWT middleware — a
 * customer can never read or mutate another customer's job.
 */
class BookingController
{
    private const RECURRING_OCCURRENCES = 3;
    private const STEP_DAYS = ['weekly' => 7, 'biweekly' => 14, 'monthly' => 30];

    public function __construct(private PDO $db) {}

    /** GET /bookings — the logged-in customer's jobs, optionally filtered by status. */
    public function index(Request $request, Response $response): Response
    {
        $customerId = (int) $request->getAttribute('user_id');
        $status = $request->getQueryParams()['status'] ?? null;

        $sql = "
            SELECT j.*, u.full_name AS provider_name, sc.name AS category_name,
                   p.status AS payment_status
            FROM jobs j
            JOIN provider_profiles pp ON pp.id = j.provider_id
            JOIN users u              ON u.id = pp.user_id
            LEFT JOIN service_categories sc ON sc.id = j.category_id
            LEFT JOIN payments p            ON p.job_id = j.id
            WHERE j.customer_id = :customer_id
        ";
        $params = [':customer_id' => $customerId];

        if ($status !== null && $status !== '') {
            $sql .= ' AND j.status = :status';
            $params[':status'] = $status;
        }

        $sql .= ' ORDER BY j.scheduled_at DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $this->json($response, true, 'Bookings retrieved successfully', $this->normalizeRows($stmt->fetchAll()));
    }

    /** GET /bookings/{id} — a single job ticket, scoped to its owner. */
    public function show(Request $request, Response $response, array $args): Response
    {
        $job = $this->findOwnedJob((int) $args['id'], (int) $request->getAttribute('user_id'));
        if (!$job) {
            return $this->json($response, false, 'Booking not found', [], 404);
        }
        return $this->json($response, true, 'Booking retrieved successfully', $job);
    }

    /**
     * POST /bookings — create a job request. When `is_recurring` is true,
     * also schedules the next occurrences as separate jobs linked back via
     * `parent_job_id`, on the cadence given by `recurring_frequency`.
     */
    public function create(Request $request, Response $response): Response
    {
        $customerId = (int) $request->getAttribute('user_id');
        $body = (array) $request->getParsedBody();

        $providerId   = isset($body['provider_id']) ? (int) $body['provider_id'] : null;
        $categoryId   = isset($body['category_id']) ? (int) $body['category_id'] : null;
        $scheduledAt  = trim((string) ($body['scheduled_at'] ?? ''));
        $address      = trim((string) ($body['address'] ?? ''));
        $notes        = trim((string) ($body['notes'] ?? ''));
        $estimatedCost = isset($body['estimated_cost']) ? (float) $body['estimated_cost'] : 0.0;
        $isRecurring  = !empty($body['is_recurring']);
        $frequency    = $body['recurring_frequency'] ?? null;

        if (!$providerId || $scheduledAt === '' || $address === '') {
            return $this->json($response, false, 'provider_id, scheduled_at and address are required', [], 422);
        }
        if ($isRecurring && !isset(self::STEP_DAYS[$frequency])) {
            return $this->json($response, false, 'recurring_frequency must be weekly, biweekly or monthly', [], 422);
        }

        $this->db->beginTransaction();
        try {
            $parentId = $this->insertJob($customerId, $providerId, $categoryId, $scheduledAt, $address, $notes, $estimatedCost, $isRecurring, $frequency, null);

            if ($isRecurring) {
                $cursor = new \DateTimeImmutable($scheduledAt);
                $stepDays = self::STEP_DAYS[$frequency];
                for ($i = 1; $i <= self::RECURRING_OCCURRENCES; $i++) {
                    $cursor = $cursor->modify("+{$stepDays} days");
                    $this->insertJob($customerId, $providerId, $categoryId, $cursor->format('Y-m-d H:i:s'), $address, $notes, $estimatedCost, true, $frequency, $parentId);
                }
            }

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            return $this->json($response, false, 'Could not create booking', [], 500);
        }

        $job = $this->findOwnedJob($parentId, $customerId);
        return $this->json($response, true, 'Booking created successfully', $job, 201);
    }

    /** PATCH /bookings/{id}/confirm-cost — customer accepts the provider's final cost. */
    public function confirmCost(Request $request, Response $response, array $args): Response
    {
        $customerId = (int) $request->getAttribute('user_id');
        $job = $this->findOwnedJob((int) $args['id'], $customerId);
        if (!$job) {
            return $this->json($response, false, 'Booking not found', [], 404);
        }
        if ($job['status'] !== 'cost_pending') {
            return $this->json($response, false, 'Only jobs awaiting cost confirmation can be confirmed', [], 422);
        }

        $stmt = $this->db->prepare("UPDATE jobs SET status = 'closed', cost_confirmed = 1 WHERE id = :id");
        $stmt->execute([':id' => $job['id']]);

        return $this->json($response, true, 'Cost confirmed', $this->findOwnedJob($job['id'], $customerId));
    }

    /** PATCH /bookings/{id}/cancel — cancel a single pending/confirmed job. */
    public function cancel(Request $request, Response $response, array $args): Response
    {
        $customerId = (int) $request->getAttribute('user_id');
        $job = $this->findOwnedJob((int) $args['id'], $customerId);
        if (!$job) {
            return $this->json($response, false, 'Booking not found', [], 404);
        }
        if (!in_array($job['status'], ['requested', 'accepted'], true)) {
            return $this->json($response, false, 'Only requested or accepted bookings can be cancelled', [], 422);
        }

        $stmt = $this->db->prepare("UPDATE jobs SET status = 'cancelled', cancelled = 1, cancelled_at = NOW() WHERE id = :id");
        $stmt->execute([':id' => $job['id']]);

        return $this->json($response, true, 'Booking cancelled', $this->findOwnedJob($job['id'], $customerId));
    }

    /** PATCH /bookings/{id}/cancel-series — cancel every future occurrence of a recurring booking. */
    public function cancelSeries(Request $request, Response $response, array $args): Response
    {
        $customerId = (int) $request->getAttribute('user_id');
        $parentId = (int) $args['id'];
        $parent = $this->findOwnedJob($parentId, $customerId);
        if (!$parent || !$parent['is_recurring']) {
            return $this->json($response, false, 'Recurring booking not found', [], 404);
        }

        $stmt = $this->db->prepare("
            UPDATE jobs
            SET status = 'cancelled', cancelled = 1, cancelled_at = NOW()
            WHERE customer_id = :customer_id
              AND (id = :id OR parent_job_id = :id)
              AND status IN ('requested', 'accepted')
              AND cancelled = 0
        ");
        $stmt->execute([':customer_id' => $customerId, ':id' => $parentId]);

        return $this->json($response, true, 'Recurring series cancelled', null);
    }

    // ---------- helpers ----------

    private function insertJob(
        int $customerId,
        int $providerId,
        ?int $categoryId,
        string $scheduledAt,
        string $address,
        string $notes,
        float $estimatedCost,
        bool $isRecurring,
        ?string $frequency,
        ?int $parentJobId
    ): int {
        $stmt = $this->db->prepare('
            INSERT INTO jobs (
                customer_id, provider_id, category_id, status, scheduled_at,
                address, notes, estimated_cost, is_recurring, recurring_frequency, parent_job_id
            ) VALUES (
                :customer_id, :provider_id, :category_id, \'requested\', :scheduled_at,
                :address, :notes, :estimated_cost, :is_recurring, :recurring_frequency, :parent_job_id
            )
        ');
        $stmt->execute([
            ':customer_id'   => $customerId,
            ':provider_id'   => $providerId,
            ':category_id'   => $categoryId,
            ':scheduled_at'  => $scheduledAt,
            ':address'       => $address,
            ':notes'         => $notes !== '' ? $notes : null,
            ':estimated_cost'=> $estimatedCost,
            ':is_recurring'  => $isRecurring ? 1 : 0,
            ':recurring_frequency' => $frequency,
            ':parent_job_id' => $parentJobId,
        ]);
        return (int) $this->db->lastInsertId();
    }

    private function findOwnedJob(int $id, int $customerId): ?array
    {
        $stmt = $this->db->prepare('
            SELECT j.*, u.full_name AS provider_name, sc.name AS category_name,
                   p.status AS payment_status
            FROM jobs j
            JOIN provider_profiles pp ON pp.id = j.provider_id
            JOIN users u              ON u.id = pp.user_id
            LEFT JOIN service_categories sc ON sc.id = j.category_id
            LEFT JOIN payments p            ON p.job_id = j.id
            WHERE j.id = :id AND j.customer_id = :customer_id
        ');
        $stmt->execute([':id' => $id, ':customer_id' => $customerId]);
        $row = $stmt->fetch();
        return $row ? $this->normalizeRow($row) : null;
    }

    private function normalizeRows(array $rows): array
    {
        return array_map(fn ($r) => $this->normalizeRow($r), $rows);
    }

    private function normalizeRow(array $row): array
    {
        $row['estimated_cost'] = (float) $row['estimated_cost'];
        $row['final_cost']     = $row['final_cost'] !== null ? (float) $row['final_cost'] : null;
        $row['tip_amount']     = $row['tip_amount'] !== null ? (float) $row['tip_amount'] : null;
        $row['cost_confirmed'] = (bool) $row['cost_confirmed'];
        $row['is_recurring']   = (bool) $row['is_recurring'];
        $row['parent_job_id']  = $row['parent_job_id'] !== null ? (int) $row['parent_job_id'] : null;
        $row['payment_status'] = $row['payment_status'] ?? null;  // null = no payment record
        return $row;
    }

    private function json(Response $response, bool $success, string $message, $data = [], int $status = 200): Response
    {
        $response->getBody()->write(json_encode([
            'success' => $success,
            'message' => $message,
            'data'    => $data,
        ]));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
