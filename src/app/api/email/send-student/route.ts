import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid or empty JSON body' }, { status: 400 });
    }

    const { toEmail, recipientName, subject, messageBody, type } = body;
    console.log(`[Student Email API] Attempting to send email via EmailJS to: ${toEmail} (Type: ${type})`);

    if (!toEmail || !recipientName || !subject || !messageBody || !type) {
      return NextResponse.json({ error: 'Missing required parameters: toEmail, recipientName, subject, messageBody, type' }, { status: 400 });
    }

    // Determine correct service ID based on traffic type (Feedback vs Outreach)
    const serviceId = type === 'feedback' 
      ? process.env.EMAILJS_STUDENT_SERVICE_ID 
      : process.env.EMAILJS_OUTREACH_SERVICE_ID;
      
    const templateId = process.env.EMAILJS_STUDENT_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    if (!serviceId || !templateId || !publicKey || !privateKey) {
      console.error('[Student Email API] EmailJS configuration is missing', { serviceId, templateId });
      return NextResponse.json({ error: 'Mail server channels are not configured' }, { status: 500 });
    }

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
          to_email: toEmail,
          recipient_name: recipientName,
          subject: subject,
          message_body: messageBody,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Student Email API] EmailJS error:', errorText);
      throw new Error(`EmailJS failed: ${errorText}`);
    }

    console.log('[Student Email API] Email successfully sent!');

    // Immutable logging to central Governance Ledger (BRD 5.1 & 5.6 compliance)
    try {
      const auditLogPayload = {
        fields: {
          action: { stringValue: "Student Outreach" },
          category: { stringValue: "Communication" },
          details: { stringValue: `[EMAIL SENT] Subject: "${subject}". Dispatched to ${recipientName} (${toEmail}) via ${serviceId === process.env.EMAILJS_STUDENT_SERVICE_ID ? 'Student Channel' : 'Outreach Channel'}.` },
          user: { stringValue: "Maverick AI Sentry" },
          timestamp: { timestampValue: new Date().toISOString() }
        }
      };

      await fetch('https://firestore.googleapis.com/v1/projects/designathon-64fa9/databases/(default)/documents/audit_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditLogPayload)
      });
      console.log('[Student Email API] Outbound communication successfully logged to Governance Ledger.');
    } catch (auditErr) {
      console.error('[Student Email API] Governance logging warning:', auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Student Email API] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
