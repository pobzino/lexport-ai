DO $$
DECLARE
  payment_structure_type regtype;
BEGIN
  SELECT attribute.atttypid::regtype
  INTO payment_structure_type
  FROM pg_attribute AS attribute
  JOIN pg_type AS type
    ON type.oid = attribute.atttypid
  WHERE attribute.attrelid = 'public.contracts'::regclass
    AND attribute.attname = 'payment_structure'
    AND NOT attribute.attisdropped
    AND type.typtype = 'e';

  IF payment_structure_type IS NOT NULL THEN
    EXECUTE format(
      'ALTER TYPE %s ADD VALUE IF NOT EXISTS %L',
      payment_structure_type,
      'custom'
    );
  END IF;
END
$$;

