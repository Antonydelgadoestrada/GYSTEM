-- ==========================================
-- 1. EXTENSIONES Y SEGURIDAD PRELIMINAR
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. DEFINICIÓN DE TABLAS PRINCIPALES
-- ==========================================

-- Tabla de Configuración Global del Gimnasio (Single-Tenant)
CREATE TABLE public.gym_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL DEFAULT 'Mi Gimnasio',
    phone VARCHAR(50),
    address TEXT,
    logo_url TEXT,
    currency VARCHAR(10) NOT NULL DEFAULT 'PEN',
    payment_methods TEXT[] NOT NULL DEFAULT ARRAY['Efectivo', 'Tarjeta', 'Transferencia', 'Yape', 'Plin', 'Mixto'],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fila inicial por defecto para la configuración del gimnasio
INSERT INTO public.gym_settings (name) VALUES ('Mi Gimnasio');

-- Tabla de Usuarios del Sistema (Staff del Gimnasio)
-- Vinculado a auth.users de Supabase
CREATE TABLE public.users (
    id UUID PRIMARY KEY, -- Referencia directa a auth.users(id)
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'recepcion', 'entrenador')),
    full_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Clientes (Atletas / Miembros)
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni VARCHAR(20),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    birth_date DATE,
    photo_url TEXT,
    access_code VARCHAR(100) UNIQUE, -- Código físico global único (PIN / QR)
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Membresías (Catálogo de planes)
CREATE TABLE public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sembrado inicial de membresías por defecto
INSERT INTO public.memberships (name, price, duration_days, is_active)
VALUES 
    ('Sesión Diaria', 5.00, 1, true),
    ('Pase Mensual Standard', 40.00, 30, true),
    ('Pase Trimestral Standard', 110.00, 90, true),
    ('Pase Anual Premium', 400.00, 365, true);

-- Tabla de Relación Clientes - Membresías (Suscripciones Activas/Históricas)
CREATE TABLE public.customer_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_dates CHECK (start_date <= end_date)
);

-- Tabla de Pagos
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_membership_id UUID NOT NULL REFERENCES public.customer_memberships(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    payment_method VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Gastos Operativos
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    category VARCHAR(100) NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de Bitácora de Auditoría (Inmutable)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
    entity_name VARCHAR(100) NOT NULL, -- nombre de tabla
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 3. ÍNDICES DE RENDIMIENTO (PERFORMANCE)
-- ==========================================
CREATE INDEX idx_customers_status ON public.customers(status);
CREATE INDEX idx_customers_search ON public.customers(full_name);
CREATE INDEX idx_memberships_active ON public.memberships(is_active);
CREATE INDEX idx_customer_memberships_dates ON public.customer_memberships(start_date, end_date);
CREATE INDEX idx_payments_date ON public.payments(payment_date);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX idx_audit_logs_date ON public.audit_logs(created_at DESC);

-- ==========================================
-- 4. FUNCIONES Y TRIGGERS AUTOMÁTICOS
-- ==========================================

-- Trigger para automatizar la columna updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gym_settings_updated_at BEFORE UPDATE ON public.gym_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customer_memberships_updated_at BEFORE UPDATE ON public.customer_memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para registrar de forma automática la auditoría
CREATE OR REPLACE FUNCTION public.log_action()
RETURNS trigger AS $$
DECLARE
    v_user_id UUID;
    v_details JSONB;
BEGIN
    v_user_id := auth.uid();

    IF TG_OP = 'INSERT' THEN
        v_details := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_details := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        v_details := to_jsonb(OLD);
    END IF;

    INSERT INTO public.audit_logs (user_id, action, entity_name, entity_id, details)
    VALUES (
        v_user_id,
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id 
            ELSE NEW.id 
        END,
        v_details
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_customers_changes AFTER INSERT OR UPDATE OR DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.log_action();
CREATE TRIGGER audit_memberships_changes AFTER INSERT OR UPDATE OR DELETE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.log_action();
CREATE TRIGGER audit_customer_memberships_changes AFTER INSERT OR UPDATE OR DELETE ON public.customer_memberships FOR EACH ROW EXECUTE FUNCTION public.log_action();
CREATE TRIGGER audit_payments_changes AFTER INSERT OR UPDATE OR DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.log_action();
CREATE TRIGGER audit_expenses_changes AFTER INSERT OR UPDATE OR DELETE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.log_action();

-- Trigger para crear el perfil público del usuario al registrarse en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    v_role VARCHAR(50);
    v_full_name VARCHAR(255);
BEGIN
    v_role := COALESCE(new.raw_user_meta_data ->> 'role', 'admin');
    v_full_name := COALESCE(new.raw_user_meta_data ->> 'full_name', 'Nuevo Administrador');

    INSERT INTO public.users (id, email, role, full_name)
    VALUES (new.id, new.email, v_role, v_full_name);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Deshabilitar RLS en todas las tablas para permitir acceso directo sin políticas
ALTER TABLE public.gym_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
