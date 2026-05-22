ALTER TABLE clientes ADD COLUMN IF NOT EXISTS token text UNIQUE;
UPDATE clientes SET token = substr(md5(random()::text), 1, 32) WHERE token IS NULL;
