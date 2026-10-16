-- Runs once, on first start of an empty volume. Test suites wipe their data,
-- so each gets its own database instead of sharing the development one.
CREATE DATABASE profiles_test OWNER profiles; -- server integration tests (npm test in server/)
CREATE DATABASE profiles_e2e OWNER profiles;  -- browser end-to-end tests (e2e/)
