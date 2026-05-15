import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { AlertTriangle } from "lucide-react";

export default function RiskDisclaimer() {
  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-20 max-w-4xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-coral/10 grid place-items-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-coral" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-charcoal mb-4">
                Risk Disclaimer
              </h1>
              <p className="text-lg text-graphite">
                Last updated: January 15, 2026
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="container max-w-4xl pb-20">
          <div className="bg-coral/5 border-l-4 border-coral rounded-r-xl p-6 mb-8">
            <p className="font-semibold text-charcoal mb-2">⚠️ Important Notice</p>
            <p className="text-graphite leading-relaxed">
              Forecasting on Flippe involves financial risk. Please read this disclaimer carefully before participating.
            </p>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">Age Requirement</h2>
              <p className="text-graphite leading-relaxed">
                You must be <strong>18 years of age or older</strong> to use Flippe. By creating an account, you confirm that you meet this age requirement.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">Financial Risk</h2>
              <p className="text-graphite leading-relaxed mb-4">
                Forecasting on prediction markets carries <strong>financial risk</strong>. You may lose some or all of the funds you use to purchase shares.
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>Market prices can be volatile and change rapidly</li>
                <li>Incorrect forecasts result in a total loss of your investment</li>
                <li>Past performance does not guarantee future results</li>
                <li>No forecast is guaranteed to be profitable</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">Use Only Affordable Funds</h2>
              <p className="text-graphite leading-relaxed">
                <strong>Only use funds you can afford to lose.</strong> Do not forecast with money needed for essential expenses like rent, food, bills, or emergency savings.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">Not Financial Advice</h2>
              <p className="text-graphite leading-relaxed mb-4">
                Flippe is <strong>not a financial advisor</strong>. Nothing on this platform constitutes financial, investment, legal, or tax advice.
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>We do not recommend specific forecasts or strategies</li>
                <li>Market prices reflect crowd sentiment, not expert analysis</li>
                <li>You are solely responsible for your forecasting decisions</li>
                <li>Consult a qualified financial advisor before making significant financial decisions</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">Market Resolution</h2>
              <p className="text-graphite leading-relaxed mb-4">
                Markets resolve based on <strong>stated resolution sources</strong>. These sources are specified before each market opens.
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>Resolution is based on objective, verifiable data</li>
                <li>We use official sources like government agencies, sports leagues, and financial exchanges</li>
                <li>Resolution decisions are final and binding</li>
                <li>In rare cases of ambiguity, markets may be resolved as INVALID and refunded</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">Platform Risks</h2>
              <p className="text-graphite leading-relaxed mb-4">
                Using Flippe involves additional risks:
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li><strong>Technical risks:</strong> Platform downtime, bugs, or errors may affect your ability to trade</li>
                <li><strong>Liquidity risks:</strong> While we provide automated market making, extreme market conditions may affect pricing</li>
                <li><strong>Regulatory risks:</strong> Changes in laws or regulations may affect platform operations</li>
                <li><strong>Counterparty risks:</strong> Your funds are held by Flippe and subject to our financial stability</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">No Guarantees</h2>
              <p className="text-graphite leading-relaxed">
                Flippe makes <strong>no guarantees</strong> about:
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>Platform availability or uptime</li>
                <li>Accuracy of market prices or data</li>
                <li>Profitability of any forecast</li>
                <li>Withdrawal processing times</li>
                <li>Future platform features or operations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">Responsible Forecasting</h2>
              <p className="text-graphite leading-relaxed mb-4">
                We encourage responsible forecasting:
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>Set personal limits on how much you forecast</li>
                <li>Take breaks if forecasting becomes stressful</li>
                <li>Seek help if you feel you're losing control</li>
                <li>Remember that forecasting should be enjoyable, not a source of financial stress</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-4">Limitation of Liability</h2>
              <p className="text-graphite leading-relaxed">
                To the maximum extent permitted by law, Flippe and its affiliates are not liable for any losses, damages, or claims arising from your use of the platform. This includes but is not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-graphite">
                <li>Financial losses from forecasting</li>
                <li>Technical errors or platform downtime</li>
                <li>Unauthorized access to your account</li>
                <li>Market resolution disputes</li>
              </ul>
            </div>

            <div className="bg-off-white rounded-2xl p-8 border border-graphite/10">
              <h2 className="text-2xl font-bold text-charcoal mb-4">Acknowledgment</h2>
              <p className="text-graphite leading-relaxed">
                By using Flippe, you acknowledge that you have read, understood, and agree to this Risk Disclaimer. You accept full responsibility for your forecasting decisions and any resulting financial outcomes.
              </p>
            </div>

            <div className="text-center pt-8">
              <p className="text-sm text-graphite mb-4">
                Questions about this disclaimer?
              </p>
              <a
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-purple text-white font-semibold hover:bg-purple/90 transition-fast text-sm"
              >
                Contact Us
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
