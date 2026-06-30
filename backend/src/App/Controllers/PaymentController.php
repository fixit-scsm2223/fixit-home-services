<?php

declare(strict_types=1);

namespace App\Controllers;

use FixIt\JsonResponse;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Stripe\Stripe;
use Stripe\PaymentIntent;

class PaymentController
{
    public function __construct(private readonly PDO $pdo)
    {
        Stripe::setApiKey(envValue('STRIPE_SECRET_KEY'));
    }

    /** POST /api/payment/create-intent  (customer) */
    public function createIntent(Request $request, Response $response): Response
    {
        $body  = (array) ($request->getParsedBody() ?? []);
        $jobId = (int) ($body['job_id'] ?? 0);
        if (!$jobId) {
            return JsonResponse::error($response, 'job_id is required.', [], 422);
        }

        error_log("[PaymentController] create-intent received job_id={$jobId}");

        $job = $this->fetchJob($jobId);

        error_log('[PaymentController] fetchJob result: ' . ($job ? json_encode(['id' => $job['id'], 'status' => $job['status'], 'customer_id' => $job['customer_id'], 'final_cost' => $job['final_cost']]) : 'null'));

        if (!$job) {
            return JsonResponse::error($response, "Job {$jobId} not found in jobs table.", [], 404);
        }

        $amount = (float) ($job['final_cost'] ?? $job['estimated_cost'] ?? 0);
        if ($amount <= 0) {
            return JsonResponse::error($response, 'Job has no valid amount set.', [], 422);
        }

        // Prevent duplicate intents when one already exists and is pending
        $existing = $this->pdo
            ->prepare('SELECT id, stripe_payment_intent_id, transaction_reference, status FROM payments WHERE job_id = ? LIMIT 1');
        $existing->execute([$jobId]);
        $payment = $existing->fetch();

        if ($payment && $payment['status'] === 'paid') {
            return JsonResponse::error($response, 'This job has already been paid.', [], 409);
        }

        $intent = PaymentIntent::create([
            'amount'   => (int) round($amount * 100),   // MYR → sen
            'currency' => 'myr',
            'automatic_payment_methods' => [
                'enabled' => true,
                'allow_redirects' => 'never',
            ],
            'metadata' => ['job_id' => $jobId, 'customer_id' => $job['customer_id']],
        ]);

        if ($payment) {
            $this->pdo
                ->prepare('UPDATE payments SET stripe_payment_intent_id = ?, amount = ?, currency = "myr", status = "pending" WHERE job_id = ?')
                ->execute([$intent->id, $amount, $jobId]);
            $transactionReference = $payment['transaction_reference'];
        } else {
            $transactionReference = $this->insertPendingStripePayment($jobId, $job, $amount, $intent->id);
        }

        return JsonResponse::success($response, [
            'client_secret'          => $intent->client_secret,
            'payment_intent_id'      => $intent->id,
            'transaction_reference'  => $transactionReference,
            'amount'                 => $amount,
            'currency'               => 'myr',
        ]);
    }

    /** POST /api/payment/confirm  (customer) */
    public function confirm(Request $request, Response $response): Response
    {
        $body            = (array) ($request->getParsedBody() ?? []);
        $paymentIntentId = trim((string) ($body['payment_intent_id'] ?? ''));
        $jobId           = (int) ($body['job_id'] ?? 0);

        if (!$paymentIntentId || !$jobId) {
            return JsonResponse::error($response, 'payment_intent_id and job_id are required.', [], 422);
        }

        $intent = PaymentIntent::retrieve($paymentIntentId);
        if ($intent->status !== 'succeeded') {
            return JsonResponse::error($response, 'Payment has not succeeded yet.', [], 402);
        }

        $this->pdo
            ->prepare('UPDATE payments SET status = "paid" WHERE job_id = ? AND stripe_payment_intent_id = ?')
            ->execute([$jobId, $paymentIntentId]);

        $this->pdo
            ->prepare('UPDATE jobs SET status = "closed" WHERE id = ?')
            ->execute([$jobId]);

        return JsonResponse::success($response, [], 'Payment confirmed. Job closed.');
    }

    /** GET /api/payment/pending-for-customer  (customer) */
    public function pendingForCustomer(Request $request, Response $response): Response
    {
        $customerId = (int) $request->getAttribute('user_id');

        $stmt = $this->pdo->prepare('
            SELECT
                p.job_id,
                p.amount,
                p.currency,
                p.stripe_payment_intent_id,
                p.status AS payment_status,
                j.status AS job_status,
                j.estimated_cost
            FROM payments p
            JOIN jobs j ON j.id = p.job_id
            WHERE j.customer_id = ?
              AND p.status = "pending"
        ');
        $stmt->execute([$customerId]);

        return JsonResponse::success($response, $stmt->fetchAll());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function fetchJob(int $id): array|false
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, customer_id, provider_id, status, final_cost, estimated_cost FROM jobs WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    private function insertPendingStripePayment(int $jobId, array $job, float $amount, string $paymentIntentId): string
    {
        $stmt = $this->pdo->prepare('
            INSERT INTO payments (
                job_id, customer_id, provider_id, amount, currency,
                stripe_payment_intent_id, transaction_reference, status
            ) VALUES (?, ?, ?, ?, "myr", ?, ?, "pending")
        ');

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $reference = $this->generateTransactionReference($jobId);

            try {
                $stmt->execute([
                    $jobId,
                    $job['customer_id'],
                    $job['provider_id'],
                    $amount,
                    $paymentIntentId,
                    $reference,
                ]);

                return $reference;
            } catch (\PDOException $exception) {
                $isDuplicateReference = $exception->getCode() === '23000'
                    && str_contains($exception->getMessage(), 'transaction_reference');

                if (!$isDuplicateReference) {
                    throw $exception;
                }
            }
        }

        throw new \RuntimeException('Could not generate a unique Stripe transaction reference.');
    }

    private function generateTransactionReference(int $jobId): string
    {
        $jobPart = (string) $jobId;
        if (strlen($jobPart) > 10) {
            $jobPart = substr($jobPart, -10);
        }

        $prefix = "STRIPE-PENDING-{$jobPart}-";
        $suffix = strtoupper(dechex(time()) . bin2hex(random_bytes(8)));

        return $prefix . substr($suffix, 0, 40 - strlen($prefix));
    }
}
