<?php
declare(strict_types=1);

namespace App\Middleware;

use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as Handler;

final class RequireRole implements MiddlewareInterface
{
    public function __construct(
        private ResponseFactoryInterface $responses,
        private string $role,
    ) {
    }

    public function process(Request $request, Handler $handler): Response
    {
        if ($request->getAttribute('role') !== $this->role) {
            $response = $this->responses->createResponse(403);
            $response->getBody()->write(json_encode([
                'success' => false,
                'message' => "This action requires the '{$this->role}' role.",
                'errors' => [],
            ]));
            return $response->withHeader('Content-Type', 'application/json');
        }

        return $handler->handle($request);
    }
}
