import React, { useState } from 'react';
import { FileText, Shield, Scale, Calendar, ChevronRight } from 'lucide-react';

export const TermsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('section-1');

  const sections = [
    { id: 'section-1', title: '1. Acceptance of Terms', icon: Scale },
    { id: 'section-2', title: '2. Description of Service', icon: FileText },
    { id: 'section-3', title: '3. Account Registration & Security', icon: Shield },
    { id: 'section-4', title: '4. AI Assistance & Content Usage', icon: FileText },
    { id: 'section-5', title: '5. Subscriptions, Payments & Refunds', icon: FileText },
    { id: 'section-6', title: '6. User Conduct & Prohibited Acts', icon: Shield },
    { id: 'section-7', title: '7. Limitation of Liability & Warranty', icon: Scale },
    { id: 'section-8', title: '8. Changes to Terms', icon: Calendar },
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
          Terms & Conditions
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">
          Please read these terms carefully before using the SkillSphere platform.
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
              Table of Contents
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
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using the SkillSphere application, website, and services (collectively, the "Platform"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to all of these Terms, do not register for an account or use our Platform.
            </p>
            <p>
              These Terms apply to all users, including students, instructors, administrators, and visitors. Additional policies, such as our Privacy Policy and Cookie Policy, are incorporated herein by reference.
            </p>
          </section>

          {/* Section 2 */}
          <section id="section-2" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              2. Description of Service
            </h2>
            <p>
              SkillSphere provides an AI-powered Learning Management System (LMS) that enables instructors to create, manage, and sell online courses, and enables students to purchase, access, and complete educational content.
            </p>
            <p>
              Our Platform includes AI-assisted learning tools, such as automated course summary generators, interactive coding tutors, assessment graders, and verifiable block-generated completion certificates. We reserve the right to modify, suspend, or discontinue any feature at any time without prior notice.
            </p>
          </section>

          {/* Section 3 */}
          <section id="section-3" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              3. Account Registration & Security
            </h2>
            <p>
              To access most features of the Platform, you must register for an account. You agree to provide accurate, current, and complete registration information and to update it promptly to maintain its accuracy.
            </p>
            <p>
              You are entirely responsible for maintaining the confidentiality of your account credentials and password. You agree to notify us immediately of any unauthorized use of your account. SkillSphere will not be liable for any loss incurred as a result of unauthorized account access.
            </p>
          </section>

          {/* Section 4 */}
          <section id="section-4" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              4. AI Assistance & Content Usage
            </h2>
            <p>
              Our Platform utilizes artificial intelligence models to assist in generating study questions, grading assignments, and providing feedback. While we strive to ensure the accuracy and helpfulness of our AI tools, all AI-generated content is provided "as is" and should be verified independently.
            </p>
            <p>
              Instructors retain copyright over the courses they upload. Students are granted a non-transferable, limited license to access purchased materials for personal, educational purposes only. Sharing, replicating, or redistributing Platform content without written authorization is strictly prohibited.
            </p>
          </section>

          {/* Section 5 */}
          <section id="section-5" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              5. Subscriptions, Payments & Refunds
            </h2>
            <p>
              Purchases of courses and subscriptions on SkillSphere are processed securely via third-party payment gateways (e.g., Stripe). All prices are displayed in USD unless otherwise specified.
            </p>
            <p>
              We offer a standard 14-day refund policy for course purchases, provided that less than 20% of the course content has been accessed. Refund requests must be submitted in writing through your account settings panel.
            </p>
          </section>

          {/* Section 6 */}
          <section id="section-6" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              6. User Conduct & Prohibited Acts
            </h2>
            <p>
              You agree not to engage in any of the following prohibited behaviors:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Using the Platform for any unlawful purpose or to solicit others to perform illegal acts.</li>
              <li>Uploading content that is harmful, offensive, defamatory, or infringes on third-party intellectual property.</li>
              <li>Attempting to bypass security barriers, scrape data, or reverse engineer any software on the Platform.</li>
              <li>Impersonating another user or misrepresenting your affiliation with any entity.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section id="section-7" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              7. Limitation of Liability & Warranty
            </h2>
            <p>
              The Platform is provided "as is" and "as available" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
            <p>
              In no event shall SkillSphere, its directors, employees, or partners be liable for any indirect, incidental, special, consequential, or punitive damages arising from your access to or use of the Platform.
            </p>
          </section>

          {/* Section 8 */}
          <section id="section-8" className="space-y-4 scroll-mt-24">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">
              8. Changes to Terms
            </h2>
            <p>
              We reserve the right to revise these Terms at our sole discretion. Any changes will be posted directly to this page with an updated "Last Updated" date. Continued use of the Platform after changes are posted constitutes acceptance of the new Terms.
            </p>
            <p>
              If you have any questions or feedback regarding these Terms, please contact us at <a href="mailto:legal@skillsphere.com" className="text-brand-600 dark:text-brand-400 hover:underline">legal@skillsphere.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
