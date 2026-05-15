import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-20 max-w-4xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald/10 grid place-items-center shrink-0">
              <Shield className="w-6 h-6 text-emerald" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-charcoal mb-4">
                Privacy Policy
              </h1>
              <p className="text-lg text-graphite">
                Last updated: January 15, 2026
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="container max-w-4xl pb-20">
          <div className="prose prose-lg max-w-none space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">1. Introduction</h2>
              <p className="text-graphite leading-relaxed">
                Flippe Technologies Ltd. ("we," "our," or "us") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">2. Information We Collect</h2>
              <p className="text-graphite leading-relaxed mb-4">
                We collect the following types of information:
              </p>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Account Information</h3>
              <ul className="list-disc list-inside space-y-2 text-graphite mb-4">
                <li>Name and email address</li>
                <li>Password (encrypted)</li>
                <li>Profile information</li>
              </ul>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Financial Information</h3>
              <ul className="list-disc list-inside space-y-2 text-graphite mb-4">
                <li>Wallet balance and transaction history</li>
                <li>Payment method details (processed by third-party providers)</li>
                <li>Withdrawal information</li>
              </ul>
              <h3 className="text-xl font-semibold text-charcoal mb-3">Usage Information</h3>
              <ul className="list-disc list-inside space-y-2 text-graphite mb-4">
                <li>Forecasts and market activity</li>
                <li>Pages visited and features used</li>
                <li>Device information and IP address</li>
                <li>Browser type and operating system</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">3. How We Use Your Information</h2>
              <p className="text-graphite leading-relaxed mb-4">
                We use your information to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>Provide and improve our services</li>
                <li>Process transactions and manage your account</li>
                <li>Send important notifications about your account</li>
                <li>Detect and prevent fraud or abuse</li>
                <li>Comply with legal obligations</li>
                <li>Analyze platform usage and improve user experience</li>
                <li>Send marketing communications (with your consent)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">4. Information Sharing</h2>
              <p className="text-graphite leading-relaxed mb-4">
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li><strong>Service Providers:</strong> Third parties who help us operate the platform (payment processors, hosting providers, analytics services)</li>
                <li><strong>Legal Authorities:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">5. Data Security</h2>
              <p className="text-graphite leading-relaxed">
                We implement industry-standard security measures to protect your data, including encryption, secure servers, and access controls. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">6. Cookies and Tracking</h2>
              <p className="text-graphite leading-relaxed mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>Keep you logged in</li>
                <li>Remember your preferences</li>
                <li>Analyze platform usage</li>
                <li>Improve performance and user experience</li>
              </ul>
              <p className="text-graphite leading-relaxed mt-4">
                You can control cookies through your browser settings, but disabling cookies may affect platform functionality.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">7. Your Rights</h2>
              <p className="text-graphite leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Object to processing of your data</li>
                <li>Export your data</li>
                <li>Withdraw consent for marketing communications</li>
              </ul>
              <p className="text-graphite leading-relaxed mt-4">
                To exercise these rights, contact us at privacy@flippe.com.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">8. Data Retention</h2>
              <p className="text-graphite leading-relaxed">
                We retain your personal data for as long as necessary to provide our services and comply with legal obligations. When you close your account, we may retain certain information for legal, regulatory, or fraud prevention purposes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">9. Children's Privacy</h2>
              <p className="text-graphite leading-relaxed">
                Flippe is not intended for users under 18. We do not knowingly collect information from children. If we discover that we have collected data from a child, we will delete it immediately.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">10. International Transfers</h2>
              <p className="text-graphite leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">11. Changes to This Policy</h2>
              <p className="text-graphite leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material changes by email or through the platform. Your continued use after changes constitutes acceptance of the updated policy.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">12. Contact Us</h2>
              <p className="text-graphite leading-relaxed">
                If you have questions about this Privacy Policy or how we handle your data, please contact us:
              </p>
              <div className="bg-off-white rounded-2xl p-6 border border-graphite/10 mt-4">
                <p className="text-graphite leading-relaxed">
                  <strong>Flippe Technologies Ltd.</strong><br />
                  Email: privacy@flippe.com<br />
                  Address: Lagos, Nigeria<br />
                  <a href="/contact" className="text-purple hover:underline">Contact Form</a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
