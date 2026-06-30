<?php
declare(strict_types=1);

namespace App\Controllers;

use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * ReviewController (Member 2)
 *
 * JWT-protected endpoints for submitting a review (+ optional tip) on a
 * completed, cost-confirmed job, and listing the customer's own reviews.
 */
class ReviewController
{
    public function __construct(private PDO $db) {}

    /** GET /reviews — the logged-in customer's submitted reviews. */
    public function index(Request $request, Response $response): Response
    {
        $customerId = (int) $request->getAttribute('user_id');

        $stmt = $this->db->prepare('
            SELECT r.id, r.job_id, r.rating, r.comment, r.created_at,
                   j.tip_amount, u.full_name AS provider_name
            FROM reviews r
            JOIN jobs j               ON j.id = r.job_id
            JOIN provider_profiles pp ON pp.id = j.provider_id
            JOIN users u              ON u.id = pp.user_id
            WHERE j.customer_id = :customer_id
            ORDER BY r.created_at DESC
        ');
        $stmt->execute([':customer_id' => $customerId]);

        $rows = array_map(function ($r) {
            $r['tip_amount'] = $r['tip_amount'] !== null ? (float) $r['tip_amount'] : null;
            return $r;
        }, $stmt->fetchAll());

        return $this->json($response, true, 'Reviews retrieved successfully', $rows);
    }

    /**
     * POST /bookings/{id}/review — body: { rating, comment, tip_amount }
     * Only allowed once a job is completed and the customer has confirmed
     * the final cost. One review per job (enforced by a unique index too).
     */
    public function store(Request $request, Response $response, array $args): Response
    {
        $customerId = (int) $request->getAttribute('user_id');
        $jobId = (int) $args['id'];
        $body = (array) $request->getParsedBody();

        $rating  = isset($body['rating']) ? (int) $body['rating'] : null;
        $comment = trim((string) ($body['comment'] ?? ''));
        $tip     = isset($body['tip_amount']) ? (float) $body['tip_amount'] : null;

        if ($rating === null || $rating < 1 || $rating > 5) {
            return $this->json($response, false, 'rating must be between 1 and 5', [], 422);
        }

        $stmt = $this->db->prepare('SELECT * FROM jobs WHERE id = :id AND customer_id = :customer_id');
        $stmt->execute([':id' => $jobId, ':customer_id' => $customerId]);
        $job = $stmt->fetch();

        if (!$job) {
            return $this->json($response, false, 'Booking not found', [], 404);
        }
        if ($job['status'] !== 'closed') {
            return $this->json($response, false, 'Job must be closed (cost confirmed) before it can be reviewed', [], 422);
        }

        $existing = $this->db->prepare('SELECT id FROM reviews WHERE job_id = :job_id');
        $existing->execute([':job_id' => $jobId]);
        if ($existing->fetch()) {
            return $this->json($response, false, 'This job has already been reviewed', [], 409);
        }

        $this->db->beginTransaction();
        try {
            $insert = $this->db->prepare('
                INSERT INTO reviews (job_id, customer_id, provider_id, rating, comment)
                VALUES (:job_id, :customer_id, :provider_id, :rating, :comment)
            ');
            $insert->execute([
                ':job_id'      => $jobId,
                ':customer_id' => $customerId,
                ':provider_id' => $job['provider_id'],
                ':rating'      => $rating,
                ':comment'     => $comment !== '' ? $comment : null,
            ]);

            $update = $this->db->prepare("UPDATE jobs SET tip_amount = :tip, status = 'reviewed' WHERE id = :id");
            $update->execute([':tip' => $tip, ':id' => $jobId]);

            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollBack();
            return $this->json($response, false, 'Could not submit review', [], 500);
        }

        return $this->json($response, true, 'Review submitted successfully', [
            'job_id'     => $jobId,
            'rating'     => $rating,
            'comment'    => $comment,
            'tip_amount' => $tip,
        ], 201);
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
