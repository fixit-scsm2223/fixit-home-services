<?php

declare(strict_types=1);

namespace FixIt\Provider;

use InvalidArgumentException;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class ProviderController
{
    public function __construct(private PDO $db, private string $kycStorage)
    {
    }

    private function providerIdFor(int $userId): ?int
    {
        $stmt = $this->db->prepare('SELECT id FROM provider_profiles WHERE user_id = ?');
        $stmt->execute([$userId]);
        $id = $stmt->fetchColumn();
        return $id === false ? null : (int) $id;
    }

    private function userId(Request $request): int
    {
        return (int) $request->getAttribute('user_id');
    }

    public function getProfile(Request $request, Response $response): Response
    {
        $stmt = $this->db->prepare(
            "SELECT pp.*, COALESCE(pp.business_name, u.full_name) AS business_name,
                    pp.location AS address, pp.kyc_document_path AS kyc_file_path,
                    CASE pp.kyc_status WHEN 'approved' THEN 'verified' WHEN 'rejected' THEN 'rejected' ELSE 'pending' END AS verification_status,
                    u.email, u.phone
             FROM provider_profiles pp JOIN users u ON u.id = pp.user_id WHERE pp.user_id = ?"
        );
        $stmt->execute([$this->userId($request)]);
        $profile = $stmt->fetch();
        if (!$profile) return ProviderJsonResponse::error($response, 'Provider profile not found', [], 404);

        $categories = $this->db->prepare('SELECT sc.id, sc.title, sc.icon FROM provider_categories pc JOIN service_categories sc ON sc.id = pc.category_id WHERE pc.provider_id = ?');
        $categories->execute([$profile['id']]);
        $profile['categories'] = $categories->fetchAll();
        return ProviderJsonResponse::success($response, $profile);
    }

    public function createProfile(Request $request, Response $response): Response
    {
        if ($this->providerIdFor($this->userId($request))) return ProviderJsonResponse::error($response, 'Profile already exists, use PUT to update', [], 409);
        $body = (array) $request->getParsedBody();
        $stmt = $this->db->prepare('INSERT INTO provider_profiles (user_id, business_name, bio, location, base_rate, service_category, kyc_document_path, kyc_original_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$this->userId($request), trim((string) ($body['business_name'] ?? '')), trim((string) ($body['bio'] ?? '')), trim((string) ($body['address'] ?? '')), (float) ($body['base_rate'] ?? 0), trim((string) ($body['service_category'] ?? 'General')), '', '']);
        return ProviderJsonResponse::success($response, ['id' => $this->db->lastInsertId()], 'Provider profile created', 201);
    }

    public function updateProfile(Request $request, Response $response): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        if (!$providerId) return ProviderJsonResponse::error($response, 'Provider profile not found', [], 404);
        $body = (array) $request->getParsedBody();
        $mapping = ['business_name' => 'business_name', 'bio' => 'bio', 'address' => 'location', 'latitude' => 'latitude', 'longitude' => 'longitude', 'base_rate' => 'base_rate', 'availability_mode' => 'availability_mode'];
        $fields = [];
        $values = [];
        foreach ($mapping as $input => $column) {
            if (array_key_exists($input, $body)) {
                $fields[] = "$column = ?";
                $values[] = $body[$input];
            }
        }
        if ($fields) {
            $values[] = $providerId;
            $this->db->prepare('UPDATE provider_profiles SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($values);
        }
        $userFields = [];
        $userValues = [];
        foreach (['phone', 'email'] as $field) {
            if (array_key_exists($field, $body)) {
                $userFields[] = "$field = ?";
                $userValues[] = $body[$field];
            }
        }
        if ($userFields) {
            $userValues[] = $this->userId($request);
            $this->db->prepare('UPDATE users SET ' . implode(', ', $userFields) . ' WHERE id = ?')->execute($userValues);
        }
        if (!$fields && !$userFields) return ProviderJsonResponse::error($response, 'No valid fields to update', [], 422);
        return ProviderJsonResponse::success($response, [], 'Profile updated successfully');
    }

    public function uploadKyc(Request $request, Response $response): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        if (!$providerId) return ProviderJsonResponse::error($response, 'Provider profile not found', [], 404);
        $file = $request->getUploadedFiles()['document'] ?? null;
        if (!$file || $file->getError() !== UPLOAD_ERR_OK) return ProviderJsonResponse::error($response, 'A valid KYC document is required', [], 422);
        try {
            if (($file->getSize() ?? 0) > 5 * 1024 * 1024) throw new InvalidArgumentException('File exceeds the 5 MB size limit');
            $originalName = basename($file->getClientFilename() ?? 'document');
            $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            $allowed = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png'];
            if (!isset($allowed[$extension])) throw new InvalidArgumentException('Only PDF, JPG, JPEG, and PNG files are allowed');
            $stream = $file->getStream();
            $stream->rewind();
            $content = $stream->getContents();
            $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($content);
            if ($mime !== $allowed[$extension]) throw new InvalidArgumentException('The uploaded file content is invalid');
            if (!is_dir($this->kycStorage) && !mkdir($this->kycStorage, 0750, true) && !is_dir($this->kycStorage)) throw new InvalidArgumentException('KYC storage is unavailable');
            $filename = bin2hex(random_bytes(24)) . '.' . $extension;
            if (file_put_contents($this->kycStorage . DIRECTORY_SEPARATOR . $filename, $content, LOCK_EX) === false) throw new InvalidArgumentException('The KYC document could not be stored');
            $this->db->prepare("UPDATE provider_profiles SET kyc_document_path = ?, kyc_original_name = ?, kyc_submitted_at = NOW(), kyc_status = 'pending' WHERE id = ?")->execute([$filename, $originalName, $providerId]);
            return ProviderJsonResponse::success($response, ['file' => $filename], 'KYC document uploaded successfully');
        } catch (InvalidArgumentException $exception) {
            return ProviderJsonResponse::error($response, $exception->getMessage(), [], 422);
        }
    }

    public function downloadKyc(Request $request, Response $response): Response
    {
        $stmt = $this->db->prepare('SELECT kyc_document_path, kyc_original_name FROM provider_profiles WHERE user_id = ?');
        $stmt->execute([$this->userId($request)]);
        $document = $stmt->fetch();
        if (!$document || empty($document['kyc_document_path'])) {
            return ProviderJsonResponse::error($response, 'KYC document not found', [], 404);
        }

        $filename = basename((string) $document['kyc_document_path']);
        $path = $this->kycStorage . DIRECTORY_SEPARATOR . $filename;
        if (!is_file($path)) {
            return ProviderJsonResponse::error($response, 'KYC document not found', [], 404);
        }

        $mime = 'application/octet-stream';
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo !== false) {
            $detected = finfo_file($finfo, $path);
            if (is_string($detected) && $detected !== '') $mime = $detected;
            finfo_close($finfo);
        }

        $downloadName = (string) ($document['kyc_original_name'] ?: $filename);
        $downloadName = str_replace(['"', "\r", "\n"], '', $downloadName);
        $response->getBody()->write((string) file_get_contents($path));
        return $response
            ->withHeader('Content-Type', $mime)
            ->withHeader('Content-Disposition', 'attachment; filename="' . $downloadName . '"');
    }

    public function updateCategories(Request $request, Response $response): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        if (!$providerId) return ProviderJsonResponse::error($response, 'Provider profile not found', [], 404);
        $categoryIds = ((array) $request->getParsedBody())['category_ids'] ?? [];
        if (!is_array($categoryIds)) return ProviderJsonResponse::error($response, 'category_ids must be an array', [], 422);
        $this->db->beginTransaction();
        try {
            $this->db->prepare('DELETE FROM provider_categories WHERE provider_id = ?')->execute([$providerId]);
            $insert = $this->db->prepare('INSERT INTO provider_categories (provider_id, category_id) VALUES (?, ?)');
            foreach ($categoryIds as $categoryId) $insert->execute([$providerId, (int) $categoryId]);
            $this->db->commit();
        } catch (\Throwable $exception) {
            $this->db->rollBack();
            throw $exception;
        }
        return ProviderJsonResponse::success($response, [], 'Categories updated successfully');
    }

    public function listJobs(Request $request, Response $response): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        if (!$providerId) return ProviderJsonResponse::error($response, 'Provider profile not found', [], 404);
        $stmt = $this->db->prepare('SELECT j.*, u.full_name AS customer_name FROM jobs j JOIN users u ON u.id = j.customer_id WHERE j.provider_id = ? ORDER BY j.scheduled_at ASC');
        $stmt->execute([$providerId]);
        $jobs = $stmt->fetchAll();
        if ($jobs) {
            $ids = array_map('intval', array_column($jobs, 'id'));
            $history = $this->db->prepare('SELECT job_id, status, MIN(changed_at) AS changed_at FROM job_status_history WHERE job_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ') GROUP BY job_id, status');
            $history->execute($ids);
            $byJob = [];
            foreach ($history->fetchAll() as $row) $byJob[$row['job_id']][$row['status']] = $row['changed_at'];
            foreach ($jobs as &$job) $job['timestamps'] = $byJob[$job['id']] ?? new \stdClass();
        }
        return ProviderJsonResponse::success($response, $jobs);
    }

    private function providerJob(int $jobId, int $providerId): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM jobs WHERE id = ? AND provider_id = ?');
        $stmt->execute([$jobId, $providerId]);
        return $stmt->fetch() ?: null;
    }

    private function recordStatus(int $jobId, string $status): void
    {
        $this->db->prepare('INSERT INTO job_status_history (job_id, status) VALUES (?, ?)')->execute([$jobId, $status]);
    }

    public function acceptJob(Request $request, Response $response, array $args): Response
    {
        return $this->changeRequestedJob($request, $response, (int) $args['id'], 'accepted');
    }

    public function rejectJob(Request $request, Response $response, array $args): Response
    {
        return $this->changeRequestedJob($request, $response, (int) $args['id'], 'rejected');
    }

    private function changeRequestedJob(Request $request, Response $response, int $jobId, string $status): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        $job = $providerId ? $this->providerJob($jobId, $providerId) : null;
        if (!$job) return ProviderJsonResponse::error($response, 'Job not found', [], 404);
        if ($job['status'] !== 'requested') return ProviderJsonResponse::error($response, 'Only requested jobs can be changed', [], 409);
        $this->db->prepare('UPDATE jobs SET status = ? WHERE id = ?')->execute([$status, $jobId]);
        $this->recordStatus($jobId, $status);
        return ProviderJsonResponse::success($response, [], $status === 'accepted' ? 'Job accepted' : 'Job rejected');
    }

    public function updateStatus(Request $request, Response $response, array $args): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        $job = $providerId ? $this->providerJob((int) $args['id'], $providerId) : null;
        if (!$job) return ProviderJsonResponse::error($response, 'Job not found', [], 404);
        $status = (string) (((array) $request->getParsedBody())['status'] ?? '');
        $transitions = ['accepted' => ['in_progress'], 'in_progress' => ['completed'], 'completed' => ['cost_pending'], 'cost_pending' => ['closed']];
        if (!in_array($status, $transitions[$job['status']] ?? [], true)) return ProviderJsonResponse::error($response, "Cannot move job from {$job['status']} to {$status}", [], 409);
        $this->db->prepare('UPDATE jobs SET status = ? WHERE id = ?')->execute([$status, $job['id']]);
        $this->recordStatus((int) $job['id'], $status);
        return ProviderJsonResponse::success($response, [], "Job status updated to {$status}");
    }

    public function submitFinalCost(Request $request, Response $response, array $args): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        $job = $providerId ? $this->providerJob((int) $args['id'], $providerId) : null;
        if (!$job) return ProviderJsonResponse::error($response, 'Job not found', [], 404);
        if (!in_array($job['status'], ['in_progress', 'completed'], true)) return ProviderJsonResponse::error($response, 'Final cost can only be submitted once work is in progress', [], 409);
        $body = (array) $request->getParsedBody();
        $labour = (float) ($body['labour_cost'] ?? 0);
        $materials = (float) ($body['materials_cost'] ?? 0);
        if ($labour <= 0) return ProviderJsonResponse::error($response, 'labour_cost must be greater than 0', [], 422);
        $final = $labour + $materials;
        $this->db->prepare("UPDATE jobs SET labour_cost = ?, materials_cost = ?, final_cost = ?, cost_note = ?, status = 'cost_pending' WHERE id = ?")->execute([$labour, $materials, $final, $body['note'] ?? null, $job['id']]);
        $this->recordStatus((int) $job['id'], 'cost_pending');
        return ProviderJsonResponse::success($response, ['final_cost' => $final], 'Final cost submitted for customer approval');
    }

    public function listAvailability(Request $request, Response $response): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        if (!$providerId) return ProviderJsonResponse::error($response, 'Provider profile not found', [], 404);
        $mode = $this->db->prepare('SELECT availability_mode FROM provider_profiles WHERE id = ?');
        $mode->execute([$providerId]);
        $dates = $this->db->prepare('SELECT id, blocked_date FROM provider_availability WHERE provider_id = ? ORDER BY blocked_date');
        $dates->execute([$providerId]);
        return ProviderJsonResponse::success($response, ['mode' => $mode->fetchColumn(), 'blocked_dates' => $dates->fetchAll()]);
    }

    public function addAvailability(Request $request, Response $response): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        $date = ((array) $request->getParsedBody())['blocked_date'] ?? null;
        if (!$providerId || !$date) return ProviderJsonResponse::error($response, 'blocked_date is required (YYYY-MM-DD)', [], 422);
        $this->db->prepare('INSERT IGNORE INTO provider_availability (provider_id, blocked_date) VALUES (?, ?)')->execute([$providerId, $date]);
        return ProviderJsonResponse::success($response, [], 'Date blocked successfully', 201);
    }

    public function updateAvailability(Request $request, Response $response, array $args): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        if (!$providerId) return ProviderJsonResponse::error($response, 'Provider profile not found', [], 404);
        $body = (array) $request->getParsedBody();
        if (isset($body['mode'])) $this->db->prepare('UPDATE provider_profiles SET availability_mode = ? WHERE id = ?')->execute([$body['mode'], $providerId]);
        if (isset($body['blocked_date'])) $this->db->prepare('UPDATE provider_availability SET blocked_date = ? WHERE id = ? AND provider_id = ?')->execute([$body['blocked_date'], (int) $args['id'], $providerId]);
        return ProviderJsonResponse::success($response, [], 'Availability updated');
    }

    public function deleteAvailability(Request $request, Response $response, array $args): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        if (!$providerId) return ProviderJsonResponse::error($response, 'Provider profile not found', [], 404);
        $this->db->prepare('DELETE FROM provider_availability WHERE id = ? AND provider_id = ?')->execute([(int) $args['id'], $providerId]);
        return ProviderJsonResponse::success($response, [], 'Blocked date removed');
    }

    public function earnings(Request $request, Response $response): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        $stmt = $this->db->prepare("SELECT COALESCE(SUM(CASE WHEN status IN ('closed','reviewed') THEN final_cost ELSE 0 END),0) withdrawable, COALESCE(SUM(CASE WHEN status = 'cost_pending' THEN final_cost ELSE 0 END),0) escrow, COALESCE(SUM(CASE WHEN final_cost IS NOT NULL THEN final_cost ELSE 0 END),0) lifetime FROM jobs WHERE provider_id = ?");
        $stmt->execute([$providerId]);
        return ProviderJsonResponse::success($response, $stmt->fetch());
    }

    public function reviews(Request $request, Response $response): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        $stmt = $this->db->prepare('SELECT r.id, r.rating, r.comment, r.created_at, u.full_name AS customer_name, j.service_title FROM reviews r JOIN users u ON u.id = r.customer_id JOIN jobs j ON j.id = r.job_id WHERE r.provider_id = ? ORDER BY r.created_at DESC');
        $stmt->execute([$providerId]);
        return ProviderJsonResponse::success($response, $stmt->fetchAll());
    }

    public function analytics(Request $request, Response $response): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        $stmt = $this->db->prepare("SELECT DATE_FORMAT(scheduled_at, '%Y-%m') month, COUNT(*) jobs_count, COALESCE(SUM(final_cost),0) earnings FROM jobs WHERE provider_id = ? GROUP BY DATE_FORMAT(scheduled_at, '%Y-%m') ORDER BY month");
        $stmt->execute([$providerId]);
        return ProviderJsonResponse::success($response, $stmt->fetchAll());
    }

    public function settings(Request $request, Response $response): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        $stmt = $this->db->prepare('SELECT max_radius, notifications FROM provider_settings WHERE provider_id = ?');
        $stmt->execute([$providerId]);
        return ProviderJsonResponse::success($response, $stmt->fetch() ?: ['max_radius' => 25, 'notifications' => 'In-App Push']);
    }

    public function updateSettings(Request $request, Response $response): Response
    {
        $providerId = $this->providerIdFor($this->userId($request));
        $body = (array) $request->getParsedBody();
        $stmt = $this->db->prepare('INSERT INTO provider_settings (provider_id, max_radius, notifications) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE max_radius = VALUES(max_radius), notifications = VALUES(notifications)');
        $stmt->execute([$providerId, (int) ($body['max_radius'] ?? 25), (string) ($body['notifications'] ?? 'In-App Push')]);
        return ProviderJsonResponse::success($response, [], 'Settings saved successfully');
    }

    public function withdraw(Request $request, Response $response): Response
    {
        return ProviderJsonResponse::success($response, [], 'Withdrawal request submitted', 202);
    }
}
