/*
  # Enable Realtime on messages table

  1. Changes
    - Adds the `messages` table to the `supabase_realtime` publication
      so that Postgres changes (INSERT, UPDATE, DELETE) are broadcast
      to subscribed clients in real time

  2. Notes
    - This is required for the chat screen to receive new messages
      without needing to re-fetch
*/

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
