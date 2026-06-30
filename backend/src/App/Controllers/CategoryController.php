<?php
declare(strict_types=1);

namespace App\Controllers;

use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * CategoryController (Member 1)
 * Public, read-only endpoints for the service category catalogue.
 */
class CategoryController
{
    public function __construct(private PDO $db) {}

    /** GET /categories — list all service categories. */
    public function index(Request $request, Response $response): Response
    {
        $stmt = $this->db->query(
            'SELECT id, name, description, icon_url, created_at
             FROM service_categories
             ORDER BY name ASC'
        );
        $categories = $stmt->fetchAll();

        return $this->json($response, true, 'Categories retrieved successfully', $categories);
    }

    /**
     * Shared JSON envelope matching docs/api-contract.md:
     * { success, message, data }
     */
    private function json(Response $response, bool $success, string $message, $data = [], int $status = 200): Response
    {
        $payload = json_encode([
            'success' => $success,
            'message' => $message,
            'data'    => $data,
        ]);
        $response->getBody()->write($payload);
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
