VERSION = "0.1.0"
HAS_JSONB = (Rails.configuration.database_configuration[Rails.env]["adapter"] == "postgresql")

LOCATION_PREFIX = "@"
DEFAULT_LOCATION = "https://oydid.ownyourdata.eu"
LOG_HASH_OPTIONS = {:digest => "sha2-256", :encode => "base58btc"}

LOGLEVELS = %w[DEBUG INFO WARN ERROR FATAL UNKNOWN]