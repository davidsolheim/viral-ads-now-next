import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY!);

export interface OrganizationInvitationEmailData {
  email: string;
  organizationName: string;
  invitedByName: string;
  inviteUrl: string;
  expiresAt: Date;
}

export async function sendOrganizationInvitationEmail(data: OrganizationInvitationEmailData) {
  const { email, organizationName, invitedByName, inviteUrl, expiresAt } = data;

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: email,
      subject: `You're invited to join ${organizationName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Organization Invitation</title>
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333;">You're invited to join ${organizationName}</h1>
            </div>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.5;">
                <strong>${invitedByName}</strong> has invited you to join <strong>${organizationName}</strong>.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}"
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Accept Invitation
              </a>
            </div>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Important:</strong> This invitation expires on ${expiresAt.toLocaleDateString()} at ${expiresAt.toLocaleTimeString()}.
              </p>
            </div>

            <div style="color: #666; font-size: 14px; text-align: center;">
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3b82f6;">${inviteUrl}</p>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

            <div style="text-align: center; color: #999; font-size: 12px;">
              <p>This email was sent by Viral Ads Now. If you have any questions, please contact support.</p>
            </div>
          </body>
        </html>
      `,
    });

    return result;
  } catch (error) {
    console.error('Failed to send organization invitation email:', error);
    throw new Error('Failed to send invitation email');
  }
}