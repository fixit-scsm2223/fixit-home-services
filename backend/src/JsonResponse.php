<?php

declare(strict_types=1);

namespace FixIt;

use Psr\Http\Message\ResponseInterface;

final class JsonResponse
{
    public static function send(ResponseInterface $response, array $data, int $status = 200): ResponseInterface
    {
        $response->getBody()->write((string) json_encode($data, JSON_UNESCAPED_SLASHES));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status);
    }

    /** Standard success envelope: { success: true, message, data }. */
    public static function success(ResponseInterface $response, mixed $data = [], string $message = 'OK', int $status = 200): ResponseInterface
    {
        return self::send($response, ['success' => true, 'message' => $message, 'data' => $data], $status);
    }

    /** Standard error envelope: { success: false, message, errors }. */
    public static function error(ResponseInterface $response, string $message, array $errors = [], int $status = 400): ResponseInterface
    {
        return self::send($response, ['success' => false, 'message' => $message, 'errors' => $errors], $status);
    }
}
