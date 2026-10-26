-- Ampliación compatible: conserva los datos y el logo de la empresa.
ALTER TABLE public.empresa
  ADD COLUMN IF NOT EXISTS color_primario VARCHAR(7) NOT NULL DEFAULT '#173d35'
    CHECK (color_primario ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS color_acento VARCHAR(7) NOT NULL DEFAULT '#d5eb8b'
    CHECK (color_acento ~ '^#[0-9A-Fa-f]{6}$');
