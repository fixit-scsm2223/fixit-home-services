<?php

declare(strict_types=1);

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use FixIt\Database;
use FixIt\JsonResponse;
use FixIt\Provider\ChatController;
use FixIt\Provider\ProviderController;
use FixIt\Provider\ProviderJsonResponse;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Factory\AppFactory;
use Slim\Routing\RouteCollectorProxy;
use Slim\Psr7\UploadedFile;
use App\Middleware\JwtAuthMiddleware;
use App\Middleware\RequireRole;

require dirname(__DIR__) . '/vendor/autoload.php';

function loadEnvFile(string $path): void
{
    if (!is_readable($path)) return;
    $values = parse_ini_file($path, false, INI_SCANNER_RAW);
    if (!is_array($values)) return;
    foreach ($values as $key => $value) {
        if (getenv((string) $key) !== false) continue;
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
    }
}

function envValue(string $key, string $default = ''): string
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

function envList(string $key, array $default = []): array
{
    $value = getenv($key);
    if ($value === false || trim($value) === '') return $default;
    return array_values(array_filter(array_map(
        static fn (string $item): string => trim($item),
        explode(',', $value)
    )));
}

function isAllowedOrigin(string $origin, array $allowedOrigins): bool
{
    if ($origin === '') return false;
    if (in_array($origin, $allowedOrigins, true)) return true;

    $parts = parse_url($origin);
    if (!is_array($parts)) return false;

    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $host = strtolower((string) ($parts['host'] ?? ''));

    if ($host !== 'localhost') return false;

    return in_array($scheme, ['http', 'https', 'capacitor', 'ionic'], true);
}

loadEnvFile(dirname(__DIR__) . '/.env');

$config = [
    'app_env' => envValue('APP_ENV', 'production'),
    'app_url' => envValue('APP_URL', 'http://localhost:5173'),
    'allowed_origins' => envList('APP_ALLOWED_ORIGINS', ['http://localhost:5173', 'http://localhost', 'https://localhost', 'capacitor://localhost', 'ionic://localhost']),
    'jwt_secret' => envValue('JWT_SECRET'),
    'jwt_ttl' => (int) envValue('JWT_TTL', '3600'),
    'db' => [
        'host' => envValue('DB_HOST', '127.0.0.1'),
        'port' => envValue('DB_PORT', '3306'),
        'name' => envValue('DB_NAME', 'fixit_db'),
        'user' => envValue('DB_USER', 'root'),
        'password' => envValue('DB_PASSWORD'),
    ],
];

if (strlen($config['jwt_secret']) < 32) {
    throw new RuntimeException('JWT_SECRET must contain at least 32 characters.');
}

$pdo = null;
$getPdo = static function () use (&$pdo, $config): PDO {
    if ($pdo instanceof PDO) return $pdo;
    $pdo = Database::connect($config['db']);
    return $pdo;
};

$withDatabase = static function (callable $callback) use ($getPdo): callable {
    return static function (Request $request, Response $response, array $args = []) use ($callback, $getPdo): Response {
        try {
            $pdo = $getPdo();
        } catch (Throwable $exception) {
            return JsonResponse::send(new Slim\Psr7\Response(), ['message' => 'The database service is unavailable.'], 503);
        }

        return $callback($pdo, $request, $response, $args);
    };
};

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();

// Unified PSR-15 auth middleware (replaces the previous inline $authenticate/$requireProvider closures).
$responseFactory = $app->getResponseFactory();
$jwtAuth = new JwtAuthMiddleware($responseFactory, $config['jwt_secret']);
$requireCustomerRole = new RequireRole($responseFactory, 'customer');
$requireProviderRole = new RequireRole($responseFactory, 'provider');
$requireAdminRole = new RequireRole($responseFactory, 'admin');

$app->add(function (Request $request, RequestHandlerInterface $handler) use ($config): Response {
    $origin = trim($request->getHeaderLine('Origin'));
    $allowOrigin = $config['app_url'];
    if (isAllowedOrigin($origin, $config['allowed_origins'])) {
        $allowOrigin = $origin;
    }
    if ($request->getMethod() === 'OPTIONS') {
        $response = new Slim\Psr7\Response(204);
    } else {
        $response = $handler->handle($request);
    }
    return $response
        ->withHeader('Access-Control-Allow-Origin', $allowOrigin)
        ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        ->withHeader('Vary', 'Origin');
});

