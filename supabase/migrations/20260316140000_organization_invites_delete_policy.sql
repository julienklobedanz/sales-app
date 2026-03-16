-- Allow org members to delete invites of their organization (e.g. to revoke pending invites)
CREATE POLICY "Users delete invites of own org"
  ON public.organization_invites FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());
