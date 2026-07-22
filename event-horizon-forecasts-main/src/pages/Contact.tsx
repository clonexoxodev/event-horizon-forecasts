import { Header } from "@/components/Header";
import { MobileNav } from "@/components/MobileNav";
import { Footer } from "@/components/Footer";
import { Mail, MessageCircle, Twitter, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const subject = encodeURIComponent(formData.subject || "Flippe support request");
    const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`);
    window.location.href = `mailto:support@flippe.com?subject=${subject}&body=${body}`;

    toast.success("Opening your email app.");
    setIsSubmitting(false);
  };

  return (
    <div className="app-bg min-h-screen flex flex-col font-['Inter',sans-serif] pb-20 md:pb-0">
      <Header />
      <main className="flex-1">
        <section className="container py-16 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#101828] mb-6">
            Contact Us
          </h1>
          <p className="text-xl text-[#667085] leading-relaxed">
            Use this page for account, wallet, market, and support questions.
          </p>
        </section>

        <div className="container max-w-5xl pb-20">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="rounded-3xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-[#101828] mb-6">Send us a message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-[#101828] mb-2">
                      Name
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#101828] mb-2">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#101828] mb-2">
                      Subject
                    </label>
                    <Input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      placeholder="What's this about?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#101828] mb-2">
                      Message
                    </label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      placeholder="Tell us more..."
                      rows={6}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl bg-[#4F46E5] text-white font-semibold shadow-sm hover:bg-[#4338CA] hover:shadow-md transition-all"
                  >
                    {isSubmitting ? "Opening email..." : "Open email app"}
                  </Button>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="w-11 h-11 rounded-2xl bg-[#4F46E5]/10 grid place-items-center mb-4">
                  <Mail className="w-5 h-5 text-[#4F46E5]" />
                </div>
                <h3 className="font-bold text-[#101828] mb-2">Contact email</h3>
                <a href="mailto:support@flippe.com" className="text-sm text-[#667085] hover:text-[#4F46E5] transition-colors">
                  support@flippe.com
                </a>
                <p className="mt-2 text-xs text-[#667085]">Use this for account, wallet, and market questions.</p>
              </div>

              <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <div className="w-11 h-11 rounded-2xl bg-[#4F46E5]/10 grid place-items-center mb-4">
                  <MessageCircle className="w-5 h-5 text-[#4F46E5]" />
                </div>
                <h3 className="font-bold text-[#101828] mb-2">Support hours</h3>
                <p className="text-sm text-[#667085]">
                  Support requests are reviewed as part of Flippe V1 operations.
                </p>
              </div>

              <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <h3 className="font-bold text-[#101828] mb-4">Follow Us</h3>
                <div className="flex gap-2">
                  <a
                    href="#"
                    className="w-10 h-10 rounded-2xl border border-[#E5E7EB] grid place-items-center text-[#667085] hover:text-[#101828] hover:border-[#4F46E5]/40 hover:bg-[#F9FAFB] transition-all"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 rounded-2xl border border-[#E5E7EB] grid place-items-center text-[#667085] hover:text-[#101828] hover:border-[#4F46E5]/40 hover:bg-[#F9FAFB] transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
