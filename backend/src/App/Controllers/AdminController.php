<?php
declare(strict_types=1);

namespace App\Controllers;

use FixIt\JsonResponse;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AdminController
{
    public function __construct(private PDO $db)
    {
    }

    public function bootstrap(Request $request, Response $response): Response
    {
        $admin = $this->currentAdmin((int) $request->getAttribute('user_id'));

        return JsonResponse::success($response, [
            'metrics' => $this->metrics(),
            'providers' => $this->providers(),
            'categories' => $this->categories(),
            'jobs' => $this->jobs(),
            'users' => $this->users(),
            'safetyNotes' => $this->safetyNotes(),
            'notifications' => $this->notifications(),
            'adminProfile' => $admin,
        ], 'Admin dashboard data retrieved.');
    }

    public function updateProviderStatus(Request $request, Response $response, array $args): Response
    {
        $providerId = (int) $args['id'];
        $body = (array) ($request->getParsedBody() ?: []);
        $status = (string) ($body['status'] ?? '');
        $reason = trim((string) ($body['reason'] ?? ''));

        if (!in_array($status, ['pending', 'verified', 'rejected', 'suspended'], true)) {
            return JsonResponse::error($response, 'Invalid provider status.', ['status' => 'Unsupported status.'], 422);
        }

        $profile = $this->providerProfile($providerId);
        if (!$profile) {
            return JsonResponse::error($response, 'Provider not found.', [], 404);
        }

        $this->db->beginTransaction();
        try {
            if ($status === 'suspended') {
                $stmt = $this->db->prepare('UPDATE users SET status = :status, suspension_reason = :reason WHERE id = :id AND role = :role');
                $stmt->execute([
                    ':status' => 'suspended',
                    ':reason' => $reason !== '' ? $reason : null,
                    ':id' => $profile['user_id'],
                    ':role' => 'provider',
                ]);
            } else {
                $kycStatus = match ($status) {
                    'verified' => 'approved',
                    'rejected' => 'rejected',
                    default => 'pending',
                };

                $stmt = $this->db->prepare('UPDATE provider_profiles SET kyc_status = :kyc_status WHERE id = :id');
                $stmt->execute([':kyc_status' => $kycStatus, ':id' => $providerId]);

                $stmt = $this->db->prepare('UPDATE users SET status = :status, suspension_reason = NULL WHERE id = :id AND role = :role');
                $stmt->execute([
                    ':status' => 'active',
                    ':id' => $profile['user_id'],
                    ':role' => 'provider',
                ]);
            }
            $this->db->commit();
        } catch (\Throwable $exception) {
            $this->db->rollBack();
            throw $exception;
        }

        return JsonResponse::success($response, [], 'Provider status updated.');
    }

    public function updateUserStatus(Request $request, Response $response, array $args): Response
    {
        $userId = (int) $args['id'];
        $body = (array) ($request->getParsedBody() ?: []);
        $status = (string) ($body['status'] ?? '');
        $reason = trim((string) ($body['reason'] ?? ''));

        if (!in_array($status, ['active', 'suspended'], true)) {
            return JsonResponse::error($response, 'Invalid user status.', ['status' => 'Unsupported status.'], 422);
        }

        if (!$this->customerExists($userId)) {
            return JsonResponse::error($response, 'Customer not found.', [], 404);
        }

        $stmt = $this->db->prepare('UPDATE users SET status = :status, suspension_reason = :reason WHERE id = :id AND role = :role');
        $stmt->execute([
            ':status' => $status,
            ':reason' => $status === 'suspended' && $reason !== '' ? $reason : null,
            ':id' => $userId,
            ':role' => 'customer',
        ]);

        return JsonResponse::success($response, [], 'Customer status updated.');
    }

    public function updateJobNote(Request $request, Response $response, array $args): Response
    {
        $jobRef = (string) $args['id'];
        $body = (array) ($request->getParsedBody() ?: []);
        $note = trim((string) ($body['admin_note'] ?? ''));

        if (!$this->jobExists($jobRef)) {
            return JsonResponse::error($response, 'Job not found.', [], 404);
        }

        if (ctype_digit($jobRef)) {
            $stmt = $this->db->prepare('UPDATE jobs SET admin_note = :note WHERE id = :id');
            $stmt->execute([':note' => $note !== '' ? $note : null, ':id' => (int) $jobRef]);
        } else {
            $stmt = $this->db->prepare('UPDATE jobs SET admin_note = :note WHERE ticket_ref = :ticket_ref');
            $stmt->execute([':note' => $note !== '' ? $note : null, ':ticket_ref' => $jobRef]);
        }

        return JsonResponse::success($response, [], 'Admin note updated.');
    }

    public function replaceSafetyNotes(Request $request, Response $response): Response
    {
        $body = (array) ($request->getParsedBody() ?: []);
        $notes = array_values(array_filter(array_map(
            static fn ($note): string => trim((string) $note),
            is_array($body['notes'] ?? null) ? $body['notes'] : []
        )));

        $this->db->beginTransaction();
        try {
            $this->db->exec('DELETE FROM safety_notes');
            $stmt = $this->db->prepare('INSERT INTO safety_notes (note) VALUES (:note)');
            foreach ($notes as $note) {
                $stmt->execute([':note' => $note]);
            }
            $this->db->commit();
        } catch (\Throwable $exception) {
            $this->db->rollBack();
            throw $exception;
        }

        return JsonResponse::success($response, [], 'Safety notes updated.');
    }

    private function providerProfile(int $providerId): ?array
    {
        $stmt = $this->db->prepare('SELECT id, user_id FROM provider_profiles WHERE id = :id');
        $stmt->execute([':id' => $providerId]);
        $profile = $stmt->fetch();

        return $profile ?: null;
    }

    private function customerExists(int $userId): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM users WHERE id = :id AND role = :role LIMIT 1');
        $stmt->execute([':id' => $userId, ':role' => 'customer']);

        return (bool) $stmt->fetchColumn();
    }

    private function jobExists(string $jobRef): bool
    {
        if (ctype_digit($jobRef)) {
            $stmt = $this->db->prepare('SELECT 1 FROM jobs WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => (int) $jobRef]);
        } else {
            $stmt = $this->db->prepare('SELECT 1 FROM jobs WHERE ticket_ref = :ticket_ref LIMIT 1');
            $stmt->execute([':ticket_ref' => $jobRef]);
        }

        return (bool) $stmt->fetchColumn();
    }

    private function currentAdmin(int $adminId): array
    {
        $stmt = $this->db->prepare('SELECT full_name, email, phone, role, created_at FROM users WHERE id = :id AND role = :role LIMIT 1');
        $stmt->execute([':id' => $adminId, ':role' => 'admin']);
        $admin = $stmt->fetch() ?: [];
        $name = (string) ($admin['full_name'] ?? 'Admin Team');

        return [
            'name' => $name,
            'email' => (string) ($admin['email'] ?? 'admin@fixit.test'),
            'phone' => (string) ($admin['phone'] ?? ''),
            'position' => 'System Administrator',
            'department' => 'Platform Operations',
            'location' => 'Johor Bahru, Malaysia',
            'joinedOn' => $this->formatDate($admin['created_at'] ?? null),
            'bio' => 'Responsible for provider verification, safety compliance, user management, and daily FixIt platform operations.',
            'employeeId' => 'FX-ADM-' . str_pad((string) $adminId, 3, '0', STR_PAD_LEFT),
            'timezone' => 'GMT+8 Malaysia Time',
            'workMode' => 'Hybrid',
            'permissionsTier' => 'Tier 1 Platform Admin',
            'roleLevel' => 'System Administrator',
            'accountStatus' => 'Active',
        ];
    }

    private function metrics(): array
    {
        return [
            'totalProviders' => (int) $this->db->query("SELECT COUNT(*) FROM users WHERE role = 'provider'")->fetchColumn(),
            'totalJobs' => (int) $this->db->query('SELECT COUNT(*) FROM jobs')->fetchColumn(),
            'totalRevenue' => (float) $this->db->query("SELECT COALESCE(SUM(COALESCE(final_cost, estimated_cost, 0)), 0) FROM jobs WHERE status IN ('completed','cost_pending','closed','reviewed')")->fetchColumn(),
        ];
    }

    private function providers(): array
    {
        $rows = $this->db->query("
            SELECT
                pp.id,
                pp.user_id,
                COALESCE(pp.business_name, u.full_name) AS provider_name,
                u.username,
                u.email,
                u.phone,
                u.status AS user_status,
                u.suspension_reason,
                pp.bio,
                pp.location,
                pp.base_rate,
                pp.service_category,
                pp.kyc_status,
                pp.kyc_original_name,
                pp.kyc_submitted_at,
                pp.created_at,
                COALESCE(AVG(r.rating), 0) AS rating,
                COUNT(DISTINCT CASE WHEN j.status IN ('closed','reviewed') THEN j.id END) AS jobs_completed,
                COUNT(DISTINCT r.id) AS reviews_count
            FROM provider_profiles pp
            JOIN users u ON u.id = pp.user_id
            LEFT JOIN jobs j ON j.provider_id = pp.id
            LEFT JOIN reviews r ON r.job_id = j.id
            GROUP BY pp.id, pp.user_id, provider_name, u.username, u.email, u.phone, u.status,
                     u.suspension_reason, pp.bio, pp.location, pp.base_rate, pp.service_category,
                     pp.kyc_status, pp.kyc_original_name, pp.kyc_submitted_at, pp.created_at
            ORDER BY pp.created_at DESC
        ")->fetchAll();

        return array_map(fn (array $row): array => [
            'id' => (string) $row['id'],
            'name' => (string) $row['provider_name'],
            'username' => '@' . ltrim((string) $row['username'], '@'),
            'email' => (string) $row['email'],
            'phone' => (string) $row['phone'],
            'category' => (string) $row['service_category'],
            'icon' => $this->categoryIcon((string) $row['service_category']),
            'location' => (string) $row['location'],
            'serviceArea' => (string) $row['location'],
            'bio' => (string) $row['bio'],
            'experience' => 'Provider profile from shared FixIt database',
            'baseRate' => (float) $row['base_rate'],
            'submitted' => $this->formatDate($row['kyc_submitted_at'] ?: $row['created_at']),
            'status' => $this->providerStatus($row),
            'document' => (string) ($row['kyc_original_name'] ?: 'KYC document submitted'),
            'rating' => round((float) $row['rating'], 1),
            'jobsCompleted' => (int) $row['jobs_completed'],
            'responseTime' => 'Not tracked',
            'availability' => 'See provider schedule',
            'verificationScore' => $this->providerStatus($row) === 'verified' ? '100%' : 'Pending',
            'reviewsCount' => (int) $row['reviews_count'],
            'suspensionReason' => (string) ($row['suspension_reason'] ?? ''),
        ], $rows);
    }

    private function users(): array
    {
        $stmt = $this->db->query("
            SELECT
                u.id,
                u.full_name,
                u.username,
                u.email,
                u.phone,
                u.role,
                u.status,
                u.suspension_reason,
                u.created_at,
                COUNT(DISTINCT j.id) AS total_bookings,
                COUNT(DISTINCT CASE WHEN j.status IN ('closed','reviewed') THEN j.id END) AS completed_bookings,
                COUNT(DISTINCT CASE WHEN j.cancelled = 1 THEN j.id END) AS cancelled_bookings,
                COUNT(DISTINCT r.id) AS reviews_submitted,
                MAX(j.created_at) AS recent_booking
            FROM users u
            LEFT JOIN jobs j ON j.customer_id = u.id
            LEFT JOIN reviews r ON r.customer_id = u.id
            GROUP BY u.id, u.full_name, u.username, u.email, u.phone, u.role, u.status, u.suspension_reason, u.created_at
            ORDER BY u.created_at DESC
        ");

        return array_map(fn (array $row): array => [
            'id' => (string) $row['id'],
            'name' => (string) $row['full_name'],
            'username' => '@' . ltrim((string) $row['username'], '@'),
            'email' => (string) $row['email'],
            'phone' => (string) $row['phone'],
            'role' => ucfirst((string) $row['role']),
            'status' => (string) $row['status'],
            'trustLevel' => $row['status'] === 'suspended' ? 'restricted' : 'trusted',
            'joinedOn' => $this->formatDate($row['created_at']),
            'joinedAt' => (string) $row['created_at'],
            'lastLogin' => 'Not tracked',
            'lastLoginAt' => '',
            'totalBookings' => (int) $row['total_bookings'],
            'completedBookings' => (int) $row['completed_bookings'],
            'cancelledBookings' => (int) $row['cancelled_bookings'],
            'recentBooking' => $this->formatDate($row['recent_booking'] ?? null),
            'reviewsSubmitted' => (int) $row['reviews_submitted'],
            'reports' => 0,
            'adminNotes' => '',
            'suspensionReason' => (string) ($row['suspension_reason'] ?? ''),
        ], $stmt->fetchAll());
    }

    private function jobs(): array
    {
        $rows = $this->db->query("
            SELECT
                j.id,
                j.ticket_ref,
                j.service_title,
                j.address,
                j.scheduled_at,
                j.status,
                j.estimated_cost,
                j.final_cost,
                j.initial_estimate,
                j.admin_note,
                j.notes,
                j.created_at,
                c.full_name AS customer_name,
                c.email AS customer_email,
                c.phone AS customer_phone,
                pu.full_name AS provider_name,
                pu.phone AS provider_phone,
                sc.name AS category_name
            FROM jobs j
            JOIN users c ON c.id = j.customer_id
            JOIN provider_profiles pp ON pp.id = j.provider_id
            JOIN users pu ON pu.id = pp.user_id
            LEFT JOIN service_categories sc ON sc.id = j.category_id
            ORDER BY j.created_at DESC
        ")->fetchAll();

        return array_map(fn (array $row): array => [
            'id' => (string) ($row['ticket_ref'] ?: 'FX-' . str_pad((string) $row['id'], 4, '0', STR_PAD_LEFT)),
            'dbId' => (string) $row['id'],
            'title' => (string) ($row['service_title'] ?: (($row['category_name'] ?: 'Service') . ' booking')),
            'icon' => $this->categoryIcon((string) ($row['category_name'] ?? '')),
            'category' => (string) ($row['category_name'] ?: 'General'),
            'provider' => (string) $row['provider_name'],
            'customer' => (string) $row['customer_name'],
            'createdOn' => $this->formatDate($row['created_at']),
            'createdAt' => (string) $row['created_at'],
            'scheduledAt' => (string) $row['scheduled_at'],
            'status' => (string) $row['status'],
            'amount' => (float) ($row['final_cost'] ?? $row['estimated_cost'] ?? 0),
            'estimatedPrice' => (float) ($row['initial_estimate'] ?? $row['estimated_cost'] ?? 0),
            'customerEmail' => (string) $row['customer_email'],
            'customerPhone' => (string) $row['customer_phone'],
            'serviceAddress' => (string) $row['address'],
            'providerContact' => (string) $row['provider_phone'],
            'customerNote' => (string) ($row['notes'] ?? ''),
            'providerNote' => '',
            'adminNote' => (string) ($row['admin_note'] ?? ''),
        ], $rows);
    }

    private function categories(): array
    {
        $stmt = $this->db->query('SELECT id, name, icon, description FROM service_categories ORDER BY name');

        return array_map(fn (array $row): array => [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'icon' => (string) ($row['icon'] ?: $this->categoryIcon((string) $row['name'])),
            'status' => 'active',
            'description' => (string) ($row['description'] ?? ''),
        ], $stmt->fetchAll());
    }

    private function safetyNotes(): array
    {
        $stmt = $this->db->query('SELECT note FROM safety_notes ORDER BY id DESC');
        return array_map(static fn (array $row): string => (string) $row['note'], $stmt->fetchAll());
    }

    private function notifications(): array
    {
        $notifications = [];
        foreach ($this->providers() as $provider) {
            if ($provider['status'] !== 'pending') {
                continue;
            }
            $notifications[] = [
                'id' => 'provider-' . $provider['id'],
                'title' => 'Provider application pending',
                'message' => $provider['name'] . ' is waiting for verification review.',
                'unread' => true,
                'type' => 'provider_verification_pending',
                'entityType' => 'provider',
                'entityId' => $provider['id'],
                'route' => 'providers',
                'createdAt' => date(DATE_ATOM),
            ];
        }

        return array_slice($notifications, 0, 10);
    }

    private function providerStatus(array $row): string
    {
        if (($row['user_status'] ?? '') === 'suspended') {
            return 'suspended';
        }

        return match ((string) ($row['kyc_status'] ?? 'pending')) {
            'approved' => 'verified',
            'rejected' => 'rejected',
            default => 'pending',
        };
    }

    private function categoryIcon(string $category): string
    {
        return match (strtolower($category)) {
            'plumbing' => 'PL',
            'electrical' => 'EL',
            'cleaning' => 'CL',
            'gardening' => 'GR',
            'ac service' => 'AC',
            default => 'SV',
        };
    }

    private function formatDate(?string $value): string
    {
        if (!$value) {
            return 'Not recorded';
        }

        try {
            return (new \DateTimeImmutable($value))->format('j M Y');
        } catch (\Throwable) {
            return 'Not recorded';
        }
    }
}
