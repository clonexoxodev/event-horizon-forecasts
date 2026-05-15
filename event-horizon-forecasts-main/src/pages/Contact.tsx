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

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success("Message sent! We'll get back to you within 24 hours.");
    setFormData({ name: "", email: "", subject: "", message: "" });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container py-20 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-charcoal mb-6">
            Contact Us
          </h1>
          <p className="text-xl text-graphite leading-relaxed">
            Have a question or feedback? We'd love to hear from you.
          </p>
        </section>

        <div className="container max-w-5xl pb-20">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="md:col-span-2">
              <div className="bg-off-white rounded-2xl p-8 border border-graphite/10">
                <h2 className="text-2xl font-bold text-charcoal mb-6">Send us a message</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-2">
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
                    <label className="block text-sm font-medium text-charcoal mb-2">
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
                    <label className="block text-sm font-medium text-charcoal mb-2">
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
                    <label className="block text-sm font-medium text-charcoal mb-2">
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
                    className="w-full"
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-off-white rounded-2xl p-6 border border-graphite/10">
                <div className="w-10 h-10 rounded-xl bg-purple/10 grid place-items-center mb-4">
                  <Mail className="w-5 h-5 text-purple" />
                </div>
                <h3 className="font-bold text-charcoal mb-2">Email</h3>
                <a href="mailto:support@flippe.com" className="text-sm text-graphite hover:text-purple transition-fast">
                  support@flippe.com
                </a>
              </div>

              <div className="bg-off-white rounded-2xl p-6 border border-graphite/10">
                <div className="w-10 h-10 rounded-xl bg-emerald/10 grid place-items-center mb-4">
                  <MessageCircle className="w-5 h-5 text-emerald" />
                </div>
                <h3 className="font-bold text-charcoal mb-2">Live Chat</h3>
                <p className="text-sm text-graphite">
                  Available Mon-Fri, 9am-5pm WAT
                </p>
              </div>

              <div className="bg-off-white rounded-2xl p-6 border border-graphite/10">
                <h3 className="font-bold text-charcoal mb-4">Follow Us</h3>
                <div className="flex gap-2">
                  <a
                    href="#"
                    className="w-9 h-9 rounded-xl border border-border grid place-items-center text-graphite hover:text-charcoal hover:border-charcoal/30 hover:bg-graphite/8 transition-fast"
                  >
                    <Twitter className="w-4 h-4" />
                  </a>
                  <a
                    href="#"
                    className="w-9 h-9 rounded-xl border border-border grid place-items-center text-graphite hover:text-charcoal hover:border-charcoal/30 hover:bg-graphite/8 transition-fast"
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
