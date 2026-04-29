from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    redis_url: str

    cors_origins: str = "http://localhost:3000"

    # JWT Auth (HS256, internal tokens)
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 h

    # Admin seed
    admin_seed_email: str = "admin@clinic.com"
    admin_seed_password: str

    # Service-to-service API keys (CSV)
    service_api_keys: str = ""

    # Rate limiting
    rate_limit_per_minute: int = 60

    # ── TURN / coturn ─────────────────────────────────────────────────────────
    # Mode: "hmac" (self-hosted coturn w/ --use-auth-secret) or
    #       "static" (external provider like Metered with fixed credentials)
    turn_mode: str = "hmac"

    # "hmac" mode: shared secret must match coturn --static-auth-secret.
    turn_secret: str = ""

    # "static" mode: credentials returned verbatim to the client.
    turn_static_username: str = ""
    turn_static_password: str = ""
    # Comma-separated list of TURN URIs (e.g.
    #   "turn:openrelay.metered.ca:80,turn:openrelay.metered.ca:443")
    turn_static_uris: str = ""

    # Public host clients should use to reach coturn (hmac mode only).
    # Must match --realm for the long-term credential HMAC to validate.
    turn_host: str = "localhost"
    turn_realm: str = "localhost"
    turn_port: int = 3478
    turn_tls_port: int = 5349
    turn_tls_enabled: bool = False
    # How long the minted credential is valid for (seconds, hmac mode only).
    turn_ttl_seconds: int = 3600  # 1 hour is plenty for a call

    # ── Meeting join window ──────────────────────────────────────────────────
    # How early a party can join before `scheduled_at`.
    meeting_join_window_before_minutes: int = 15
    # How late a party can still join after `scheduled_at`.
    meeting_join_window_after_minutes: int = 120
    # When True, skip the time-window check (still blocks rejected/completed).
    # Useful for testing; keep False in production.
    meeting_skip_join_window_check: bool = False


settings = Settings()  # type: ignore
