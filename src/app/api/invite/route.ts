import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build');
    
    const { email, role, invitedBy } = await request.json();
    console.log(`[Invite API] Attempting to send invite to: ${email} for role: ${role}`);

    if (!email || !role) {
      console.error('[Invite API] Missing email or role');
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key_here') {
      console.error('[Invite API] RESEND_API_KEY is not configured correctly in .env.local');
      return NextResponse.json({ error: 'Mail server not configured' }, { status: 500 });
    }

    const data = await resend.emails.send({
      from: 'Maverick Platform <onboarding@resend.dev>',
      to: [email],
      subject: `Invitation to join Maverick as ${role}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
          <div style="background: #2563eb; padding: 30px; border-radius: 12px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Welcome to Maverick</h1>
            <p style="margin-top: 10px; opacity: 0.9;">Training Execution Platform</p>
          </div>
          
          <div style="padding: 30px 0;">
            <h2 style="font-size: 20px; color: #0f172a;">You've been invited!</h2>
            <p style="font-size: 16px; line-height: 1.6;">
              Hello, <strong>${invitedBy}</strong> has invited you to join the Maverick Platform with the role of <strong>${role}</strong>.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Maverick is an AI-powered execution platform designed to streamline training, batch management, and candidate tracking.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" 
                 style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                Accept Invitation & Sign In
              </a>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; text-align: center;">
            <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
            <p>&copy; 2026 Maverick Training Execution Platform</p>
          </div>
        </div>
      `,
    });

    console.log('[Invite API] Resend response:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Invite API] Resend error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
