-- Optional development seed: pricing plans only.
-- Do not insert real customer or payment data here.
insert into public.plans (name, code, price, billing_period, features)
values
  ('Básico', 'basic', 39900, 'monthly',
   '{"barbers":2,"analytics":false,"loyalty":false}'::jsonb),
  ('Profesional', 'professional', 69900, 'monthly',
   '{"barbers":8,"analytics":true,"loyalty":true}'::jsonb),
  ('Premium', 'premium', 99900, 'monthly',
   '{"barbers":-1,"analytics":true,"loyalty":true,"custom_branding":true}'::jsonb)
on conflict (code) do nothing;
