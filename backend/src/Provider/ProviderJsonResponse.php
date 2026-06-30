<?php

declare(strict_types=1);

namespace FixIt\Provider;

use Psr\Http\Message\ResponseInterface;

final class ProviderJsonResponse
{
    public static function success(ResponseInterface $response, mixed $data = [], string $message = 'Action completed successfully', int $status = 200): ResponseInterface
    {
        return self::write($response, ['success' => true, 'message' => $message, 'data' => $data], $status);
    }

    public static function error(ResponseInterface $response, string $message, array $errors = [], int $status = 400): ResponseInterface
    {
        return self::write($response, ['success' => false, 'message' => $message, 'errors' => $errors], $status);
    }

    private static function write(ResponseInterface $response, array $payload, int $status): ResponseInterface
    {
        $response->getBody()->write((string) json_encode($payload, JSON_UNESCAPED_SLASHES));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
    }
}
