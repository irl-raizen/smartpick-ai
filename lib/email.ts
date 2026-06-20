import { Resend } from "resend";

export async function sendBackInStockEmail(
  email: string,
  phoneName: string,
  amazonPrice: number,
  flipkartPrice: number,
  phoneUrl: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("RESEND_API_KEY environment variable is not configured.");
  }

  const resend = new Resend(apiKey);

  const amazonPriceStr = amazonPrice > 0 ? `${amazonPrice.toLocaleString("en-IN")}` : "Unavailable";
  const flipkartPriceStr = flipkartPrice > 0 ? `${flipkartPrice.toLocaleString("en-IN")}` : "Unavailable";

  const body = `Good news!

${phoneName} is now available again on SmartPick AI.

Current prices:

Amazon:
${amazonPrice > 0 ? `₹${amazonPriceStr}` : amazonPriceStr}

Flipkart:
${flipkartPrice > 0 ? `₹${flipkartPriceStr}` : flipkartPriceStr}

View Phone:

${phoneUrl}

Thanks,
SmartPick AI Team`;

  const { data, error } = await resend.emails.send({
    from: "SmartPick AI <onboarding@resend.dev>",
    to: email,
    subject: `🔥 ${phoneName} is back in stock!`,
    text: body,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email via Resend API");
  }

  return data;
}