$errorMiddleware = $app->addErrorMiddleware($config['app_env'] === 'development', true, true);
$errorMiddleware->setDefaultErrorHandler(function (Request $request, Throwable $exception) use ($app, $config): Response {
    if ($config['app_env'] === 'development') {
        return JsonResponse::send($app->getResponseFactory()->createResponse(), [
            'message' => $exception->getMessage(),
            'type' => $exception::class,
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
        ], 500);
    }

    $message = $exception instanceof PDOException ? 'A database error occurred.' : 'The server could not process the request.';
    return JsonResponse::send($app->getResponseFactory()->createResponse(), ['message' => $message], 500);
});

$app->get('/api/health', function (Request $request, Response $response): Response {
    return JsonResponse::send($response, ['ok' => true, 'service' => 'FixIt API']);
});

$validateRegistration = static function (array $data, array $files): array {
    $errors = [];
    foreach (['full_name', 'username', 'email', 'phone', 'password', 'password_confirmation', 'role'] as $field) {
        if (trim((string) ($data[$field] ?? '')) === '') $errors[$field] = 'This field is required.';
    }
    if (!filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Enter a valid email address.';
    if (!preg_match('/^[A-Za-z0-9_#.-]{3,30}$/', (string) ($data['username'] ?? ''))) $errors['username'] = 'Use 3-30 letters, numbers, or the symbols # . - _.';
    if (strlen((string) ($data['password'] ?? '')) < 8) $errors['password'] = 'Password must contain at least 8 characters.';
    if (($data['password'] ?? '') !== ($data['password_confirmation'] ?? null)) $errors['password_confirmation'] = 'Passwords do not match.';
    if (!in_array($data['role'] ?? '', ['customer', 'provider'], true)) $errors['role'] = 'Select a valid account role.';

    if (($data['role'] ?? '') === 'provider') {
        foreach (['bio', 'location', 'base_rate', 'service_category'] as $field) {
            if (trim((string) ($data[$field] ?? '')) === '') $errors[$field] = 'This provider field is required.';
        }
        if (!is_numeric($data['base_rate'] ?? null) || (float) $data['base_rate'] < 0) $errors['base_rate'] = 'Enter a valid non-negative rate.';
        if (!isset($files['kyc_document']) || $files['kyc_document']->getError() !== UPLOAD_ERR_OK) $errors['kyc_document'] = 'A valid KYC document is required.';
    }
    return $errors;
};

$validateKyc = static function (UploadedFile $file): array {
    if ($file->getSize() === null || $file->getSize() > 5 * 1024 * 1024) throw new InvalidArgumentException('The KYC document must be 5 MB or smaller.');
    $clientName = $file->getClientFilename() ?? '';
    $extension = strtolower(pathinfo($clientName, PATHINFO_EXTENSION));
    $allowed = ['pdf' => 'application/pdf', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png'];
    if (!isset($allowed[$extension])) throw new InvalidArgumentException('Only PDF, JPG, JPEG, or PNG files are allowed.');

    $stream = $file->getStream();
    $stream->rewind();
    $contents = $stream->getContents();
    $mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($contents);
    if ($mime !== $allowed[$extension]) throw new InvalidArgumentException('The KYC file content does not match its extension.');
    return [$extension, $contents];
};

$app->post('/api/auth/register', $withDatabase(function (PDO $pdo, Request $request, Response $response) use ($config, $validateRegistration, $validateKyc): Response {
    $data = $request->getParsedBody() ?: [];
    $files = $request->getUploadedFiles();
    $errors = $validateRegistration($data, $files);
    if ($errors) return JsonResponse::error($response, 'Please correct the highlighted details.', $errors, 422);

    $check = $pdo->prepare('SELECT id FROM users WHERE username = :username OR email = :email LIMIT 1');
    $check->execute(['username' => strtolower(trim($data['username'])), 'email' => strtolower(trim($data['email']))]);
    if ($check->fetch()) return JsonResponse::error($response, 'That username or email is already registered.', [], 409);

    $otp = (string) random_int(100000, 999999);
    $kycPath = null;
    try {
        $pdo->beginTransaction();
        $statement = $pdo->prepare('INSERT INTO users (full_name, username, email, phone, password_hash, role, otp_code_hash, otp_expires_at) VALUES (:full_name, :username, :email, :phone, :password_hash, :role, :otp_hash, DATE_ADD(NOW(), INTERVAL 10 MINUTE))');
        $statement->execute([
            'full_name' => trim($data['full_name']), 'username' => strtolower(trim($data['username'])),
            'email' => strtolower(trim($data['email'])), 'phone' => trim($data['phone']),
            'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT), 'role' => $data['role'],
            'otp_hash' => password_hash($otp, PASSWORD_DEFAULT),
        ]);
        $userId = (int) $pdo->lastInsertId();

        if ($data['role'] === 'provider') {
            [$extension, $contents] = $validateKyc($files['kyc_document']);
            $storage = dirname(__DIR__) . '/storage/kyc';
            if (!is_dir($storage) && !mkdir($storage, 0750, true) && !is_dir($storage)) throw new RuntimeException('KYC storage is unavailable.');
            $filename = bin2hex(random_bytes(24)) . '.' . $extension;
            $kycPath = $storage . DIRECTORY_SEPARATOR . $filename;
            if (file_put_contents($kycPath, $contents, LOCK_EX) === false) throw new RuntimeException('The KYC document could not be stored.');

            $profile = $pdo->prepare('INSERT INTO provider_profiles (user_id, bio, location, base_rate, service_category, kyc_document_path, kyc_original_name, kyc_status) VALUES (:user_id, :bio, :location, :base_rate, :category, :path, :original_name, :status)');
            $profile->execute(['user_id' => $userId, 'bio' => trim($data['bio']), 'location' => trim($data['location']), 'base_rate' => $data['base_rate'], 'category' => trim($data['service_category']), 'path' => $filename, 'original_name' => basename($files['kyc_document']->getClientFilename() ?? 'document'), 'status' => 'pending']);
        }
        $pdo->commit();
    } catch (InvalidArgumentException $exception) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($kycPath && is_file($kycPath)) unlink($kycPath);
        return JsonResponse::error($response, $exception->getMessage(), ['kyc_document' => $exception->getMessage()], 422);
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        if ($kycPath && is_file($kycPath)) unlink($kycPath);
        throw $exception;
    }

    // Connect a transactional email provider here; never return OTP values in production.
    $payload = ['otp_required' => true];
    if ($config['app_env'] === 'development') $payload['development_otp'] = $otp;
    return JsonResponse::success($response, $payload, 'Account created. Enter the verification code sent to your email.', 201);
}));

$app->post('/api/auth/login', $withDatabase(function (PDO $pdo, Request $request, Response $response) use ($config): Response {
    $data = (array) ($request->getParsedBody() ?: []);

    $statement = $pdo->prepare('SELECT id, full_name, username, email, password_hash, role, email_verified_at, status FROM users WHERE username = :username LIMIT 1');
    $statement->execute(['username' => strtolower(trim((string) ($data['username'] ?? '')))]);
    $user = $statement->fetch();
    if (!$user || !password_verify((string) ($data['password'] ?? ''), $user['password_hash'])) {
        return JsonResponse::error($response, 'The username or password is incorrect.', [], 401);
    }
    if ($user['status'] !== 'active') return JsonResponse::error($response, 'This account is not active.', [], 403);

    $now = time();
    $token = JWT::encode(['iss' => $config['app_url'], 'sub' => (string) $user['id'], 'role' => $user['role'], 'iat' => $now, 'exp' => $now + $config['jwt_ttl'], 'jti' => bin2hex(random_bytes(16))], $config['jwt_secret'], 'HS256');
    unset($user['password_hash'], $user['status'], $user['email_verified_at']);
    return JsonResponse::success($response, ['token' => $token, 'token_type' => 'Bearer', 'expires_in' => $config['jwt_ttl'], 'user' => $user], 'Login successful.');
}));

$app->get('/api/auth/me', $withDatabase(function (PDO $pdo, Request $request, Response $response): Response {
    $statement = $pdo->prepare('SELECT id, full_name, username, email, phone, role FROM users WHERE id = :id AND status = :status LIMIT 1');
    $statement->execute(['id' => (int) $request->getAttribute('user_id'), 'status' => 'active']);
    $user = $statement->fetch();
    if (!$user) return JsonResponse::error($response, 'Account unavailable.', [], 401);
    return JsonResponse::success($response, ['user' => $user], 'Authenticated.');
}))->add($jwtAuth);

$app->post('/api/auth/logout', function (Request $request, Response $response): Response {
    // JWT is stateless. Add the jti to a server-side denylist here if immediate revocation is required.
    return JsonResponse::success($response, [], 'Logged out successfully.');
})->add($jwtAuth);

$app->post('/api/auth/verify-otp', $withDatabase(function (PDO $pdo, Request $request, Response $response): Response {
    $data = (array) ($request->getParsedBody() ?: []);
    $statement = $pdo->prepare('SELECT id, otp_code_hash, otp_expires_at FROM users WHERE email = :email LIMIT 1');
    $statement->execute(['email' => strtolower(trim((string) ($data['email'] ?? '')))]);
    $user = $statement->fetch();
    if (!$user || !$user['otp_code_hash'] || strtotime($user['otp_expires_at']) < time() || !password_verify((string) ($data['otp'] ?? ''), $user['otp_code_hash'])) return JsonResponse::error($response, 'The verification code is invalid or expired.', [], 422);
    $update = $pdo->prepare('UPDATE users SET email_verified_at = NOW(), otp_code_hash = NULL, otp_expires_at = NULL WHERE id = :id');
    $update->execute(['id' => $user['id']]);
    return JsonResponse::success($response, [], 'Account verified. You can now sign in.');
}));

$app->post('/api/auth/forgot-password', $withDatabase(function (PDO $pdo, Request $request, Response $response): Response {
    $data = (array) ($request->getParsedBody() ?: []);
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return JsonResponse::error($response, 'Enter a valid email address.', [], 422);
    $token = bin2hex(random_bytes(32));
    $statement = $pdo->prepare('UPDATE users SET reset_token_hash = :token_hash, reset_expires_at = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE email = :email');
    $statement->execute(['token_hash' => hash('sha256', $token), 'email' => $email]);
    // Connect the mailer here and send the raw token only to the account owner's email.
    return JsonResponse::success($response, [], 'If that email is registered, password reset instructions have been sent.');
}));

$providerFactory = static function () use ($getPdo): ProviderController {
    return new ProviderController($getPdo(), dirname(__DIR__) . '/storage/kyc');
};

$chatFactory = static function () use ($getPdo): ChatController {
    return new ChatController($getPdo());
};

$app->group('/api/provider', function (RouteCollectorProxy $group) use ($providerFactory): void {
    $group->post('/profile', fn (Request $request, Response $response): Response => $providerFactory()->createProfile($request, $response));
    $group->get('/profile', fn (Request $request, Response $response): Response => $providerFactory()->getProfile($request, $response));
    $group->put('/profile', fn (Request $request, Response $response): Response => $providerFactory()->updateProfile($request, $response));
    $group->post('/kyc', fn (Request $request, Response $response): Response => $providerFactory()->uploadKyc($request, $response));
    $group->get('/kyc/download', fn (Request $request, Response $response): Response => $providerFactory()->downloadKyc($request, $response));
    $group->put('/categories', fn (Request $request, Response $response): Response => $providerFactory()->updateCategories($request, $response));
    $group->get('/jobs', fn (Request $request, Response $response): Response => $providerFactory()->listJobs($request, $response));
    $group->get('/availability', fn (Request $request, Response $response): Response => $providerFactory()->listAvailability($request, $response));
    $group->post('/availability', fn (Request $request, Response $response): Response => $providerFactory()->addAvailability($request, $response));
    $group->put('/availability/{id}', fn (Request $request, Response $response, array $args): Response => $providerFactory()->updateAvailability($request, $response, $args));
    $group->delete('/availability/{id}', fn (Request $request, Response $response, array $args): Response => $providerFactory()->deleteAvailability($request, $response, $args));
    $group->get('/earnings', fn (Request $request, Response $response): Response => $providerFactory()->earnings($request, $response));
    $group->post('/earnings/withdraw', fn (Request $request, Response $response): Response => $providerFactory()->withdraw($request, $response));
    $group->get('/reviews', fn (Request $request, Response $response): Response => $providerFactory()->reviews($request, $response));
    $group->get('/analytics', fn (Request $request, Response $response): Response => $providerFactory()->analytics($request, $response));
    $group->get('/settings', fn (Request $request, Response $response): Response => $providerFactory()->settings($request, $response));
    $group->put('/settings', fn (Request $request, Response $response): Response => $providerFactory()->updateSettings($request, $response));
})->add($requireProviderRole)->add($jwtAuth);

$app->group('/api/jobs', function (RouteCollectorProxy $group) use ($providerFactory, $chatFactory): void {
    $group->put('/{id}/accept', fn (Request $request, Response $response, array $args): Response => $providerFactory()->acceptJob($request, $response, $args));
    $group->put('/{id}/reject', fn (Request $request, Response $response, array $args): Response => $providerFactory()->rejectJob($request, $response, $args));
    $group->put('/{id}/status', fn (Request $request, Response $response, array $args): Response => $providerFactory()->updateStatus($request, $response, $args));
    $group->put('/{id}/final-cost', fn (Request $request, Response $response, array $args): Response => $providerFactory()->submitFinalCost($request, $response, $args));
    $group->get('/{id}/messages', fn (Request $request, Response $response, array $args): Response => $chatFactory()->listMessages($request, $response, $args));
    $group->post('/{id}/messages', fn (Request $request, Response $response, array $args): Response => $chatFactory()->sendMessage($request, $response, $args));
})->add($requireProviderRole)->add($jwtAuth);

// ── Customer domain: public browsing (member1) + protected booking/reviews (member2) ──
$catalogCategories = static fn (): \App\Controllers\CategoryController => new \App\Controllers\CategoryController($getPdo());
$catalogProviders  = static fn (): \App\Controllers\ProviderController => new \App\Controllers\ProviderController($getPdo());
$bookings = static fn (): \App\Controllers\BookingController => new \App\Controllers\BookingController($getPdo());
$reviews  = static fn (): \App\Controllers\ReviewController => new \App\Controllers\ReviewController($getPdo());

// Public browsing — no auth (declare /nearby before /{id})
$app->group('/api', function (RouteCollectorProxy $group) use ($catalogCategories, $catalogProviders): void {
    $group->get('/categories', fn (Request $request, Response $response): Response => $catalogCategories()->index($request, $response));
    $group->get('/providers/nearby', fn (Request $request, Response $response): Response => $catalogProviders()->nearby($request, $response));
    $group->get('/providers', fn (Request $request, Response $response): Response => $catalogProviders()->index($request, $response));
    $group->get('/providers/{id:[0-9]+}', fn (Request $request, Response $response, array $args): Response => $catalogProviders()->show($request, $response, $args));
    $group->get('/providers/{id:[0-9]+}/reviews', fn (Request $request, Response $response, array $args): Response => $catalogProviders()->reviews($request, $response, $args));
});

// Customer-only — booking workflow, job tickets, reviews
$app->group('/api', function (RouteCollectorProxy $group) use ($bookings, $reviews): void {
    $group->get('/bookings', fn (Request $request, Response $response): Response => $bookings()->index($request, $response));
    $group->post('/bookings', fn (Request $request, Response $response): Response => $bookings()->create($request, $response));
    $group->get('/bookings/{id:[0-9]+}', fn (Request $request, Response $response, array $args): Response => $bookings()->show($request, $response, $args));
    $group->patch('/bookings/{id:[0-9]+}/confirm-cost', fn (Request $request, Response $response, array $args): Response => $bookings()->confirmCost($request, $response, $args));
    $group->patch('/bookings/{id:[0-9]+}/cancel', fn (Request $request, Response $response, array $args): Response => $bookings()->cancel($request, $response, $args));
    $group->patch('/bookings/{id:[0-9]+}/cancel-series', fn (Request $request, Response $response, array $args): Response => $bookings()->cancelSeries($request, $response, $args));
    $group->post('/bookings/{id:[0-9]+}/review', fn (Request $request, Response $response, array $args): Response => $reviews()->store($request, $response, $args));
    $group->get('/reviews', fn (Request $request, Response $response): Response => $reviews()->index($request, $response));
})->add($requireCustomerRole)->add($jwtAuth);

// ── Payment routes ─────────────────────────────────────────────────────────
$payment = static fn (): \App\Controllers\PaymentController => new \App\Controllers\PaymentController($getPdo());

// All three payment routes are customer-only — the customer creates the intent and pays.
$app->group('/api/payment', function (RouteCollectorProxy $group) use ($payment): void {
    $group->post('/create-intent',        fn (Request $request, Response $response): Response => $payment()->createIntent($request, $response));
    $group->post('/confirm',              fn (Request $request, Response $response): Response => $payment()->confirm($request, $response));
    $group->get('/pending-for-customer',  fn (Request $request, Response $response): Response => $payment()->pendingForCustomer($request, $response));
})->add($requireCustomerRole)->add($jwtAuth);

// ── Admin ───────────────────────────────────────────────────────────────────
$admin = static fn (): \App\Controllers\AdminController => new \App\Controllers\AdminController($getPdo());

$app->group('/api/admin', function (RouteCollectorProxy $group) use ($admin): void {
    $group->get('/bootstrap', fn (Request $request, Response $response): Response => $admin()->bootstrap($request, $response));
    $group->patch('/providers/{id}/status', fn (Request $request, Response $response, array $args): Response => $admin()->updateProviderStatus($request, $response, $args));
    $group->patch('/users/{id}/status', fn (Request $request, Response $response, array $args): Response => $admin()->updateUserStatus($request, $response, $args));
    $group->patch('/jobs/{id}/admin-note', fn (Request $request, Response $response, array $args): Response => $admin()->updateJobNote($request, $response, $args));
    $group->put('/safety-notes', fn (Request $request, Response $response): Response => $admin()->replaceSafetyNotes($request, $response));
})->add($requireAdminRole)->add($jwtAuth);

$app->options('/{routes:.+}', fn (Request $request, Response $response): Response => $response);
$app->run();
