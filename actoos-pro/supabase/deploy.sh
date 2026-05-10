#!/bin/bash
# =====================================================
# ACTOOS PRO - Deploy Edge Functions to Supabase
# =====================================================

echo "🚀 Déploiement des Edge Functions ACTOOS PRO"
echo "============================================="

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Navigate to supabase directory
cd /app/supabase

# Login to Supabase (requires SUPABASE_ACCESS_TOKEN env var)
echo ""
echo "📋 Vérification de la connexion Supabase..."
supabase projects list || {
    echo ""
    echo "⚠️  Vous devez vous connecter à Supabase:"
    echo "   1. Allez sur https://supabase.com/dashboard/account/tokens"
    echo "   2. Créez un access token"
    echo "   3. Exécutez: supabase login"
    echo ""
    exit 1
}

# Link to project
PROJECT_REF="zmngftlkdimwvkxmduvr"
echo ""
echo "🔗 Liaison au projet Supabase..."
supabase link --project-ref $PROJECT_REF

# Deploy Edge Functions
echo ""
echo "📦 Déploiement des Edge Functions..."

echo "  → login..."
supabase functions deploy login --no-verify-jwt

echo "  → send-email..."
supabase functions deploy send-email --no-verify-jwt

echo "  → send-sms..."
supabase functions deploy send-sms --no-verify-jwt

echo "  → send-whatsapp..."
supabase functions deploy send-whatsapp --no-verify-jwt

echo "  → generate-pdf..."
supabase functions deploy generate-pdf --no-verify-jwt

echo "  → stripe-webhook..."
supabase functions deploy stripe-webhook --no-verify-jwt

# Set secrets
echo ""
echo "🔐 Configuration des secrets..."
echo ""
echo "⚠️  Vous devez configurer manuellement les secrets suivants:"
echo ""
echo "   # Email (Resend)"
echo "   supabase secrets set RESEND_API_KEY=re_xxxxxxxx"
echo ""
echo "   # SMS (Twilio)"
echo "   supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxx"
echo "   supabase secrets set TWILIO_AUTH_TOKEN=xxxxxxxx"
echo "   supabase secrets set TWILIO_PHONE_NUMBER=+33xxxxxxxxx"
echo ""
echo "   # WhatsApp Business (Meta)"
echo "   supabase secrets set WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxx"
echo "   supabase secrets set WHATSAPP_PHONE_NUMBER_ID=xxxxxxxx"
echo ""
echo "   # Stripe Webhooks"
echo "   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx"
echo ""

# Apply RLS migrations
echo ""
echo "🔒 Application des politiques RLS..."
echo ""
echo "⚠️  Exécutez le fichier SQL suivant dans Supabase Dashboard > SQL Editor:"
echo "   /app/supabase/migrations/002_rls_policies.sql"
echo ""

echo "✅ Déploiement terminé!"
echo ""
echo "📋 Résumé des Edge Functions:"
echo "   - POST /functions/v1/login          → Authentification"
echo "   - POST /functions/v1/send-email     → Envoi emails (Resend)"
echo "   - POST /functions/v1/send-sms       → Envoi SMS (Twilio)"
echo "   - POST /functions/v1/send-whatsapp  → Envoi WhatsApp (Meta)"
echo "   - POST /functions/v1/generate-pdf   → Génération PDF"
echo "   - POST /functions/v1/stripe-webhook → Webhooks Stripe"
echo ""
