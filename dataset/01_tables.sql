CREATE TABLE IF NOT EXISTS public.users
(
    id SERIAL NOT NULL PRIMARY KEY,
    name varchar(100)  NOT NULL,
    role varchar(15)  NOT NULL,
    email varchar(100)  NOT NULL,
    password_hash varchar(72) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects
(
    id SERIAL NOT NULL PRIMARY KEY,
    name varchar(255) NOT NULL,
    description text NOT NULL,
    files_count integer NOT NULL DEFAULT 0,
    jobs_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files (
  id            SERIAL        PRIMARY KEY,
  name          VARCHAR(255)  NOT NULL,
  project_id    INTEGER       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_path  TEXT          NOT NULL,
  mime_type     VARCHAR(127)  NOT NULL,
  size          INTEGER       NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.jobs
(
    id SERIAL NOT NULL,
    project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status varchar(20) NOT NULL DEFAULT 'PENDING',
    zip_path varchar(1000),
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    progress integer DEFAULT 0
);

INSERT INTO users (name,role,email,password_hash, created_at)
SELECT 'Test', 'USER', 'test@testing.com','$2b$10$eKdlV5NPcj3cMJAaFFGOJ.EqtesKnMvNWaMfkmAnvecMaV8rfYlrW', now()
WHERE NOT EXISTS (SELECT email FROM users WHERE email = 'test@testing.com');