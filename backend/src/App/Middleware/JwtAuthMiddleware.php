<?php
declare(strict_types=1);

namespace App\Middleware;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;

final class JwtAuthMiddleware implements MiddlewareInterface
{
    public function __construct(
        private ResponseFactoryInterface $responses,
        private string $secret,
    ) {
    }

    public function process(Request $request, Handler $handler): Response
    {
        $header = $request->getHeaderLine('Authorization');
        if (!preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
            return $this->unauthorized('Missing or malformed Authorization header.');
        }

        try {
            $payload = JWT::decode($m[1], new Key($this->secret, 'HS256'));
        } catch (ExpiredException) {
            return $this->unauthorized('Token has expired.');
        } catch (SignatureInvalidException) {
            return $this->unauthorized('Invalid token signature.');
        } catch (\Throwable) {
            return $this->unauthorized('Invalid token.');
        }

        if (empty($payload->sub) || empty($payload->role)) {
            return $this->unauthorized('Token is missing required claims.');
        }

        $request = $request
            ->withAttribute('user_id', (int) $payload->sub)
            ->withAttribute('role', (string) $payload->role);

        return $handler->handle($request);
    }

    private function unauthorized(string $message): Response
    {
        $response = $this->responses->createResponse(401);
        $response->getBody()->write(json_encode([
            'success' => false,
            'message' => $message,
            'errors' => [],
        ]));
        return $response->withHeader('Content-Type', 'application/json');
    }
}
