-- Allow the private AI-intelligence search Edge Function to call the vector RPC.
grant execute on function public.search_ai_intelligence(extensions.vector(384), float, int) to service_role;
