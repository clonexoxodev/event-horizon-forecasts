import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { FileText } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-20 max-w-4xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple/10 grid place-items-center shrink-0">
              <FileText className="w-6 h-6 text-purple" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-charcoal mb-4">
                Terms of Service
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
              <h2 className="text-2xl font-bold text-charcoal mb-4">1. Acceptance of Terms</h2>
              <p className="text-graphite leading-relaxed">
                By accessing or using Flippe, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using this platform.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">2. Eligibility</h2>
              <p className="text-graphite leading-relaxed">
                You must be at least 18 years old to use Flippe. By creating an account, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">3. Account Registration</h2>
              <p className="text-graphite leading-relaxed mb-4">
                To use Flippe, you must create an account. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">4. Forecasting and Markets</h2>
              <p className="text-graphite leading-relaxed mb-4">
                Flippe provides a platform for forecasting real-world events. You understand and agree that:
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>All forecasts involve financial risk</li>
                <li>You may lose some or all funds used to purchase shares</li>
                <li>Market prices are determined by an automated market maker</li>
                <li>Markets resolve based on stated resolution criteria</li>
                <li>Resolution decisions are final and binding</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">5. Prohibited Conduct</h2>
              <p className="text-graphite leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>Use the platform for any illegal purpose</li>
                <li>Manipulate markets or engage in fraudulent activity</li>
                <li>Create multiple accounts to circumvent limits</li>
                <li>Use automated systems or bots without authorization</li>
                <li>Interfere with platform operations or security</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">6. Fees and Payments</h2>
              <p className="text-graphite leading-relaxed">
                Flippe may charge fees for certain services. All fees will be disclosed before you complete a transaction. You agree to pay all applicable fees and authorize us to charge your payment method.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">7. Withdrawals</h2>
              <p className="text-graphite leading-relaxed">
                You may withdraw funds from your account subject to our withdrawal policies. We reserve the right to delay or refuse withdrawals if we suspect fraud, money laundering, or other illegal activity.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">8. Intellectual Property</h2>
              <p className="text-graphite leading-relaxed">
                All content on Flippe, including text, graphics, logos, and software, is the property of Flippe Technologies Ltd. and protected by copyright and other intellectual property laws. You may not copy, modify, or distribute our content without permission.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-graphite leading-relaxed">
                Flippe is provided "as is" without warranties of any kind. We do not guarantee that the platform will be error-free, secure, or continuously available. You use the platform at your own risk.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">10. Limitation of Liability</h2>
              <p className="text-graphite leading-relaxed">
                To the maximum extent permitted by law, Flippe and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">11. Termination</h2>
              <p className="text-graphite leading-relaxed">
                We may suspend or terminate your account at any time for any reason, including violation of these Terms. Upon termination, you must cease all use of the platform.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">12. Changes to Terms</h2>
              <p className="text-graphite leading-relaxed">
                We may modify these Terms at any time. We will notify you of material changes by email or through the platform. Your continued use after changes constitutes acceptance of the new Terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">13. Governing Law</h2>
              <p className="text-graphite leading-relaxed">
                These Terms are governed by the laws of Nigeria. Any disputes shall be resolved in the courts of Lagos, Nigeria.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">14. Contact</h2>
              <p className="text-graphite leading-relaxed">
                If you have questions about these Terms, please contact us at legal@flippe.com or through our <a href="/contact" className="text-purple hover:underline">contact page</a>.
              </p>
            </div>

            <div className="bg-off-white rounded-2xl p-8 border border-graphite/10">
              <p className="text-graphite leading-relaxed">
                <strong>Flippe Technologies Ltd.</strong><br />
                Lagos, Nigeria<br />
                support@flippe.com
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
