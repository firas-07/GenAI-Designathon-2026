import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, role, invitedBy } = await request.json();
    console.log(`[Invite API] Attempting to send EmailJS invite to: ${email} for role: ${role}`);

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    if (!serviceId || !templateId || !publicKey || !privateKey) {
      console.error('[Invite API] EmailJS configuration is missing');
      return NextResponse.json({ error: 'Mail server not configured' }, { status: 500 });
    }

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`;

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          to_email: email,
          role: role,
          invited_by: invitedBy,
          invite_link: inviteLink,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Invite API] EmailJS error:', errorText);
      throw new Error(`EmailJS failed: ${errorText}`);
    }

    console.log('[Invite API] EmailJS success');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Invite API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
