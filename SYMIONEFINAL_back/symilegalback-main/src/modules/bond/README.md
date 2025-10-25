# Bond (Escrow) Module

This module integrates Escrow (Bond) features into the monolith.

- Routes live under Next Pages API for webhook/raw-body handling.
- Domain logic is framework-agnostic in services.
- Shares Prisma schema, Stripe keys, and AI libs with the monolith.
- Feature flag: FEATURE_BOND=1 to expose routes.
