import { NextResponse } from 'next/server';
import crypto from 'crypto';
// Import your database connection here (Prisma, Mongoose, Supabase, etc.)
// import { db } from '@/lib/db'; 

export async function POST(req: Request) {
  try {
    // 1. Get the raw body text for security validation
    const rawBody = await req.text();
    
    // 2. Verify that this request ACTUALLY came from Paystack (Consumer Protection against fraudsters)
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(rawBody)
      .digest('hex');

    if (hash !== req.headers.get('x-paystack-signature')) {
      return new NextResponse('Unauthorized Signature', { status: 401 });
    }

    // 3. Parse the valid Paystack event data
    const event = JSON.parse(rawBody);

    // 4. Handle a successful payment event
    if (event.event === 'charge.success') {
      const sessionData = event.data;
      const customerEmail = sessionData.customer.email;
      const referenceId = sessionData.reference;
      const amountPaid = sessionData.amount / 100; // Converted from kobo/cents to local currency (KES)
      
      // Grab any custom data you passed during checkout (e.g., plan type, user id)
      const metadata = sessionData.metadata; 

      console.log(`Verified Payment! ${customerEmail} paid KES ${amountPaid}`);

      /* 
         ======================================================
         TODO: DATABASE UPDATE LOGIC
         ======================================================
         Here is where the automation happens for consumer protection:
         
         1. Find the user by customerEmail or metadata.userId
         2. Update their account profile:
            - Set activeSignals = true
            - Set purchasesCount = purchasesCount + 1
         3. Create a new record in your "Sales" table so your 
            Admin Panel ("Recent Sales") instantly populates.
      */

    }

    // Always return a 200 OK status to Paystack so it knows you received the data successfully
    return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
    
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return new NextResponse('Internal Webhook Error', { status: 500 });
  }
}