#!/usr/bin/env python3
"""Legacy Touchline-only private bridge is intentionally disabled in MatchXI.

The original bridge endpoint is not a MatchXI API. Do not send credentials or
requests to the original production service. Implement and test a separate
MatchXI-specific bridge only after explicit authorization.
"""
raise SystemExit('Legacy Touchline bridge disabled for MatchXI; no network request was made.')
