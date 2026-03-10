import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER!; // e.g., "whatsapp:+14155238886"

const client = twilio(accountSid, authToken);

export const sendWhatsAppMessage = async (toPhone: string, message: string) => {
  try {
    // Twilio requires numbers in E.164 format (e.g., +919876543210)
    // Assuming your users are in India (+91), we format it if the + is missing
    const formattedNumber = toPhone.startsWith("+") ? toPhone : `+91${toPhone}`;

    const response = await client.messages.create({
      body: message,
      from: twilioWhatsAppNumber,
      to: `whatsapp:${formattedNumber}`,
    });

    console.log(`✅ WhatsApp sent to ${formattedNumber}. SID: ${response.sid}`);
    return response;
  } catch (error) {
    console.error("❌ Failed to send WhatsApp message:", error);
    // We don't throw the error so the main app doesn't crash if WhatsApp fails
    return null;
  }
};
