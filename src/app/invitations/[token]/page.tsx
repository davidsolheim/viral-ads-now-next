import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OrganizationInvitationPage } from '@/components/invitations/organization-invitation-page';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitationPage({ params }: PageProps) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user) {
    // Redirect to sign in with callback to return to this page
    redirect(`/auth/signin?callbackUrl=/invitations/${token}`);
  }

  return <OrganizationInvitationPage token={token} userId={session.user.id} />;
}