import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/Marketing";
import { site } from "@/lib/config";

export const metadata: Metadata = { title: `Terms, privacy and refunds | ${site.name}` };

export default function Terms() {
  return (
    <>
      <SiteHeader />
      <main className="wrap legal">
        <h1>Terms, privacy and refunds</h1>
        <p className="muted">Operated by {site.businessName}. Contact: {site.supportEmail}</p>

        <h2>The service</h2>
        <p>{site.name} resells social media engagement packages delivered by third-party suppliers. You must only order for accounts and content you own or are allowed to promote.</p>

        <h2>Platform rules and risk</h2>
        <p>Social platforms may restrict purchased engagement. They can remove delivered counts or act on an account. You accept this risk. We do not guarantee reach, income or any business result.</p>

        <h2>Wallet and refunds</h2>
        <p>Wallet funds can only be used on this site. Canceled orders are refunded in full to the wallet, and partly delivered orders are refunded for the undelivered quantity. For a refund of unused wallet funds to your original payment method, contact support.</p>

        <h2>Privacy</h2>
        <p>We store your email, username, optional WhatsApp number, order links and payment references to run the service. Card and UPI details are handled by Razorpay. We never ask for your social media password.</p>

        <h2>Acceptable use</h2>
        <p>Do not place orders for content that is illegal, harassing or that you have no right to promote. We can block accounts that break these terms.</p>
      </main>
      <SiteFooter />
    </>
  );
}
