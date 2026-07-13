import React, { useState } from 'react';
import { Eye, ShieldCheck, Database, Key, Calendar, ChevronRight } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('section-1');

  const sections = [
    { id: 'section-1', title: '1. Information We Collect', icon: Database },
    { id: 'section-2', title: '2. How We Use Information', icon: Eye },
    { id: 'section-3', title: '3. Data Sharing & Third Parties', icon: ShieldCheck },
    { id: 'section-4', title: '4. Cookies & Analytics', icon: Database },
    { id: 'section-5', title: '5. Data Security & Storage', icon: Key },
    { id: 'section-6', title: '6. Your Rights & Choices', icon: ShieldCheck },
    { id: 'section-7', title: '7. Children\'s Privacy', icon: Eye },
    { id: 'section-8', title: '8. Contact Us', icon: Calendar },
  ];

  const handleScrollTo = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white font-outfit">
          Privacy Policy
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">
          Learn how SkillSphere handles, collects, and secures your personal information.
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <Calendar className="h-3.5 w-3.5" />
          Last Updated: July 6, 2026
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Sticky Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="sticky top-24 space-y-1.5 hidden lg:block">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-3">
              Sections
            </h3>
            {sections.map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => handleScrollTo(sec.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 text-left ${
                    activeSection === sec.id
                      ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 border-l-4 border-brand-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    {sec.title}
                  </span>
                  <ChevronRight className={`h-3 w-3 transition-transform ${activeSection === sec.id ? 'translate-x-0.5' : 'opacity-0'}`} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Legal Text Content Area */}
        <div className="lg:col-span-3 space-y-12 text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base">
          {/* Section 1 */}
          <section id="section-1" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              1. Information We Collect
            </h2>
            <p>
              We collect information that you provide directly to us when creating an account, editing your profile, purchasing a course, or communicating with us. This includes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Credentials:</strong> Full name, username, email address, password, and profile preferences.</li>
              <li><strong>Payment Information:</strong> Standard billing details processed securely by our payment processor (Stripe). We do not store raw credit card details on our servers.</li>
              <li><strong>Educational Activity:</strong> Enrolled courses, video progress, quiz answers, test submissions, and certificate logs.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section id="section-2" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              2. How We Use Information
            </h2>
            <p>
              SkillSphere utilizes the collected data to provide, optimize, and secure our educational services. Specifically, we use it for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Verifying account registration and email addresses.</li>
              <li>Processing checkout transactions and delivering invoices.</li>
              <li>Powering our AI Study Tutor to customize answers based on your learning history.</li>
              <li>Generating verified certificates of completion.</li>
              <li>Sending transactional notifications, welcome messages, and password-change notifications.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section id="section-3" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              3. Data Sharing & Third Parties
            </h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We share data only with trusted service providers who help us run the Platform:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Stripe:</strong> For secure invoice processing.</li>
              <li><strong>Email Providers (SMTP):</strong> For dispatching verification, receipts, and system alerts.</li>
              <li><strong>AI Providers:</strong> Anonymized text prompts may be processed by LLMs to generate course outline summaries and tutor feedback.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section id="section-4" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              4. Cookies & Analytics
            </h2>
            <p>
              SkillSphere uses cookies and local storage tokens to recognize your device, maintain active sessions, and remember your system preferences (such as Light/Dark theme).
            </p>
            <p>
              We use a Cookie Consent Banner to allow users to opt-in or opt-out of non-essential cookies. You can manage or disable cookies directly in your web browser settings.
            </p>
          </section>

          {/* Section 5 */}
          <section id="section-5" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              5. Data Security & Storage
            </h2>
            <p>
              We implement industry-standard technical and organizational security measures to protect your personal data from unauthorized access, disclosure, or modification.
            </p>
            <p>
              All traffic between your browser and our servers is encrypted using Secure Sockets Layer (SSL) / Transport Layer Security (TLS). Data is stored in secure cloud database environments with periodic backups.
            </p>
          </section>

          {/* Section 6 */}
          <section id="section-6" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              6. Your Rights & Choices
            </h2>
            <p>
              Depending on your location (e.g., European Economic Area under GDPR, or California under CCPA), you may hold specific privacy rights, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The right to access the personal information we hold about you.</li>
              <li>The right to request that we correct inaccurate data.</li>
              <li>The right to request the deletion of your account and personal history ("right to be forgotten").</li>
              <li>The right to object to or restrict processing of your data.</li>
            </ul>
            <p>
              To exercise any of these rights, please adjust your profile settings or email us directly at <a href="mailto:privacy@skillsphere.com" className="text-brand-600 dark:text-brand-400 hover:underline">privacy@skillsphere.com</a>.
            </p>
          </section>

          {/* Section 7 */}
          <section id="section-7" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              7. Children's Privacy
            </h2>
            <p>
              SkillSphere does not knowingly collect personal data from children under the age of 13. If we discover that a child under 13 has created an account on the Platform, we will delete their account and associated data immediately.
            </p>
          </section>

          {/* Section 8 */}
          <section id="section-8" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              8. Contact Us
            </h2>
            <p>
              If you have any questions or concerns regarding this Privacy Policy, please reach out to us at:
            </p>
            <div className="bg-slate-100 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/20 w-fit">
              <p className="font-semibold text-slate-900 dark:text-white">SkillSphere Security & Compliance Team</p>
              <p className="text-xs">100 Pine Street, San Francisco, CA 94111</p>
              <p className="text-xs mt-1 font-medium text-brand-600 dark:text-brand-400">
                Email: <a href="mailto:privacy@skillsphere.com" className="hover:underline">privacy@skillsphere.com</a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
