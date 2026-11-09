import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/Marketing";
import { getSettings } from "@/lib/catalog";
import { site } from "@/lib/config";
import { db } from "@/lib/db";
import { inr, pricePer1000 } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const FAQS = [
  ["Do you need my Instagram password?", "No. An order only needs your public username or the link to a post."],
  ["How does payment work?", "You add money to a prepaid wallet with Razorpay, and each order is charged from that wallet."],
  ["What if an order is not delivered?", "If an order is canceled, the full amount returns to your wallet. If it is only partly delivered, the undelivered part is refunded."],
  ["Can I order for a private account?", "No. The account has to stay public until the order is finished."],
];

export default async function Home() {
  const [services, settings] = await Promise.all([
    db.service.findMany({ where: { enabled: true, supported: true }, orderBy: { category: "asc" }, take: 6 }),
    getSettings(),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="hero">
          <div className="hero-copy">
            <h1>Instagram packages, <em>ordered</em> in a minute.</h1>
            <p>Pick a package, paste a username or post link, and pay from your wallet. Your Instagram password stays with you.</p>
            <div className="row">
              <Link href="/signup" className="btn">Create free account</Link>
              <Link href="/login" className="link">I already have one</Link>
            </div>
          </div>
          <div className="ticket" aria-label="Example order">
            <div className="ticket-head"><span>Example order</span><span>In progress</span></div>
            <div className="ticket-body">
              <div className="ticket-line"><span>Package</span><b>Reel views</b></div>
              <div className="ticket-line"><span>Target</span><b>@yourhandle</b></div>
              <div className="ticket-line"><span>Quantity</span><b>1,000</b></div>
              <div className="ticket-bar"><i /></div>
              <div className="ticket-steps"><span>Queued</span><span>Delivering</span><span>Done</span></div>
            </div>
          </div>
        </section>

        <section className="section">
          <h2>Three steps, no password</h2>
          <div className="steps">
            <div className="step"><b>1</b><h3>Add funds</h3><p className="muted">Top up your wallet with UPI, cards or netbanking.</p></div>
            <div className="step"><b>2</b><h3>Choose a package</h3><p className="muted">See the exact price before you confirm the order.</p></div>
            <div className="step"><b>3</b><h3>Track delivery</h3><p className="muted">Follow each order’s live status from your dashboard.</p></div>
          </div>
        </section>

        {services.length > 0 && (
          <section className="section">
            <h2>Current prices</h2>
            <div className="prices">
              {services.map((service) => (
                <div className="price" key={service.id}>
                  <small>{service.category}</small>
                  <b>{service.displayName || service.name}</b>
                  <strong>{inr(pricePer1000(service, settings))}</strong>
                  <small>per 1,000</small>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="honest">
            <h2>Read this before you buy</h2>
            <ul>
              <li>Instagram’s rules may not allow purchased engagement, and Instagram can remove it or act on your account.</li>
              <li>Counts can drop after delivery. Packages marked with refill cover drops for the stated period.</li>
              <li>A higher count does not guarantee reach, sales or brand deals.</li>
              <li>{site.name} is an independent service and is not connected with Instagram or Meta.</li>
            </ul>
          </div>
        </section>

        <section className="section">
          <h2>Questions</h2>
          <div className="faq">
            {FAQS.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
