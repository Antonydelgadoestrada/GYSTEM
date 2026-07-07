-- Alter gym_settings to add quick sale configuration columns
ALTER TABLE public.gym_settings
ADD COLUMN quick_sale_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
ADD COLUMN quick_sale_membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL;
