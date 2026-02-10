/*
  # Trigger to send push notifications via Edge Function

  1. New Function
    - `send_push_notification()` - calls the send-push edge function 
      via pg_net when a new notification is inserted

  2. Notes
    - Uses the pg_net extension to make HTTP calls from within Postgres
    - Fires after INSERT on the notifications table
    - Sends the notification title, body, and data to the edge function
*/

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.send_push_notification()
RETURNS trigger AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  SELECT decrypted_secret INTO supabase_url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;

  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF supabase_url IS NULL THEN
    supabase_url := current_setting('app.settings.supabase_url', true);
  END IF;

  IF service_role_key IS NULL THEN
    service_role_key := current_setting('app.settings.service_role_key', true);
  END IF;

  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    PERFORM extensions.http_post(
      url := supabase_url || '/functions/v1/send-push',
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', NEW.title,
        'body', NEW.body,
        'data', COALESCE(NEW.data, '{}'::jsonb)
      )::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_notification_send_push ON notifications;
CREATE TRIGGER on_notification_send_push
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION public.send_push_notification();
