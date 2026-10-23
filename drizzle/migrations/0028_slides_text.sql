-- Let the private slides bucket also hold one plain-text file: the SQL class's
-- business case (SQLBusinessCase.sql), which the /sql page reads after sign-in.
-- It holds a company's real figures and a classmate's name, so it lives in each
-- user's own private folder rather than in this public repository.
-- File names are still limited by lib/coding/slides.ts; only the type list grows.
--
-- Safe to run twice.

update storage.buckets
set allowed_mime_types = array['application/pdf', 'text/plain']
where id = 'coding-slides';
