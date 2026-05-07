-- ============================================
-- Checkout idempotency guards
-- Prevent duplicate orders for the same Stripe Checkout Session.
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_stripe_session_unique
  ON orders(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spin_events_stripe_session
  ON spin_events(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
