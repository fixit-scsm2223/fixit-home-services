<?php

declare(strict_types=1);

namespace FixIt\Provider;

use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class ChatController
{
    public function __construct(private PDO $db)
    {
    }

    private function accessibleJob(int $jobId, int $userId): ?array
    {
        $stmt = $this->db->prepare('SELECT j.id, j.status FROM jobs j JOIN provider_profiles pp ON pp.id = j.provider_id WHERE j.id = ? AND pp.user_id = ?');
        $stmt->execute([$jobId, $userId]);
        return $stmt->fetch() ?: null;
    }

    public function listMessages(Request $request, Response $response, array $args): Response
    {
        $jobId = (int) $args['id'];
        $userId = (int) $request->getAttribute('user_id');
        if (!$this->accessibleJob($jobId, $userId)) return ProviderJsonResponse::error($response, "You do not have access to this job's messages", [], 403);
        $stmt = $this->db->prepare('SELECT m.id, m.body, m.created_at, m.sender_id, u.full_name AS sender_name, (m.sender_id = ?) AS is_mine FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.job_id = ? ORDER BY m.created_at');
        $stmt->execute([$userId, $jobId]);
        return ProviderJsonResponse::success($response, $stmt->fetchAll());
    }

    public function sendMessage(Request $request, Response $response, array $args): Response
    {
        $jobId = (int) $args['id'];
        $userId = (int) $request->getAttribute('user_id');
        $body = trim((string) (((array) $request->getParsedBody())['body'] ?? ''));
        if ($body === '') return ProviderJsonResponse::error($response, 'Message body is required', [], 422);
        $job = $this->accessibleJob($jobId, $userId);
        if (!$job) return ProviderJsonResponse::error($response, "You do not have access to this job's messages", [], 403);
        if ($job['status'] === 'requested') return ProviderJsonResponse::error($response, 'Messaging unlocks once the job is accepted', [], 409);
        $this->db->prepare('INSERT INTO messages (job_id, sender_id, body) VALUES (?, ?, ?)')->execute([$jobId, $userId, $body]);
        return ProviderJsonResponse::success($response, [], 'Message sent', 201);
    }
}
