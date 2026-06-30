<?php
declare(strict_types=1);

namespace App\Controllers;

use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * ProviderController (Member 1)
 *
 * Public, read-only endpoints for browsing and filtering verified
 * providers. All queries use PDO prepared statements (no string
 * interpolation of user input) per the project security rules.
 *
 * Rating is derived from the reviews table. Reviews link to jobs,
 * and jobs link to a provider, so the average rating and review
 * count are aggregated through that path.
 */
class ProviderController
{
    public function __construct(private PDO $db) {}

    /**
     * GET /providers
     * Filters (all optional, all validated):
     *   category_id   int      only providers offering this category
     *   min_price     float    base_rate floor
     *   max_price     float    base_rate ceiling
     *   min_rating    float    average rating floor (0–5)
     *   max_distance  float    km radius from lat/lng (requires lat+lng)
     *   lat,lng       float    customer location for distance calc
     *   search        string   matches name / bio / location
     *   sort          enum     rating | price_asc | price_desc | distance
     *
     * Only verified providers are ever returned to customers.
     */
    public function index(Request $request, Response $response): Response
    {
        $q = $request->getQueryParams();

        // --- Parse + clamp inputs (defensive defaults) ---
        $categoryId  = isset($q['category_id']) && $q['category_id'] !== '' ? (int) $q['category_id'] : null;
        $minPrice    = isset($q['min_price'])   ? max(0.0, (float) $q['min_price']) : null;
        $maxPrice    = isset($q['max_price'])   ? (float) $q['max_price'] : null;
        $minRating   = isset($q['min_rating'])  ? min(5.0, max(0.0, (float) $q['min_rating'])) : null;
        $maxDistance = isset($q['max_distance']) ? max(0.0, (float) $q['max_distance']) : null;
        $lat         = isset($q['lat']) && $q['lat'] !== '' ? (float) $q['lat'] : null;
        $lng         = isset($q['lng']) && $q['lng'] !== '' ? (float) $q['lng'] : null;
        $search      = isset($q['search']) ? trim((string) $q['search']) : '';
        $sort        = $q['sort'] ?? 'rating';

        $hasGeo = $lat !== null && $lng !== null;

        // --- Build SELECT ---
        // Haversine in SQL when we have a customer location; otherwise NULL.
        // 6371 = Earth radius in km. Bound params used for the coordinates.
        $distanceSelect = $hasGeo
            ? '(6371 * ACOS(
                    LEAST(1, COS(RADIANS(:lat)) * COS(RADIANS(pp.latitude)) *
                    COS(RADIANS(pp.longitude) - RADIANS(:lng)) +
                    SIN(RADIANS(:lat)) * SIN(RADIANS(pp.latitude)))
               )) AS distance'
            : 'NULL AS distance';

        $sql = "
            SELECT
                pp.id,
                u.full_name AS name,
                pp.bio,
                pp.location,
                pp.latitude,
                pp.longitude,
                pp.base_rate,
                pp.photo_url,
                CASE pp.kyc_status
                    WHEN 'approved' THEN 'verified'
                    WHEN 'rejected' THEN 'rejected'
                    ELSE 'pending'
                END AS verification_status,
                COALESCE(AVG(r.rating), 0)  AS rating,
                COUNT(DISTINCT r.id)        AS total_reviews,
                $distanceSelect
            FROM provider_profiles pp
            JOIN users u            ON u.id = pp.user_id
            LEFT JOIN jobs j        ON j.provider_id = pp.id
            LEFT JOIN reviews r     ON r.job_id = j.id
        ";

        $params = [];
        if ($hasGeo) {
            $params[':lat'] = $lat;
            $params[':lng'] = $lng;
        }

        // Category filter needs an EXISTS subquery against the join table,
        // so it doesn't multiply rows in the rating aggregation.
        $where = ["pp.kyc_status = 'approved'", "u.status = 'active'"];
        if ($categoryId !== null) {
            $where[] = 'EXISTS (
                SELECT 1 FROM provider_categories pc
                WHERE pc.provider_id = pp.id AND pc.category_id = :category_id
            )';
            $params[':category_id'] = $categoryId;
        }
        if ($minPrice !== null) {
            $where[] = 'pp.base_rate >= :min_price';
            $params[':min_price'] = $minPrice;
        }
        if ($maxPrice !== null) {
            $where[] = 'pp.base_rate <= :max_price';
            $params[':max_price'] = $maxPrice;
        }
        if ($search !== '') {
            $where[] = '(u.full_name LIKE :search OR pp.bio LIKE :search OR pp.location LIKE :search)';
            $params[':search'] = '%' . $search . '%';
        }

        $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' GROUP BY pp.id, u.full_name, pp.bio, pp.location, pp.latitude,
                           pp.longitude, pp.base_rate, pp.photo_url, pp.kyc_status';

        // Rating + distance are aggregates/derived, so they go in HAVING.
        $having = [];
        if ($minRating !== null) {
            $having[] = 'rating >= :min_rating';
            $params[':min_rating'] = $minRating;
        }
        if ($maxDistance !== null && $hasGeo) {
            $having[] = 'distance <= :max_distance';
            $params[':max_distance'] = $maxDistance;
        }
        if ($having) {
            $sql .= ' HAVING ' . implode(' AND ', $having);
        }

        // Sort — whitelist mapping so no user string ever hits the SQL.
        $sql .= ' ORDER BY ' . $this->orderClause($sort, $hasGeo);

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Attach each provider's categories (one extra query, mapped in PHP).
        $rows = $this->attachCategories($rows);

        return $this->json($response, true, 'Providers retrieved successfully', $rows);
    }

    /** GET /providers/{id} — single verified provider with categories. */
    public function show(Request $request, Response $response, array $args): Response
    {
        $id = (int) $args['id'];

        $stmt = $this->db->prepare("
            SELECT
                pp.id,
                u.full_name AS name,
                pp.bio, pp.location, pp.latitude, pp.longitude,
                pp.base_rate, pp.photo_url,
                CASE pp.kyc_status
                    WHEN 'approved' THEN 'verified'
                    WHEN 'rejected' THEN 'rejected'
                    ELSE 'pending'
                END AS verification_status,
                COALESCE(AVG(r.rating), 0) AS rating,
                COUNT(DISTINCT r.id)       AS total_reviews
            FROM provider_profiles pp
            JOIN users u        ON u.id = pp.user_id
            LEFT JOIN jobs j    ON j.provider_id = pp.id
            LEFT JOIN reviews r ON r.job_id = j.id
            WHERE pp.id = :id
            GROUP BY pp.id, u.full_name, pp.bio, pp.location, pp.latitude,
                     pp.longitude, pp.base_rate, pp.photo_url, pp.kyc_status
        ");
        $stmt->execute([':id' => $id]);
        $provider = $stmt->fetch();

        if (!$provider) {
            return $this->json($response, false, 'Provider not found', [], 404);
        }

        $provider = $this->attachCategories([$provider])[0];
        return $this->json($response, true, 'Provider retrieved successfully', $provider);
    }

    /** GET /providers/{id}/reviews — reviews for a provider via its jobs. */
    public function reviews(Request $request, Response $response, array $args): Response
    {
        $id = (int) $args['id'];

        $stmt = $this->db->prepare('
            SELECT r.id, r.rating, r.comment, r.created_at
            FROM reviews r
            JOIN jobs j ON j.id = r.job_id
            WHERE j.provider_id = :id
            ORDER BY r.created_at DESC
        ');
        $stmt->execute([':id' => $id]);

        return $this->json($response, true, 'Reviews retrieved successfully', $stmt->fetchAll());
    }

    /**
     * GET /providers/nearby?lat=&lng=&radius=
     * Convenience endpoint for the map feature — verified providers
     * within `radius` km, nearest first. Delegates to the same
     * distance logic as the listing.
     */
    public function nearby(Request $request, Response $response): Response
    {
        $q      = $request->getQueryParams();
        $lat    = isset($q['lat']) ? (float) $q['lat'] : null;
        $lng    = isset($q['lng']) ? (float) $q['lng'] : null;
        $radius = isset($q['radius']) ? max(0.0, (float) $q['radius']) : 10.0;

        if ($lat === null || $lng === null) {
            return $this->json($response, false, 'lat and lng are required', [], 422);
        }

        $stmt = $this->db->prepare("
            SELECT
                pp.id,
                u.full_name AS name,
                pp.location, pp.latitude, pp.longitude,
                pp.base_rate,
                CASE pp.kyc_status
                    WHEN 'approved' THEN 'verified'
                    WHEN 'rejected' THEN 'rejected'
                    ELSE 'pending'
                END AS verification_status,
                COALESCE(AVG(r.rating), 0) AS rating,
                (6371 * ACOS(
                    LEAST(1, COS(RADIANS(:lat)) * COS(RADIANS(pp.latitude)) *
                    COS(RADIANS(pp.longitude) - RADIANS(:lng)) +
                    SIN(RADIANS(:lat)) * SIN(RADIANS(pp.latitude)))
                )) AS distance
            FROM provider_profiles pp
            JOIN users u        ON u.id = pp.user_id
            LEFT JOIN jobs j    ON j.provider_id = pp.id
            LEFT JOIN reviews r ON r.job_id = j.id
            WHERE pp.kyc_status = 'approved'
              AND u.status = 'active'
              AND pp.latitude IS NOT NULL AND pp.longitude IS NOT NULL
            GROUP BY pp.id, u.full_name, pp.location, pp.latitude, pp.longitude,
                     pp.base_rate, pp.kyc_status
            HAVING distance <= :radius
            ORDER BY distance ASC
        ");
        $stmt->execute([':lat' => $lat, ':lng' => $lng, ':radius' => $radius]);

        return $this->json($response, true, 'Nearby providers retrieved successfully', $stmt->fetchAll());
    }

    // ---------- helpers ----------

    /** Whitelisted ORDER BY to keep user input out of the SQL string. */
    private function orderClause(string $sort, bool $hasGeo): string
    {
        return match ($sort) {
            'price_asc'  => 'pp.base_rate ASC',
            'price_desc' => 'pp.base_rate DESC',
            'distance'   => $hasGeo ? 'distance ASC' : 'rating DESC',
            default      => 'rating DESC',
        };
    }

    /** Bulk-load categories for the given provider rows and attach them. */
    private function attachCategories(array $providers): array
    {
        if (!$providers) return $providers;

        $ids = array_column($providers, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $stmt = $this->db->prepare("
            SELECT pc.provider_id, sc.id, sc.name
            FROM provider_categories pc
            JOIN service_categories sc ON sc.id = pc.category_id
            WHERE pc.provider_id IN ($placeholders)
        ");
        $stmt->execute($ids);

        $map = [];
        foreach ($stmt->fetchAll() as $row) {
            $map[$row['provider_id']][] = ['id' => (int) $row['id'], 'name' => $row['name']];
        }

        foreach ($providers as &$p) {
            $p['categories'] = $map[$p['id']] ?? [];
            // Normalise numeric types for clean JSON.
            $p['rating']        = round((float) $p['rating'], 1);
            $p['total_reviews'] = (int) $p['total_reviews'];
            $p['base_rate']     = (float) $p['base_rate'];
            if (isset($p['distance']) && $p['distance'] !== null) {
                $p['distance'] = round((float) $p['distance'], 2);
            }
        }
        return $providers;
    }

    private function json(Response $response, bool $success, string $message, $data = [], int $status = 200): Response
    {
        $response->getBody()->write(json_encode([
            'success' => $success,
            'message' => $message,
            'data'    => $data,
        ]));
        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }
}
